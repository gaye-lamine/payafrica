---
sidebar_position: 1
---

# Capacités des providers

| Capacité | Orange Money | Wave | MTN MoMo |
| --- | --- | --- | --- |
| Remboursement total | ❌ — l'API publique Orange Money eWallet n'expose pas de remboursement marchand automatique en self-service. | ✅ — l'API Checkout propose un remboursement de session. | ✅ — l'API Collection propose une opération de remboursement, dont le traitement peut être asynchrone. |
| Remboursement partiel | ❌ — même limitation d'API publique : aucun remboursement marchand automatique n'est disponible. | ✅ — un montant positif inférieur ou égal au montant original peut être demandé. | ✅ — un montant positif inférieur ou égal au montant original peut être demandé. |
| Statut `expired` | ❌ — l'endpoint utilisé par le SDK ne fournit pas de statut d'expiration exploitable ; une réponse `PENDING` reste donc `pending`. | ✅ — `checkout_status: "expired"` est normalisé en `expired`. | ❌ — l'endpoint Collection utilisé ne fournit pas de statut d'expiration confirmé ; une réponse `PENDING` reste donc `pending`. |

Les limites et différences entre runtimes sont documentées dans la page de
[compatibilité](../compatibility.md).
