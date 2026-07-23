---
sidebar_position: 1
slug: /
---

# PayAfrica SDK

PayAfrica fournit une interface unique pour intégrer Orange Money, Wave et MTN
MoMo dans des applications Node.js, PHP et Python.

## Principes

- Les adaptateurs utilisent vos propres identifiants marchands et appellent les
  API des opérateurs.
- La façade `PayAfrica` conserve le même contrat quel que soit le provider.
- Les statuts, erreurs et événements webhook sont normalisés.
- Les identifiants et secrets restent dans les variables d'environnement.

Commencez avec le [quickstart](getting-started/quickstart.md), puis consultez
les [capacités par provider](providers/capabilities.md) avant de choisir un
flux de paiement.
