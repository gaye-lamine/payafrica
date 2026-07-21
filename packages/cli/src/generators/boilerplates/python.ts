import type { Provider } from "../env.js";

export type PythonFramework = "fastapi" | "django";

export function generatePythonBoilerplate(framework: PythonFramework, providers: readonly Provider[]): string {
  const route = framework === "fastapi" ? "@app.post('/webhooks/payments')\nasync def webhook(request: Request):\n    raw_body = await request.body()\n    event = await payafrica.handle_webhook(raw_body, dict(request.headers))\n    return {'event_id': event.id}" : "async def webhook(request):\n    event = await payafrica.handle_webhook(request.body, dict(request.headers.items()))\n    return JsonResponse({'event_id': event.id})";
  return `# Generated for ${framework}. Selected providers: ${providers.join(", ")}\nfrom payafrica import PayAfrica, PaymentRequest\n\n# Build the selected provider from environment variables and inject it here.\npayafrica = PayAfrica(provider)\nsession = await payafrica.initiate_payment(PaymentRequest(amount=1000, currency='XOF', reference='order-123', customer_phone='+221770000000'))\n\n${route}\n`;
}
