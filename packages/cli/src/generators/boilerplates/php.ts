import type { Provider } from "../env.js";

export type PhpFramework = "laravel" | "symfony" | "native";

export function generatePhpBoilerplate(framework: PhpFramework, providers: readonly Provider[]): string {
  return `<?php\n\ndeclare(strict_types=1);\n\n// Generated for ${framework}. Selected providers: ${providers.join(", ")}\nuse PayAfrica\\Sdk\\DTO\\PaymentRequest;\nuse PayAfrica\\Sdk\\PayAfrica;\n\n// Build the selected provider from getenv() values and inject it into PayAfrica.\n$payAfrica = new PayAfrica($provider);\n$session = $payAfrica->initiatePayment(new PaymentRequest(1000, 'XOF', 'order-123', '+221770000000'));\n\n// Webhook route: pass the untouched request body and all HTTP headers.\n$event = $payAfrica->handleWebhook(file_get_contents('php://input'), getallheaders());\n`;
}
