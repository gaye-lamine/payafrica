import { createHmac, timingSafeEqual } from "node:crypto";

import {
  PaymentError,
  PaymentStatus,
  type PaymentEvent,
  type PaymentProvider,
  type PaymentRequest,
  type PaymentSession,
  type RefundResult,
} from "../types.js";

const WAVE_API_BASE_URL = "https://api.wave.com/v1";

export interface WaveProviderConfig {
  apiKey: string;
  webhookSecret: string;
}

interface WaveCheckoutSession {
  id?: string;
  amount?: string | number;
  currency?: string;
  client_reference?: string | null;
  wave_launch_url?: string;
  payment_status?: string;
}

interface WaveRefundResponse {
  id?: string;
  amount?: string | number;
  status?: string;
}

interface WaveErrorResponse {
  error_code?: string;
  error_message?: string;
  message?: string;
}

interface WaveWebhookPayload {
  id?: string;
  type?: string;
  data?: WaveCheckoutSession & { when_completed?: string; when_created?: string };
}

/** Error intentionally reduced to the common PaymentError code. */
export class WaveProviderError extends Error {
  public constructor(public readonly code: PaymentError, message: string) {
    super(message);
    this.name = "WaveProviderError";
  }
}

export class WaveProvider implements PaymentProvider {
  public constructor(private readonly config: WaveProviderConfig) {}

  public async initiatePayment(params: PaymentRequest): Promise<PaymentSession> {
    const response = await this.request("/checkout/sessions", {
      method: "POST",
      body: JSON.stringify({
        amount: params.amount,
        currency: "XOF",
        ...(params.failureUrl === undefined ? {} : { error_url: params.failureUrl }),
        ...(params.successUrl === undefined ? {} : { success_url: params.successUrl }),
        client_reference: params.reference,
      }),
    });
    const session = await this.readJson<WaveCheckoutSession>(response);

    if (typeof session.id !== "string" || session.id.length === 0) {
      throw new WaveProviderError(PaymentError.Unknown, "Wave checkout response is missing id");
    }

    return {
      id: session.id,
      reference: params.reference,
      amount: params.amount,
      currency: params.currency,
      status: PaymentStatus.Pending,
      ...(session.wave_launch_url === undefined ? {} : { paymentUrl: session.wave_launch_url }),
    };
  }

