import type { Provider } from "../env.js";

export type NodeFramework = "express" | "fastify" | "nestjs";

export function generateNodeBoilerplate(framework: NodeFramework, providers: readonly Provider[]): string {
  const selected = providers.join(", ");
  const route = framework === "fastify" ? "app.post('/webhooks/payments', async (request, reply) => {\n  // Preserve request.raw body before JSON parsing for signed providers.\n  return reply.code(204).send();\n});" : framework === "nestjs" ? "@Post('webhooks/payments')\nhandleWebhook(@Req() request: Request): void {\n  // Configure raw-body middleware before verifying provider webhooks.\n}" : "app.post('/webhooks/payments', express.raw({ type: 'application/json' }), async (req, res) => {\n  // Delegate raw body and request headers to the selected provider.\n  res.sendStatus(204);\n});";
  return `// Generated for ${framework}. Selected providers: ${selected}\nimport { WaslPay } from '@waslpay/core-node';\n\n// Construct the selected provider with process.env values, then inject it here.\nconst waslpay = new WaslPay(provider);\n\nconst session = await waslpay.initiatePayment({\n  amount: 1000,\n  currency: 'XOF',\n  reference: 'order-123',\n  customerPhone: '+221770000000',\n});\n\nconsole.log(session.paymentUrl ?? session.id);\n\n${route}\n`;
}
