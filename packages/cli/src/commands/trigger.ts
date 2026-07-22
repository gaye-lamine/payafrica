import { createHmac, randomUUID } from "node:crypto";

type Provider = "wave" | "orange" | "mtn";
type Outcome = "success" | "failed";

interface PaymentEvent {
  id: string;
  sessionId: string;
  status: "success" | "failed";
  reference: string;
  occurredAt: string;
  error?: "UNKNOWN";
}

export interface TriggerCommandOptions {
  target: string;
  secret: string;
}

export async function triggerCommand(event: string, options: TriggerCommandOptions): Promise<void> {
  const parsedEvent = parseEvent(event);
  const target = validateTarget(options.target);
  const payload = createPaymentEvent(parsedEvent.provider, parsedEvent.outcome);
  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", options.secret).update(rawBody).digest("hex");
  const startedAt = performance.now();

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payafrica-signature": `sha256=${signature}`,
      },
      body: rawBody,
    });
    const elapsedMs = Math.round(performance.now() - startedAt);
    const status = `${response.status} ${response.statusText}`.trim();
    console.log(`[${status}] ${event} envoyé à ${target.toString()} en ${elapsedMs} ms`);
    if (!response.ok) process.exitCode = 1;
  } catch (error: unknown) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    console.error(`[ERROR] ${event} non envoyé à ${target.toString()} après ${elapsedMs} ms: ${message}`);
    process.exitCode = 1;
  }
}

function parseEvent(value: string): { provider: Provider; outcome: Outcome } {
  const match = value.match(/^(wave|orange|mtn)\.payment\.(success|failed)$/u);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error("Unsupported event. Use wave.payment.success, orange.payment.failed, or mtn.payment.success.");
  }
  return { provider: match[1] as Provider, outcome: match[2] as Outcome };
}

function createPaymentEvent(provider: Provider, outcome: Outcome): PaymentEvent {
  const sessionId = randomUUID();
  return {
    id: randomUUID(),
    sessionId,
    status: outcome === "success" ? "success" : "failed",
    reference: `trigger-${provider}-${sessionId}`,
    occurredAt: new Date().toISOString(),
    ...(outcome === "failed" ? { error: "UNKNOWN" as const } : {}),
  };
}

function validateTarget(value: string): URL {
  const target = new URL(value);
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("--target must use http or https.");
  }
  return target;
}
