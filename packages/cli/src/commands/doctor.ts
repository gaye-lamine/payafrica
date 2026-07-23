import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

type Provider = "Wave" | "Orange Money" | "MTN MoMo";

interface ProviderRequirements {
  name: Provider;
  detectedBy: readonly string[];
  requiredKeys: readonly string[];
}

const PROVIDERS: readonly ProviderRequirements[] = [
  {
    name: "Wave",
    detectedBy: ["WAVE_"],
    requiredKeys: ["WAVE_API_KEY", "WAVE_WEBHOOK_SECRET"],
  },
  {
    name: "Orange Money",
    detectedBy: ["ORANGE_MONEY_"],
    requiredKeys: [
      "ORANGE_MONEY_CLIENT_ID",
      "ORANGE_MONEY_CLIENT_SECRET",
      "ORANGE_MONEY_MERCHANT_CODE",
      "ORANGE_MONEY_SITENAME",
      "ORANGE_MONEY_CALLBACK_URL",
      "ORANGE_MONEY_WEBHOOK_API_KEY",
      "ORANGE_MONEY_ENVIRONMENT",
    ],
  },
  {
    name: "MTN MoMo",
    detectedBy: ["MTN_MOMO_"],
    requiredKeys: [
      "MTN_MOMO_SUBSCRIPTION_KEY",
      "MTN_MOMO_API_USER",
      "MTN_MOMO_API_KEY",
      "MTN_MOMO_TARGET_ENVIRONMENT",
      "MTN_MOMO_DEFAULT_CURRENCY",
    ],
  },
];

export async function doctorCommand(): Promise<void> {
  const envPath = await findEnvFile();
  const checks: boolean[] = [];

  console.log("PayAfrica doctor");
  console.log("");

  const nodeHealthy = getNodeMajorVersion(process.versions.node) >= 20;
  checks.push(nodeHealthy);
  report(nodeHealthy, `Node.js v${process.versions.node} ${nodeHealthy ? "(v20+ requis)" : "(v20+ requis)"}`);

  if (envPath === undefined) {
    checks.push(false);
    report(false, "Aucun fichier .env.local ou .env trouvé");
    finish(checks);
    return;
  }

  const values = parseEnv(await readFile(envPath, "utf8"));
  checks.push(true);
  report(true, `${envPath.split(/[\\/]/).pop() ?? ".env"} trouvé`);

  const detectedProviders = PROVIDERS.filter((provider) =>
    Object.keys(values).some((key) => provider.detectedBy.some((prefix) => key.startsWith(prefix))),
  );

  if (detectedProviders.length === 0) {
    checks.push(false);
    report(false, "Aucun provider PayAfrica détecté");
  }

  for (const provider of detectedProviders) {
    console.log(`\n${provider.name}`);
    for (const key of provider.requiredKeys) {
      const present = values[key] !== undefined && values[key].length > 0;
      checks.push(present);
      report(present, present ? key : `${key} manquant`);
    }
  }

  finish(checks);
}

async function findEnvFile(): Promise<string | undefined> {
  const cwd = process.cwd();
  const candidates = [resolve(cwd, ".env.local"), resolve(cwd, ".env")];
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.R_OK);
      return candidate;
    } catch {
      // Continue with the next conventional environment file.
    }
  }
  return undefined;
}

export function parseEnv(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const assignment = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (assignment?.[1] === undefined || assignment[2] === undefined) continue;

    values[assignment[1]] = unquote(assignment[2].trim());
  }
  return values;
}

export function unquote(value: string): string {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

export function getNodeMajorVersion(versionString: string): number {
  const [major] = versionString.replace(/^[vV]/u, "").split(".");
  return major === undefined ? 0 : Number(major);
}

function report(ok: boolean, message: string): void {
  console.log(`[${ok ? "✓" : "✗"}] ${message}`);
}

function finish(checks: readonly boolean[]): void {
  const healthy = checks.every(Boolean);
  console.log(healthy ? "\nConfiguration PayAfrica valide." : "\nConfiguration PayAfrica incomplète.");
  if (!healthy) process.exitCode = 1;
}
