import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OrangeMoneyProvider,
  OrangeMoneyProviderError,
} from "../../src/providers/orange-money.js";
import { PaymentError, PaymentStatus } from "../../src/types.js";
import { runProviderContractTests } from "../contract/provider.contract.js";

const WEBHOOK_API_KEY = "orange-contract-webhook-key";

function createProvider(): OrangeMoneyProvider {
  return new OrangeMoneyProvider({
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    merchantCode: "test-merchant",
    sitename: "PayAfrica contract tests",
    environment: "sandbox",
    callbackUrl: "https://merchant.example.test/orange/callback",
    webhookApiKey: WEBHOOK_API_KEY,
  });
}

function installOrangeApiMock(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/oauth/v1/token")) {
        expect(init?.method).toBe("POST");
        return Response.json({ access_token: "test-access-token", expires_in: 3_600 });
      }

      if (url.endsWith("/v1/onlinePayment/prepare")) {
        return Response.json({ paymentUrl: "https://payment.orange.test/pay/contract-success" });
      }

      if (url.includes("/api/eWallet/v1/transactions?")) {
        const parsedUrl = new URL(url);
        const reference = parsedUrl.searchParams.get("reference");

        if (reference === "contract-timeout") {
          return Response.json({ code: 500, message: "Provider unavailable" }, { status: 504 });
        }

        return Response.json({
          transactions: [{ status: reference === "contract-failed" ? "FAILED" : "SUCCESS" }],
        });
      }

      return Response.json({ code: 9999, message: "Unexpected URL" }, { status: 404 });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// The shared suite remains replayed by every provider. The concrete checks below
// supply the Orange Sonatel HTTP fixtures that the provider-specific API needs.
runProviderContractTests("Orange Money", createProvider);

describe("Orange Money provider contract", () => {
  it("paiement réussi", async () => {
    installOrangeApiMock();
    const provider = createProvider();

    const session = await provider.initiatePayment({
      amount: 1_000,
      currency: "XOF",
      reference: "contract-success",
      successUrl: "https://merchant.example.test/success",
      failureUrl: "https://merchant.example.test/failure",
    });

    expect(session).toMatchObject({
      id: "contract-success",
      reference: "contract-success",
      amount: 1_000,
      currency: "XOF",
      status: PaymentStatus.Pending,
    });
    await expect(provider.checkStatus(session.id)).resolves.toBe(PaymentStatus.Success);
  });

  it("paiement échoué", async () => {
    installOrangeApiMock();

    await expect(createProvider().checkStatus("contract-failed")).resolves.toBe(PaymentStatus.Failed);
  });

  it("webhook valide", async () => {
    const provider = createProvider();
    const rawBody = JSON.stringify({
      transactionId: "orange-transaction-1",
      reference: "contract-success",
      status: "SUCCESS",
      timestamp: "2026-07-21T12:00:00.000Z",
    });

    await expect(provider.handleWebhook(rawBody, { "X-Api-Key": WEBHOOK_API_KEY })).resolves.toEqual({
      id: "orange-transaction-1",
      sessionId: "contract-success",
      reference: "contract-success",
      status: PaymentStatus.Success,
      occurredAt: "2026-07-21T12:00:00.000Z",
    });
  });

  it("signature de webhook invalide", async () => {
    await expect(
      createProvider().handleWebhook('{"reference":"contract-success","status":"SUCCESS"}', {
        "x-api-key": "invalid-key",
      })
    ).rejects.toMatchObject({ code: PaymentError.Unknown });
  });

  it("remboursement partiel", async () => {
    await expect(createProvider().refund("contract-success", 500)).rejects.toMatchObject({
      code: PaymentError.Unknown,
    });
  });

  it("remboursement total", async () => {
    await expect(createProvider().refund("contract-success")).rejects.toMatchObject({
      code: PaymentError.Unknown,
    });
  });

  it("timeout", async () => {
    installOrangeApiMock();

    await expect(createProvider().checkStatus("contract-timeout")).rejects.toBeInstanceOf(
      OrangeMoneyProviderError
    );
    await expect(createProvider().checkStatus("contract-timeout")).rejects.toMatchObject({
      code: PaymentError.ProviderTimeout,
    });
  });
});
