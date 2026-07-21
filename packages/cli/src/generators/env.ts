export type Provider = "orange-money" | "wave" | "mtn-momo";

const PROVIDER_ENV: Record<Provider, readonly string[]> = {
  "orange-money": [
    "# Orange Money Sénégal (Sonatel)",
    "ORANGE_MONEY_CLIENT_ID=",
    "ORANGE_MONEY_CLIENT_SECRET=",
    "ORANGE_MONEY_MERCHANT_CODE=",
    "ORANGE_MONEY_SITENAME=",
    "ORANGE_MONEY_CALLBACK_URL=",
    "ORANGE_MONEY_WEBHOOK_API_KEY=",
    "ORANGE_MONEY_ENVIRONMENT=sandbox",
  ],
  wave: [
    "# Wave Sénégal Checkout",
    "WAVE_API_KEY=",
    "WAVE_WEBHOOK_SECRET=",
  ],
  "mtn-momo": [
    "# MTN MoMo Collection",
    "MTN_MOMO_SUBSCRIPTION_KEY=",
    "MTN_MOMO_API_USER=",
    "MTN_MOMO_API_KEY=",
    "MTN_MOMO_TARGET_ENVIRONMENT=sandbox",
    "MTN_MOMO_DEFAULT_CURRENCY=XOF",
  ],
};

export function generateEnvExample(providers: readonly Provider[]): string {
  const sections = providers.flatMap((provider) => [...PROVIDER_ENV[provider], ""]);
  return ["# PayAfrica SDK configuration", "# Never commit actual secrets.", "", ...sections].join("\n");
}
