import type { Provider } from "../env.js";

export type PhpFramework = "laravel" | "symfony" | "native";

export function generatePhpBoilerplate(framework: PhpFramework, providers: readonly Provider[]): string {
  return `<?php\n\ndeclare(strict_types=1);\n\n// Generated for ${framework}. Selected providers: ${providers.join(", ")}\nuse WaslPay\\Sdk\\DTO\\PaymentRequest;\nuse WaslPay\\Sdk\\WaslPay;\n\n// Build the selected provider from getenv() values and inject it into WaslPay.\n$waslPay = new WaslPay($provider);\n$session = $waslPay->initiatePayment(new PaymentRequest(1000, 'XOF', 'order-123', '+221770000000'));\n\n// Webhook route: pass the untouched request body and all HTTP headers.\n$event = $waslPay->handleWebhook(file_get_contents('php://input'), getallheaders());\n`;
}
