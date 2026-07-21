export interface PaymentProvider {
  initiatePayment(params: PaymentRequest): Promise<PaymentSession>;
  checkStatus(sessionId: string): Promise<PaymentStatus>;
  handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentEvent>;
  refund(sessionId: string, amount?: number): Promise<RefundResult>;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  customerPhone?: string;
  successUrl?: string;
  failureUrl?: string;
  metadata?: Readonly<Record<string, string>>;
}

export interface PaymentSession {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentUrl?: string;
  expiresAt?: string;
}

export enum PaymentStatus {
  Pending = "pending",
  Success = "success",
  Failed = "failed",
  Expired = "expired",
}

export interface PaymentEvent {
  id: string;
  sessionId: string;
  status: PaymentStatus;
  reference?: string;
  occurredAt: string;
  error?: PaymentError;
}

export interface RefundResult {
  sessionId: string;
  refundId: string;
  amount: number;
  status: PaymentStatus;
}

export enum PaymentError {
  InsufficientFunds = "INSUFFICIENT_FUNDS",
  ProviderTimeout = "PROVIDER_TIMEOUT",
  InvalidPhone = "INVALID_PHONE",
  UserCancelled = "USER_CANCELLED",
  Unknown = "UNKNOWN",
}
