/**
 * Ce provider simule localement les réponses de paiement et de webhook. Il ne
 * contacte ni Wave, ni Orange Money, ni MTN MoMo. En production, remplacez-le
 * par le provider réel configuré avec vos propres identifiants.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import {
  PaymentError,
  PaymentStatus,
  validateRefundAmount,
  type PaymentEvent,
  type PaymentProvider,
  type PaymentRequest,
  type PaymentSession,
  type PaymentStatusResult,
  type RefundResult,
} from "@payafrica/core-node";

export interface FakePaymentProviderConfig {
  webhookSecret: string;
  successDelayMs?: number;
}

interface FakePaymentRecord {
  session: PaymentSession;
  createdAt: number;
}

interface FakeWebhookPayload {
  id?: unknown;
  sessionId?: unknown;
  status?: unknown;
  reference?: unknown;
  occurredAt?: unknown;
}

export class FakePaymentProviderError extends Error {
  public constructor(public readonly code: PaymentError, message: string) {
    super(message);
    this.name = "FakePaymentProviderError";
  }
}

export class FakePaymentProvider implements PaymentProvider {
  private readonly payments = new Map<string, FakePaymentRecord>();
  private readonly successDelayMs: number;

  public constructor(private readonly config: FakePaymentProviderConfig) {
    this.successDelayMs = config.successDelayMs ?? 0;
  }

  public async initiatePayment(params: PaymentRequest): Promise<PaymentSession> {
    const id = `fake_${randomUUID()}`;
    const session: PaymentSession = {
      id,
      reference: params.reference,
      amount: params.amount,
      currency: params.currency,
      status: PaymentStatus.Pending,
      paymentUrl: `https://payafrica.local/fake-checkout/${id}`,
    };
    this.payments.set(id, { session, createdAt: Date.now() });
    return session;
  }

  public async checkStatus(sessionId: string): Promise<PaymentStatusResult> {
    const payment = this.getPayment(sessionId);
    const elapsedMs = Date.now() - payment.createdAt;
    return {
      status: elapsedMs >= this.successDelayMs ? PaymentStatus.Success : PaymentStatus.Pending,
    };
  }

  public async handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentEvent> {
    const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    this.assertValidSignature(body, headers);

    const payload = this.parseWebhook(body);
    const id = this.requireString(payload.id, "id");
    const sessionId = this.requireString(payload.sessionId, "sessionId");
    const status = this.parseStatus(payload.status);
    const occurredAt = typeof payload.occurredAt === "string" ? payload.occurredAt : new Date().toISOString();

    return {
      id,
      sessionId,
      status,
      ...(typeof payload.reference === "string" ? { reference: payload.reference } : {}),
      occurredAt,
    };
  }

  public async refund(sessionId: string, amount?: number): Promise<RefundResult> {
    if (amount !== undefined) {
      validateRefundAmount(amount, (code, message) => new FakePaymentProviderError(code, message));
    }

    const payment = this.getPayment(sessionId);
    if (amount !== undefined && amount > payment.session.amount) {
      throw new FakePaymentProviderError(
        PaymentError.RefundAmountExceedsBalance,
        "Refund amount exceeds the original payment amount"
      );
    }

    return {
      sessionId,
      refundId: `fake_refund_${randomUUID()}`,
      amount: amount ?? payment.session.amount,
      status: PaymentStatus.Success,
    };
  }

  private getPayment(sessionId: string): FakePaymentRecord {
    const payment = this.payments.get(sessionId);
    if (payment === undefined) {
      throw new FakePaymentProviderError(PaymentError.Unknown, "Unknown fake payment session");
    }
    return payment;
  }

  private assertValidSignature(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): void {
    const candidate = headers["x-payafrica-signature"] ?? headers["X-PayAfrica-Signature"];
    const signature = Array.isArray(candidate) ? candidate[0] : candidate;
    const expected = createHmac("sha256", this.config.webhookSecret).update(rawBody).digest("hex");
    if (signature === undefined || !this.signaturesMatch(expected, signature)) {
      throw new FakePaymentProviderError(PaymentError.Unknown, "Invalid PayAfrica webhook signature");
    }
  }

  private signaturesMatch(expected: string, received: string): boolean {
    const expectedBuffer = Buffer.from(expected, "utf8");
    const receivedBuffer = Buffer.from(received, "utf8");
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private parseWebhook(rawBody: string): FakeWebhookPayload {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Webhook body must be a JSON object");
      }
      return parsed as FakeWebhookPayload;
    } catch (error) {
      if (error instanceof FakePaymentProviderError) throw error;
      throw new FakePaymentProviderError(PaymentError.Unknown, "Invalid fake webhook JSON");
    }
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.length === 0) {
      throw new FakePaymentProviderError(PaymentError.Unknown, `Webhook payload is missing ${field}`);
    }
    return value;
  }

  private parseStatus(value: unknown): PaymentStatus {
    if (value === PaymentStatus.Pending || value === PaymentStatus.Success || value === PaymentStatus.Failed || value === PaymentStatus.Expired) {
      return value;
    }
    throw new FakePaymentProviderError(PaymentError.Unknown, "Webhook payload has an invalid status");
  }
}
