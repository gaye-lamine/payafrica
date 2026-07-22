import type {
  PaymentEvent,
  PaymentProvider,
  PaymentRequest,
  PaymentSession,
  PaymentStatusResult,
  RefundResult,
} from "../types.js";

export class TemplateProvider implements PaymentProvider {
  public async initiatePayment(_params: PaymentRequest): Promise<PaymentSession> {
    // TODO: Create a provider payment request and normalize the returned session.
    throw new Error("Not implemented");
  }

  public async checkStatus(_sessionId: string): Promise<PaymentStatusResult> {
    // TODO: Fetch the provider transaction and normalize its status.
    throw new Error("Not implemented");
  }

  public async handleWebhook(
    _rawBody: string | Buffer,
    _headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentEvent> {
    // TODO: Validate the provider signature against the raw body before parsing it.
    throw new Error("Not implemented");
  }

  public async refund(_sessionId: string, _amount?: number): Promise<RefundResult> {
    // TODO: Request a full or partial provider refund and normalize its result.
    throw new Error("Not implemented");
  }
}
