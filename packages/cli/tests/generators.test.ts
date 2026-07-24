import { describe, expect, it } from "vitest";

import { generateEnvExample, type Provider } from "../src/generators/env.js";
import { generateNodeBoilerplate, type NodeFramework } from "../src/generators/boilerplates/node.js";
import { generatePhpBoilerplate, type PhpFramework } from "../src/generators/boilerplates/php.js";
import { generatePythonBoilerplate, type PythonFramework } from "../src/generators/boilerplates/python.js";

const providers: readonly Provider[] = ["orange-money", "wave", "mtn-momo"];

const providerEnvironmentLines: Readonly<Record<Provider, readonly string[]>> = {
  "orange-money": ["ORANGE_MONEY_CLIENT_ID=", "ORANGE_MONEY_ENVIRONMENT=sandbox"],
  wave: ["WAVE_API_KEY=", "WAVE_WEBHOOK_SECRET="],
  "mtn-momo": ["MTN_MOMO_SUBSCRIPTION_KEY=", "MTN_MOMO_DEFAULT_CURRENCY=XOF"],
};

describe("generateEnvExample", () => {
  it.each(providers)("includes the expected variables for %s", (provider) => {
    const generated = generateEnvExample([provider]);

    expect(generated).toContain("# WaslPay SDK configuration");
    for (const expectedLine of providerEnvironmentLines[provider]) {
      expect(generated).toContain(expectedLine);
    }
  });

  it("preserves provider order when generating multiple sections", () => {
    const generated = generateEnvExample(["wave", "mtn-momo"]);

    expect(generated.indexOf("# Wave Sénégal Checkout")).toBeLessThan(generated.indexOf("# MTN MoMo Collection"));
  });
});

const nodeFrameworks: readonly NodeFramework[] = ["express", "fastify", "nestjs"];

describe("generateNodeBoilerplate", () => {
  it.each(nodeFrameworks.flatMap((framework) => providers.map((provider) => [framework, provider] as const)))
  ("generates %s boilerplate for %s", (framework, provider) => {
    const generated = generateNodeBoilerplate(framework, [provider]);

    expect(generated).toContain(`// Generated for ${framework}. Selected providers: ${provider}`);
    expect(generated).toContain("const waslpay = new WaslPay(provider);");
    expect(generated).toContain("webhooks/payments");
  });
});

const phpFrameworks: readonly PhpFramework[] = ["laravel", "symfony", "native"];

describe("generatePhpBoilerplate", () => {
  it.each(phpFrameworks.flatMap((framework) => providers.map((provider) => [framework, provider] as const)))
  ("generates %s boilerplate for %s", (framework, provider) => {
    const generated = generatePhpBoilerplate(framework, [provider]);

    expect(generated).toContain(`// Generated for ${framework}. Selected providers: ${provider}`);
    expect(generated).toContain("$waslPay = new WaslPay($provider);");
    expect(generated).toContain("file_get_contents('php://input')");
  });
});

const pythonFrameworks: readonly PythonFramework[] = ["fastapi", "django"];

describe("generatePythonBoilerplate", () => {
  it.each(pythonFrameworks.flatMap((framework) => providers.map((provider) => [framework, provider] as const)))
  ("generates %s boilerplate for %s", (framework, provider) => {
    const generated = generatePythonBoilerplate(framework, [provider]);

    expect(generated).toContain(`# Generated for ${framework}. Selected providers: ${provider}`);
    expect(generated).toContain("waslpay = WaslPay(provider)");
    expect(generated).toContain("handle_webhook");
  });
});
