# WaslPay SDK — Instructions persistantes

## Vision du projet

WaslPay est un SDK open source unifié pour intégrer les paiements mobiles
ouest-africains derrière une interface unique. Les trois providers pris en
charge sont Orange Money, Wave et MTN MoMo. Le SDK cible Node.js en premier,
puis PHP et Python.

### Périmètre assumé : Free Money et Wizall exclus

Free Money et Wizall n'exposent pas d'API directe dans le périmètre de ce SDK ;
leur accès marchand passe par des agrégateurs tiers, par exemple PayDunya.
WaslPay choisit délibérément de ne pas les intégrer afin de préserver son
indépendance vis-à-vis d'intermédiaires commerciaux. Si un besoin réel émerge,
ce sera une décision distincte, explicitement documentée — pas un provider
« à venir » ni un oubli.

### Miroir PHP et Packagist

Le package Composer porte le nom `waslpay/core-php`. Il doit être enregistré
sur Packagist en pointant vers le dépôt miroir `gaye-lamine/waslpay-php`, et
non vers le monorepo principal. À chaque tag `v*`, le workflow de release
extrait `packages/core-php` avec `git subtree split`, pousse ce contenu vers le
miroir et y crée le même tag. Cette publication exige le secret de dépôt
`WASLPAY_PHP_MIRROR_TOKEN` avec accès d'écriture au miroir.

## Architecture : règle absolue

Aucune logique spécifique à un fournisseur ne doit fuiter dans la façade
`WaslPay`. Chaque fournisseur est un adaptateur isolé et doit implémenter
exactement l'interface définie dans `spec/provider-interface.md`.

Les adaptateurs implémentent exactement l'interface `PaymentProvider` définie
dans `spec/provider-interface.md` : `initiatePayment`, `checkStatus`,
`handleWebhook` et `refund`. Ne pas faire diverger leurs signatures ni ajouter
de logique provider à la façade.

`checkStatus(sessionId: string)` retourne `Promise<PaymentStatusResult>`, et
non plus `Promise<PaymentStatus>`. Le résultat expose `status`; `error` est
obligatoire seulement lorsque `status === PaymentStatus.Failed`, et absent pour
`pending`, `success` et `expired`. Il s'agit d'un breaking change documenté
dans le changelog de `spec/provider-interface.md`.

### Garantie d'invariant de `PaymentStatusResult`

L'invariant « `error` requis pour `failed`, absent sinon » est vérifié à
l'exécution en PHP (le constructeur lève `InvalidArgumentException`) et en
Python (Pydantic lève `ValidationError`). En Node, il est vérifié uniquement
au typecheck TypeScript par l'union discriminée : un appelant JavaScript pur,
sans TypeScript, peut construire un `PaymentStatusResult` invalide sans
déclencher d'erreur à l'exécution.

## Qualité et sécurité

- Écrire du TypeScript strict : aucun `any`.
- Ajouter et faire passer les tests de contrat avant toute fusion d'un provider.
- Ne jamais committer de clé API, de secret ou d'identifiant réel.
- Lire les secrets exclusivement depuis les variables d'environnement.

## Comportement par défaut du WebhookEventStore

Les trois ports créent un `InMemoryWebhookEventStore` **une fois par instance
de provider** lorsque l'intégrateur n'injecte pas explicitement de store. Il
est donc partagé entre les appels `handleWebhook` d'une même instance Orange
Money, Wave ou MTN MoMo, mais pas entre deux instances de provider, ni par la
façade `WaslPay`.

- Node : `config.webhookEventStore ?? new InMemoryWebhookEventStore()` dans le
  constructeur du provider.
- PHP : `?WebhookEventStoreInterface $webhookEventStore = null`, puis
  `$webhookEventStore ?? new InMemoryWebhookEventStore()` dans le constructeur.
- Python : `webhook_event_store: WebhookEventStore | None = None`, puis
  `webhook_event_store if webhook_event_store is not None else
  InMemoryWebhookEventStore()` dans `__init__`.

Le comportement par défaut est identique pour les trois langages : il assure
la déduplication seulement pendant la vie de cette instance de provider. Pour
une déduplication multi-instance, multi-worker ou durable, l'intégrateur doit
injecter un store persistant partagé. En Python, le choix du store repose sur
  `is not None` : un store injecté falsy reste donc bien utilisé.

## Support actuel de `PaymentStatus.Expired`

`Expired` est pris en charge uniquement par **Wave**, dans les SDK Node.js,
PHP et Python :
`checkout_status: "expired"` est prioritaire sur `payment_status` dans
`checkStatus` et `handleWebhook`. Wave ne documente pas à ce jour un type
d'événement webhook dédié à l'expiration ; un webhook contenant ce statut est
néanmoins normalisé en `expired`.

Orange Money et MTN MoMo restent explicitement non supportés pour `Expired` :
aucune documentation officielle suffisamment précise ne confirme ce statut
sur les endpoints réellement interrogés. Ils n'infèrent pas l'expiration par
date : une réponse `PENDING` reste `pending`, et un statut API inconnu est
rejeté avec `PaymentError.Unknown`.
