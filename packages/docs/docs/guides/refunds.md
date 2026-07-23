---
sidebar_position: 2
---

# Remboursements

Wave et MTN MoMo prennent en charge les remboursements via leurs API. Orange
Money ne propose pas actuellement de remboursement marchand automatique dans
l'API publique utilisée par le SDK.

```ts
const refund = await payAfrica.refund(sessionId, 500);
```

Le montant doit être un entier positif en unités mineures et ne peut pas
dépasser le montant original connu. Le SDK ne conserve pas encore l'historique
des remboursements partiels précédents.
