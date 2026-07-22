import type {
  PaymentEvent,
  PaymentProvider,
  PaymentRequest,
  PaymentSession,
  PaymentStatus,
  PaymentStatusResult,
  RefundResult,
} from "./types.js";

export class PayAfrica {
  public constructor(private readonly provider: PaymentProvider) {}

  public initiatePayment(params: PaymentRequest): Promise<PaymentSession> {
    return this.provider.initiatePayment(params);
  }

  public checkStatus(sessionId: string): Promise<PaymentStatusResult> {
    return this.provider.checkStatus(sessionId);
  }

  public handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentEvent> {
    return this.provider.handleWebhook(rawBody, headers);
  }

  public refund(sessionId: string, amount?: number): Promise<RefundResult> {
    return this.provider.refund(sessionId, amount);
  }
}
