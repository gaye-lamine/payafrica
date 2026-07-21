import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { WaveProvider, WaveProviderError } from "../../src/providers/wave.js";
import { PaymentError, PaymentStatus } from "../../src/types.js";
import { runProviderContractTests } from "../contract/provider.contract.js";

const WEBHOOK_SECRET = "wave-contract-webhook-secret";

function createProvider(): WaveProvider {
  return new WaveProvider({
    apiKey: "wave_sn_test_contract-key",
    webhookSecret: WEBHOOK_SECRET,
  });
}

function installWaveApiMock(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/checkout/sessions") && init?.method === "POST") {
        return Response.json({
          id: "wave-session-success",
          wave_launch_url: "https://pay.wave.test/checkout/wave-session-success",
        });
      }

      if (url.endsWith("/refund") && init?.method === "POST") {
        const requestBody = typeof init.body === "string" ? JSON.parse(init.body) : {};
        return Response.json({
          id: requestBody.amount === undefined ? "wave-refund-total" : "wave-refund-partial",
          amount: requestBody.amount ?? 1_000,
          status: "succeeded",
        });
      }

      if (url.includes("/checkout/sessions/")) {
        const sessionId = url.substring(url.lastIndexOf("/") + 1);
        if (sessionId === "wave-session-timeout") {
          return Response.json({ error_code: "service-unavailable" }, { status: 503 });
        }
        return Response.json({
          payment_status: sessionId === "wave-session-failed" ? "cancelled" : "succeeded",
        });
      }

      return Response.json({ error_code: "internal-server-error" }, { status: 404 });
    })
  );
}

function webhookSignature(rawBody: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// The shared suite is replayed for every provider; the concrete cases below
// supply Wave API fixtures and assert its contract mappings.
runProviderContractTests("Wave", createProvider);

describe("Wave provider contract", () => {
  it("paiement réussi", async () => {
    installWaveApiMock();
    const provider = createProvider();

    const session = await provider.initiatePayment({
      amount: 1_000,
      currency: "XOF",
      reference: "contract-success",
      successUrl: "https://merchant.example.test/success",
      failureUrl: "https://merchant.example.test/failure",
    });

    expect(session).toEqual({
      id: "wave-session-success",
      reference: "contract-success",
      amount: 1_000,
      currency: "XOF",
      status: PaymentStatus.Pending,
      paymentUrl: "https://pay.wave.test/checkout/wave-session-success",
    });
    await expect(provider.checkStatus(session.id)).resolves.toBe(PaymentStatus.Success);
  });

  it("paiement échoué", async () => {
    installWaveApiMock();

    await expect(createProvider().checkStatus("wave-session-failed")).resolves.toBe(PaymentStatus.Failed);
  });

  it("webhook valide", async () => {
    const provider = createProvider();
    const rawBody = JSON.stringify({
      id: "wave-event-1",
      type: "checkout.session.completed",
      data: {
        id: "wave-session-success",
        client_reference: "contract-success",
        payment_status: "succeeded",
        when_completed: "2026-07-21T12:00:00.000Z",
      },
    });

    await expect(
      provider.handleWebhook(rawBody, { "X-Wave-Signature": webhookSignature(rawBody) })
    ).resolves.toEqual({
      id: "wave-event-1",
      sessionId: "wave-session-success",
      reference: "contract-success",
      status: PaymentStatus.Success,
      occurredAt: "2026-07-21T12:00:00.000Z",
    });
  });

  it("signature de webhook invalide", async () => {
    await expect(
      createProvider().handleWebhook('{"id":"wave-event-1"}', { "x-wave-signature": "invalid" })
    ).rejects.toMatchObject({ code: PaymentError.Unknown });
  });

  it("remboursement partiel", async () => {
    installWaveApiMock();

    await expect(createProvider().refund("wave-session-success", 500)).resolves.toEqual({
      sessionId: "wave-session-success",
      refundId: "wave-refund-partial",
      amount: 500,
      status: PaymentStatus.Success,
    });
  });

  it("remboursement total", async () => {
    installWaveApiMock();

    await expect(createProvider().refund("wave-session-success")).resolves.toEqual({
      sessionId: "wave-session-success",
      refundId: "wave-refund-total",
      amount: 1_000,
      status: PaymentStatus.Success,
    });
  });

  it("timeout", async () => {
    installWaveApiMock();

    await expect(createProvider().checkStatus("wave-session-timeout")).rejects.toBeInstanceOf(
      WaveProviderError
    );
    await expect(createProvider().checkStatus("wave-session-timeout")).rejects.toMatchObject({
      code: PaymentError.ProviderTimeout,
    });
  });
});