  public async checkStatus(sessionId: string): Promise<PaymentStatus> {
    const response = await this.request(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const session = await this.readJson<WaveCheckoutSession>(response);

    if (typeof session.payment_status !== "string") {
      throw new WaveProviderError(PaymentError.Unknown, "Wave checkout response is missing payment_status");
    }
    return this.toPaymentStatus(session.payment_status);
  }

  public async handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentEvent> {
    const signature = this.findHeader(headers, "x-wave-signature");
    const rawBytes = typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody;

    if (signature === undefined || !this.isValidSignature(rawBytes, signature)) {
      throw new WaveProviderError(PaymentError.Unknown, "Invalid Wave webhook signature");
    }

    const payload = this.parseWebhookPayload(rawBytes.toString("utf8"));
    const data = payload.data;
    const sessionId = data?.id;
    if (sessionId === undefined || sessionId.length === 0) {
      throw new WaveProviderError(PaymentError.Unknown, "Wave webhook is missing checkout session id");
    }

    return {
      id: payload.id ?? sessionId,
      sessionId,
      status: this.toWebhookStatus(payload.type, data?.payment_status),
      ...(data?.client_reference === null || data?.client_reference === undefined
        ? {}
        : { reference: data.client_reference }),
      occurredAt: data?.when_completed ?? data?.when_created ?? new Date().toISOString(),
    };
  }

  public async refund(sessionId: string, amount?: number): Promise<RefundResult> {
    const response = await this.request(`/checkout/sessions/${encodeURIComponent(sessionId)}/refund`, {
      method: "POST",
      ...(amount === undefined ? {} : { body: JSON.stringify({ amount }) }),
    });
    const refund = await this.readJson<WaveRefundResponse>(response);

    if (typeof refund.id !== "string" || typeof refund.amount !== "number") {
      throw new WaveProviderError(PaymentError.Unknown, "Wave refund response is incomplete");
    }

    return {
      sessionId,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status === undefined ? PaymentStatus.Success : this.toPaymentStatus(refund.status),
    };
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${WAVE_API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
    } catch (error: unknown) {
      throw this.toProviderError(error);
    }

    if (!response.ok) {
      throw await this.toResponseError(response);
    }
    return response;
  }

  private async toResponseError(response: Response): Promise<WaveProviderError> {
    const body = await this.readJsonOrEmpty<WaveErrorResponse>(response);
    const message = body.error_message ?? body.message ?? `Wave request failed with HTTP ${response.status}`;
    return new WaveProviderError(this.mapError(response.status, body.error_code), message);
  }

  private toProviderError(error: unknown): WaveProviderError {
    if (error instanceof WaveProviderError) {
      return error;
    }
    return new WaveProviderError(
      PaymentError.ProviderTimeout,
      error instanceof Error ? error.message : "Wave request failed"
    );
  }

  private mapError(httpStatus: number, waveCode: string | undefined): PaymentError {
    if (waveCode === "insufficient-funds") {
      return PaymentError.InsufficientFunds;
    }
    if (waveCode === "payer-mobile-mismatch" || waveCode === "invalid-phone") {
      return PaymentError.InvalidPhone;
    }
    if (waveCode === "payment-cancelled" || waveCode === "user-cancelled") {
      return PaymentError.UserCancelled;
    }
    if (httpStatus === 408 || httpStatus === 429 || httpStatus >= 500) {
      return PaymentError.ProviderTimeout;
    }
    return PaymentError.Unknown;
  }

  private toPaymentStatus(status: string): PaymentStatus {
    switch (status.toLowerCase()) {
      case "succeeded":
      case "success":
        return PaymentStatus.Success;
      case "processing":
      case "pending":
        return PaymentStatus.Pending;
      case "cancelled":
      case "failed":
        return PaymentStatus.Failed;
      default:
        throw new WaveProviderError(PaymentError.Unknown, "Unknown Wave payment status");
    }
  }

  private toWebhookStatus(type: string | undefined, paymentStatus: string | undefined): PaymentStatus {
    if (type === "checkout.session.completed") {
      return PaymentStatus.Success;
    }
    if (type === "checkout.session.payment_failed") {
      return PaymentStatus.Failed;
    }
    if (paymentStatus === undefined) {
      throw new WaveProviderError(PaymentError.Unknown, "Wave webhook has an unknown event type");
    }
    return this.toPaymentStatus(paymentStatus);
  }

  private findHeader(
    headers: Record<string, string | string[] | undefined>,
    expectedName: string
  ): string | undefined {
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() !== expectedName) {
        continue;
      }
      if (typeof value === "string") {
        return value;
      }
      if (Array.isArray(value) && value.length === 1) {
        return value[0];
      }
    }
    return undefined;
  }

  private isValidSignature(rawBody: Buffer, headerValue: string): boolean {
    const expectedSignature = createHmac("sha256", this.config.webhookSecret).update(rawBody).digest("hex");
    const candidates = headerValue.split(",").map((part) => part.trim().replace(/^v1=/, ""));

    return candidates.some((candidate) => {
      const expected = Buffer.from(expectedSignature);
      const received = Buffer.from(candidate);
      return expected.length === received.length && timingSafeEqual(expected, received);
    });
  }

  private parseWebhookPayload(serializedBody: string): WaveWebhookPayload {
    try {
      const payload: unknown = JSON.parse(serializedBody);
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        throw new Error("Webhook payload must be an object");
      }
      return payload as WaveWebhookPayload;
    } catch {
      throw new WaveProviderError(PaymentError.Unknown, "Invalid Wave webhook payload");
    }
  }

  private async readJson<T>(response: Response): Promise<T> {
    const body: unknown = await response.json();
    return body as T;
  }

  private async readJsonOrEmpty<T>(response: Response): Promise<T> {
    try {
      return await this.readJson<T>(response);
    } catch {
      return {} as T;
    }
  }
}
