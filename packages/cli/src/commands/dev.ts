import { createHmac, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

const DEV_WEBHOOK_SECRET = "whsec_dev_12345";
const MAX_REQUEST_SIZE = 1_048_576;

type Simulation = "success" | "insufficient_funds" | "cancelled";

interface CheckoutSession {
  id: string;
  reference?: string;
}

interface CheckoutRequest {
  client_reference?: unknown;
  reference?: unknown;
}

interface PaymentEvent {
  id: string;
  sessionId: string;
  status: "success" | "failed";
  reference?: string;
  occurredAt: string;
  error?: "INSUFFICIENT_FUNDS" | "USER_CANCELLED";
}

export interface DevCommandOptions {
  port: number;
  target: string;
}

export function parsePort(value: string): number {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("--port must be an integer between 0 and 65535.");
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("--port must be an integer between 0 and 65535.");
  }
  return port;
}

export async function devCommand(options: DevCommandOptions): Promise<void> {
  const server = createDevServer(options.target);

  await listen(server, options.port);
  const port = getListeningPort(server);
  console.log(`PayAfrica dev server listening on http://localhost:${port}`);
  console.log(`Webhook target: ${new URL(options.target).toString()}`);
  console.log(`Webhook HMAC secret: ${DEV_WEBHOOK_SECRET}`);
}

export function createDevServer(target: string): Server {
  const webhookTarget = validateTarget(target);
  const sessions = new Map<string, CheckoutSession>();

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      if (request.method === "POST" && url.pathname === "/v1/checkout/sessions") {
        await createCheckoutSession(request, response, sessions);
        return;
      }

      const checkoutMatch = url.pathname.match(/^\/checkout\/([^/]+)$/);
      if (request.method === "GET" && checkoutMatch?.[1] !== undefined) {
        renderCheckout(response, sessions.get(checkoutMatch[1]));
        return;
      }

      const simulationMatch = url.pathname.match(/^\/checkout\/([^/]+)\/simulate$/);
      if (request.method === "POST" && simulationMatch?.[1] !== undefined) {
        await simulateCheckout(request, response, sessions.get(simulationMatch[1]), webhookTarget);
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected server error";
      sendJson(response, 400, { error: message });
    }
  });
}

async function createCheckoutSession(
  request: IncomingMessage,
  response: ServerResponse,
  sessions: Map<string, CheckoutSession>,
): Promise<void> {
  const payload = await readJson<CheckoutRequest>(request);
  const id = randomUUID();
  const reference = readOptionalString(payload.client_reference) ?? readOptionalString(payload.reference);
  sessions.set(id, { id, ...(reference === undefined ? {} : { reference }) });

  sendJson(response, 201, {
    id,
    checkout_url: `http://localhost:${getPort(request)}/checkout/${id}`,
  });
}

function renderCheckout(response: ServerResponse, session: CheckoutSession | undefined): void {
  if (session === undefined) {
    sendHtml(response, 404, "<h1>Checkout introuvable</h1>");
    return;
  }

  const reference = session.reference === undefined ? "—" : escapeHtml(session.reference);
  sendHtml(response, 200, `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PayAfrica Dev Checkout</title><style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:64px auto;padding:0 24px;color:#172033}
button{display:block;width:100%;padding:14px;margin:12px 0;border:0;border-radius:8px;font-size:16px;cursor:pointer}
.success{background:#198754;color:white}.failure{background:#dc3545;color:white}.cancel{background:#5c6475;color:white}#result{min-height:24px}
</style></head><body><h1>PayAfrica Dev Checkout</h1><p>Référence : <strong>${reference}</strong></p>
<button class="success" data-result="success">✅ Simuler Paiement Réussi</button>
<button class="failure" data-result="insufficient_funds">❌ Simuler Échec / Solde Insuffisant</button>
<button class="cancel" data-result="cancelled">🚫 Simuler Annulation Utilisateur</button><p id="result"></p>
<script>document.querySelectorAll("button[data-result]").forEach((button)=>button.addEventListener("click",async()=>{
const result=document.getElementById("result");result.textContent="Envoi du webhook…";
const response=await fetch("/checkout/${session.id}/simulate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({result:button.dataset.result})});
const payload=await response.json();result.textContent=payload.message||payload.error;}));</script></body></html>`);
}

async function simulateCheckout(
  request: IncomingMessage,
  response: ServerResponse,
  session: CheckoutSession | undefined,
  target: URL,
): Promise<void> {
  if (session === undefined) {
    sendJson(response, 404, { error: "Checkout not found" });
    return;
  }

  const payload = await readJson<{ result?: unknown }>(request);
  const simulation = parseSimulation(payload.result);
  const event = createPaymentEvent(session, simulation);
  const rawBody = JSON.stringify(event);
  const signature = createHmac("sha256", DEV_WEBHOOK_SECRET).update(rawBody).digest("hex");

  try {
    const webhookResponse = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payafrica-signature": `sha256=${signature}`,
      },
      body: rawBody,
    });
    const status = `${webhookResponse.status} ${webhookResponse.statusText}`.trim();
    console.log(`[${status}] Webhook envoyé à ${target.toString()}`);
    sendJson(response, 200, { message: `[${status}] Webhook envoyé à ${target.toString()}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    console.error(`[ERROR] Webhook non envoyé à ${target.toString()}: ${message}`);
    sendJson(response, 502, { error: `Webhook delivery failed: ${message}` });
  }
}

function createPaymentEvent(session: CheckoutSession, simulation: Simulation): PaymentEvent {
  const common = {
    id: randomUUID(),
    sessionId: session.id,
    ...(session.reference === undefined ? {} : { reference: session.reference }),
    occurredAt: new Date().toISOString(),
  };
  if (simulation === "success") return { ...common, status: "success" };
  if (simulation === "insufficient_funds") {
    return { ...common, status: "failed", error: "INSUFFICIENT_FUNDS" };
  }
  return { ...common, status: "failed", error: "USER_CANCELLED" };
}

function parseSimulation(value: unknown): Simulation {
  if (value === "success" || value === "insufficient_funds" || value === "cancelled") return value;
  throw new Error("Invalid simulation result.");
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  let rawBody = "";
  for await (const chunk of request) {
    rawBody += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (Buffer.byteLength(rawBody) > MAX_REQUEST_SIZE) throw new Error("Request body is too large.");
  }
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error("Request body must contain valid JSON.");
  }
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function validateTarget(value: string): URL {
  const target = new URL(value);
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("--target must use http or https.");
  }
  return target;
}

function getPort(request: IncomingMessage): number {
  const address = request.socket.localPort;
  if (address === undefined) throw new Error("Unable to determine local server port.");
  return address;
}

function getListeningPort(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Unable to determine the dev server port.");
  }
  return address.port;
}

function sendJson(response: ServerResponse, status: number, payload: object): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendHtml(response: ServerResponse, status: number, html: string): void {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}
