import { createHmac } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { PaymentError, PaymentStatus } from "@waslpay/core-node";

import { DEMO_WEBHOOK_SECRET, createApp } from "../src/server.js";

describe("Node Express fake-provider flow", () => {
  let app: ReturnType<typeof createApp>;
  let session: { id: string; status: PaymentStatus; paymentUrl: string };

  beforeEach(async () => {
    app = createApp({ successDelayMs: 0 });
    const checkout = await request(app)
      .post("/checkout")
      .send({ amount: 1_000, currency: "XOF", reference: "demo-order-1" })
      .expect(201);
    session = checkout.body as { id: string; status: PaymentStatus; paymentUrl: string };
  });

  function createWebhookPayload(): string {
    return JSON.stringify({
      id: "demo-event-1",
      sessionId: session.id,
      reference: "demo-order-1",
      status: PaymentStatus.Success,
      occurredAt: "2026-07-23T00:00:00.000Z",
    });
  }

  it("creates a pending payment session", () => {
    expect(session.id).toMatch(/^fake_/);
    expect(session.status).toBe(PaymentStatus.Pending);
    expect(session.paymentUrl).toContain(session.id);
  });

  it("returns success when checking a completed fake payment", async () => {
    await request(app)
      .get(`/checkout/${session.id}/status`)
      .expect(200)
      .expect({ status: PaymentStatus.Success });
  });

  it("accepts a valid HMAC-signed webhook", async () => {
    const webhookPayload = createWebhookPayload();
    const signature = createHmac("sha256", DEMO_WEBHOOK_SECRET).update(webhookPayload).digest("hex");
    const webhook = await request(app)
      .post("/webhooks/waslpay")
      .set("content-type", "application/json")
      .set("x-waslpay-signature", signature)
      .send(webhookPayload)
      .expect(200);
    expect(webhook.body).toMatchObject({
      accepted: true,
      event: { id: "demo-event-1", sessionId: session.id, status: PaymentStatus.Success },
    });
  });

  it("rejects a webhook with an invalid HMAC signature", async () => {
    const webhookPayload = createWebhookPayload();
    await request(app)
      .post("/webhooks/waslpay")
      .set("content-type", "application/json")
      .set("x-waslpay-signature", "not-a-valid-signature")
      .send(webhookPayload)
      .expect(400)
      .expect({ error: PaymentError.Unknown, message: "Invalid WaslPay webhook signature" });
  });

  it("rejects a refund with a negative amount", async () => {
    await request(app)
      .post(`/refund/${session.id}`)
      .send({ amount: -1 })
      .expect(400)
      .expect({
        error: PaymentError.InvalidRefundAmount,
        message: "Refund amount must be a positive safe integer in minor currency units",
      });
  });

  it("accepts a valid partial refund", async () => {
    const refund = await request(app)
      .post(`/refund/${session.id}`)
      .send({ amount: 500 })
      .expect(200);
    expect(refund.body).toMatchObject({
      sessionId: session.id,
      amount: 500,
      status: PaymentStatus.Success,
    });
    expect(refund.body.refundId).toMatch(/^fake_refund_/);
  });
});
