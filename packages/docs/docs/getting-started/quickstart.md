---
sidebar_position: 1
---

# Quickstart

## Générer une intégration

La CLI prépare un exemple pour votre langage et votre framework :

```bash
npx @payafrica/cli init
```

Pour une exécution scriptée, fournissez les trois options ensemble :

```bash
npx @payafrica/cli init \
  --language node \
  --framework express \
  --providers wave,mtn-momo
```

## Créer une session Node.js

```ts
import { PayAfrica, WaveProvider } from "@payafrica/core-node";

const provider = new WaveProvider({
  apiKey: process.env.WAVE_API_KEY!,
  webhookSecret: process.env.WAVE_WEBHOOK_SECRET!,
});

const payAfrica = new PayAfrica(provider);
const session = await payAfrica.initiatePayment({
  amount: 1_000,
  currency: "XOF",
  reference: "order-123",
});
```

Utilisez des identifiants de test ou de production délivrés par l'opérateur ; ne
commitez jamais de secret dans votre application.
