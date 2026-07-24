# Compatibilité WaslPay

Ce document décrit les capacités publiques communes aux SDK Node.js, PHP et
Python, ainsi que la différence de comportement connue entre leurs runtimes.
Pour le contrat d'intégration complet, consultez
[spec/provider-interface.md](spec/provider-interface.md).

## Capacités par provider (identiques dans les 3 langages)

| Capacité | Orange Money | Wave | MTN MoMo |
| --- | --- | --- | --- |
| Remboursement total | ❌ — l'API publique Orange Money eWallet n'expose pas de remboursement marchand automatique en self-service. | ✅ — l'API Checkout propose un remboursement de session. | ✅ — l'API Collection propose une opération de remboursement, dont le traitement peut être asynchrone. |
| Remboursement partiel | ❌ — même limitation d'API publique : aucun remboursement marchand automatique n'est disponible. | ✅ — un montant positif inférieur ou égal au montant original peut être demandé. | ✅ — un montant positif inférieur ou égal au montant original peut être demandé. |
| Statut `expired` | ❌ — l'endpoint utilisé par le SDK ne fournit pas de statut d'expiration exploitable ; une réponse `PENDING` reste donc `pending`. | ✅ — `checkout_status: "expired"` est normalisé en `expired`. | ❌ — l'endpoint Collection utilisé ne fournit pas de statut d'expiration confirmé ; une réponse `PENDING` reste donc `pending`. |

La limite de remboursement est comparée au montant original connu de la
transaction. Les SDK ne conservent pas encore un historique des remboursements
partiels précédents ; ils ne peuvent donc pas calculer un solde remboursable
cumulé.

## Différences de comportement entre Node, PHP et Python

### Validation de `PaymentStatusResult`

Un `PaymentStatusResult` doit contenir `error` lorsque `status` vaut `failed`,
et ne doit pas contenir `error` pour les autres statuts.

| SDK | Garantie |
| --- | --- |
| Node.js / TypeScript | L'invariant est imposé au typecheck TypeScript par une union discriminée. Il n'est pas vérifié à l'exécution. |
| PHP | Le constructeur lève `InvalidArgumentException` lorsqu'une forme invalide est construite. |
| Python | Pydantic lève `ValidationError` lorsqu'une forme invalide est construite. |

Conséquence pour un intégrateur Node.js qui utilise du JavaScript pur : rien
n'empêche à l'exécution de construire `{ status: "failed" }` sans `error`, ou
un statut de succès muni d'une erreur. Utilisez TypeScript ou validez ces
objets à la frontière de votre application. En PHP et Python, ces deux formes
sont rejetées lors de leur construction.

## Idempotence des webhooks

Par défaut, la déduplication des webhooks utilise un store en mémoire, limité
à une instance de provider. Il n'est ni partagé entre plusieurs instances, ni
persistant entre deux redémarrages. Dans un déploiement multi-worker,
serverless ou distribué, injectez un store partagé et persistant afin de
garantir l'idempotence entre les processus et les redémarrages.
