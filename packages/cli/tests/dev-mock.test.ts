import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { OrangeMoneyProvider } from "../../core-node/src/providers/orange-money.js";
import { WaveProvider } from "../../core-node/src/providers/wave.js";
import { MtnMomoProvider } from "../../core-node/src/providers/mtn-momo.js";
import { PaymentStatus } from "../../core-node/src/types.js";
import { createDevServer } from "../src/commands/dev.js";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  })));
});

describe("payafrica dev provider API mocks", () => {
  it("runs the real Orange Money provider against the local mock", async () => {
    const baseUrl = await mockBase("orange");
    const provider = new OrangeMoneyProvider({ clientId: "mock", clientSecret: "mock", merchantCode: "mock", sitename: "mock", callbackUrl: "http://localhost/callback", webhookApiKey: "mock", environment: "sandbox", baseUrl });
    const session = await provider.initiatePayment({ amount: 1200, currency: "XOF", reference: "orange-order" });
    expect((await provider.checkStatus(session.id)).status).toBe(PaymentStatus.Pending);
    await expect(provider.refund(session.id, 100)).rejects.toThrow("does not support");
  });
  it("runs the real Wave provider against the local mock", async () => {
    const provider = new WaveProvider({ apiKey: "mock", webhookSecret: "mock", baseUrl: await mockBase("wave") });
    const session = await provider.initiatePayment({ amount: 1200, currency: "XOF", reference: "wave-order" });
    expect(session.paymentUrl).toBe(`${awaitableBaseUrl(session.id)}`);
    expect((await provider.checkStatus(session.id)).status).toBe(PaymentStatus.Pending);
    expect((await provider.refund(session.id, 100)).amount).toBe(100);
  });
  it("runs the real MTN MoMo provider against the local mock", async () => {
    const provider = new MtnMomoProvider({ subscriptionKey: "mock", apiUser: "00000000-0000-4000-8000-000000000001", apiKey: "mock", targetEnvironment: "sandbox", defaultCurrency: "XOF", baseUrl: await mockBase("mtn") });
    const session = await provider.initiatePayment({ amount: 1200, currency: "XOF", reference: "mtn-order", customerPhone: "221770000000" });
    expect((await provider.checkStatus(session.id)).status).toBe(PaymentStatus.Pending);
    expect((await provider.refund(session.id, 100)).amount).toBe(100);
  });
});

function awaitableBaseUrl(sessionId: string): string {
  const server = servers[servers.length - 1];
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected server address");
  return `http://127.0.0.1:${address.port}/mock/wave/checkout/${sessionId}`;
}

async function mockBase(provider: "orange" | "wave" | "mtn"): Promise<string> { const server = createDevServer("http://127.0.0.1:65534/webhook"); servers.push(server); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (address === null || typeof address === "string") throw new Error("Expected server address"); return `http://127.0.0.1:${address.port}/mock/${provider}`; }
