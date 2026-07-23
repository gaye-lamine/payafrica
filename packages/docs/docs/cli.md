---
sidebar_position: 5
---

# CLI PayAfrica

La CLI accompagne le développement et les tests locaux :

```bash
npx @payafrica/cli init
npx @payafrica/cli dev
npx @payafrica/cli doctor
npx @payafrica/cli trigger wave.payment.success
```

`dev` démarre un serveur de checkout local et livre des webhooks HMAC de test.
`doctor` vérifie les variables d'environnement. `trigger` envoie un événement
normalisé à une URL cible.

Consultez le [README de la CLI](https://github.com/gaye-lamine/payafrica/tree/main/packages/cli) pour les options complètes.
