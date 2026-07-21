import { afterEach, describe, expect, it, vi } from "vitest";

import { MtnMomoProvider, MtnMomoProviderError } from "../../src/providers/mtn-momo.js";
import { PaymentError, PaymentStatus } from "../../src/types.js";
import { runProviderContractTests } from "../contract/provider.contract.js";

const SUBSCRIPTION_KEY = "mtn-contract-subscription-key";

function createProvider(): MtnMomoProvider {
  return new MtnMomoProvider({
    subscriptionKey: SUBSCRIPTION_KEY,
    apiUser: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    apiKey: "mtn-contract-api-key",
    targetEnvironment: "sandbox",
    defaultCurrency: "XOF",
  });
}

function installMtnApiMock(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/collection/token/")) {
        return Response.json({ access_token: "mtn-contract-token", expires_in: 3_600 });
      }

      if (url.endsWith("/collection/v1_0/requesttopay") && init?.method === "POST") {
        return new Response(null, { status: 202 });
      }

      if (url.endsWith("/collection/v1_0/refund") && init?.method === "POST") {
        return new Response(null, { status: 202 });
      }

      if (url.includes("/collection/v1_0/requesttopay/")) {
        const sessionId = url.substring(url.lastIndexOf("/") + 1);
        if (sessionId === "mtn-session-timeout") {
          return Response.json({ code: "SERVICE_UNAVAILABLE" }, { status: 503 });
        }
        return Response.json({
          amount: "1000",
          status: sessionId === "mtn-session-failed" ? "FAILED" : "SUCCESSFUL",
        });
      }

      return Response.json({ code: "UNKNOWN" }, { status: 404 });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// The shared suite is replayed for every provider; concrete MTN fixtures and
// assertions below cover its asynchronous Collection API behavior.
runProviderContractTests("MTN MoMo", createProvider);

describe("MTN MoMo provider contract", () => {
  it("paiement réussi", async () => {
    installMtnApiMock();
    const provider = createProvider();

    const session = await provider.initiatePayment({
      amount: 1_000,
      currency: "XOF",
      reference: "contract-success",
      customerPhone: "+221770000000",
    });

    expect(session).toMatchObject({
      reference: "contract-success",
      amount: 1_000,
      currency: "XOF",
      status: PaymentStatus.Pending,
    });
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(provider.checkStatus(session.id)).resolves.toBe(PaymentStatus.Success);
  });

  it("paiement échoué", async () => {
    installMtnApiMock();

    await expect(createProvider().checkStatus("mtn-session-failed")).resolves.toBe(PaymentStatus.Failed);
  });

  it("webhook valide", async () => {
    const rawBody = JSON.stringify({
      referenceId: "mtn-session-success",
      externalId: "contract-success",
      status: "SUCCESSFUL",
      timestamp: "2026-07-21T12:00:00.000Z",
    });

    await expect(
      createProvider().handleWebhook(rawBody, {
        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
      })
    ).resolves.toEqual({
      id: "mtn-session-success",
      sessionId: "mtn-session-success",
      reference: "contract-success",
      status: PaymentStatus.Success,
      occurredAt: "2026-07-21T12:00:00.000Z",
    });
  });

  it("signature de webhook invalide", async () => {
    await expect(
      createProvider().handleWebhook('{"status":"SUCCESSFUL"}', {
        "ocp-apim-subscription-key": "invalid-key",
      })
    ).rejects.toMatchObject({ code: PaymentError.Unknown });
  });

  it("remboursement partiel", async () => {
    installMtnApiMock();

    await expect(createProvider().refund("mtn-session-success", 500)).resolves.toMatchObject({
      sessionId: "mtn-session-success",
      amount: 500,
      status: PaymentStatus.Pending,
    });
  });

  it("remboursement total", async () => {
    installMtnApiMock();

    await expect(createProvider().refund("mtn-session-success")).resolves.toMatchObject({
      sessionId: "mtn-session-success",
      amount: 1_000,
      status: PaymentStatus.Pending,
    });
  });

  it("timeout", async () => {
    installMtnApiMock();

    await expect(createProvider().checkStatus("mtn-session-timeout")).rejects.toBeInstanceOf(
      MtnMomoProviderError
    );
    await expect(createProvider().checkStatus("mtn-session-timeout")).rejects.toMatchObject({
      code: PaymentError.ProviderTimeout,
    });
  });
});
