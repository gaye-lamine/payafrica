import express, { type Express, type Request, type Response } from "express";

import { PayAfrica } from "@payafrica/core-node";

import { FakePaymentProvider, FakePaymentProviderError } from "./fake-provider.js";

export const DEMO_WEBHOOK_SECRET = "whsec_demo_local_only";

interface CreateAppOptions {
  webhookSecret?: string;
  successDelayMs?: number;
}

interface CheckoutBody {
  amount?: unknown;
  currency?: unknown;
  reference?: unknown;
  customerPhone?: unknown;
}

interface RefundBody {
  amount?: unknown;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const provider = new FakePaymentProvider({
    webhookSecret: options.webhookSecret ?? DEMO_WEBHOOK_SECRET,
    ...(options.successDelayMs === undefined ? {} : { successDelayMs: options.successDelayMs }),
  });
  const payAfrica = new PayAfrica(provider);
  const app = express();

  app.post("/webhooks/payafrica", express.raw({ type: "application/json" }), async (request, response) => {
    try {
      const event = await payAfrica.handleWebhook(
        request.body as Buffer,
        request.headers as Record<string, string | string[] | undefined>
      );
      response.status(200).json({ accepted: true, event });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.use(express.json());

  app.post("/checkout", async (request: Request<unknown, unknown, CheckoutBody>, response) => {
    try {
      const body = request.body;
      if (typeof body.amount !== "number" || !Number.isSafeInteger(body.amount) || body.amount <= 0) {
        response.status(400).json({ error: "amount must be a positive safe integer in minor currency units" });
        return;
      }
      if (typeof body.currency !== "string" || typeof body.reference !== "string") {
        response.status(400).json({ error: "currency and reference are required strings" });
        return;
      }
      const session = await payAfrica.initiatePayment({
        amount: body.amount,
        currency: body.currency,
        reference: body.reference,
        ...(typeof body.customerPhone === "string" ? { customerPhone: body.customerPhone } : {}),
      });
      response.status(201).json(session);
    } catch (error) {
      sendError(response, error);
    }
  });

  app.get("/checkout/:id/status", async (request, response) => {
    try {
      response.status(200).json(await payAfrica.checkStatus(request.params.id));
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/refund/:id", async (request: Request<{ id: string }, unknown, RefundBody>, response) => {
    try {
      const amount = request.body.amount;
      const refund = await payAfrica.refund(request.params.id, amount as number | undefined);
      response.status(200).json(refund);
    } catch (error) {
      sendError(response, error);
    }
  });

  return app;
}

function sendError(response: Response, error: unknown): void {
  if (error instanceof FakePaymentProviderError) {
    response.status(400).json({ error: error.code, message: error.message });
    return;
  }
  response.status(500).json({ error: "UNKNOWN", message: "Unexpected demo server error" });
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/")}`) {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  createApp().listen(port, () => {
    console.log(`PayAfrica fake-provider demo listening on http://localhost:${port}`);
    console.log(`Webhook HMAC secret: ${DEMO_WEBHOOK_SECRET}`);
  });
}
