# Contrat des providers de paiement

Ce document définit le contrat unique que doit respecter tout adaptateur de paiement WaslPay : Orange Money, Wave et MTN MoMo.

## Périmètre des providers

Free Money et Wizall sont explicitement exclus : ils n'exposent pas d'API
directe dans le périmètre de WaslPay et passent par des agrégateurs tiers,
par exemple PayDunya. Cette décision préserve l'indépendance du SDK vis-à-vis
d'intermédiaires commerciaux. Leur éventuelle intégration future devra faire
l'objet d'une décision distincte et documentée ; ils ne sont pas des providers
« à venir » et leur absence n'est pas un oubli.

La façade `WaslPay` ne connaît que ce contrat. Elle ne doit jamais importer, exposer ni interpréter des champs, statuts, erreurs ou identifiants propres à un provider. Toute traduction entre ce contrat et l'API distante appartient exclusivement à l'adaptateur concerné.

## Note de version

**2026-07-22 — breaking change assumé :** `checkStatus()` retourne désormais un `PaymentStatusResult` au lieu du `PaymentStatus` plat. L'ancien retour ne pouvait pas transporter la cause normalisée d'un échec, alors même que ce contrat exige le mapping des erreurs provider vers `PaymentError`. Les intégrateurs doivent donc lire `result.status` et, uniquement lorsque ce statut vaut `failed`, `result.error`.

## Interface TypeScript

```ts
export interface PaymentProvider {
  initiatePayment(params: PaymentRequest): Promise<PaymentSession>;
  checkStatus(sessionId: string): Promise<PaymentStatusResult>;
  handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentEvent>;
  refund(sessionId: string, amount?: number): Promise<RefundResult>;
}
```

Un provider doit implémenter ces quatre méthodes avec exactement ces noms, paramètres et types de retour. Il ne doit pas ajouter de paramètre obligatoire ni modifier leur sémantique. Les détails de configuration (clés, URL API, secrets de webhook) sont fournis à l'adaptateur à son initialisation et ne font pas partie de cette interface.

## Types communs

```ts
export interface PaymentRequest {
  /** Montant positif, exprimé en unités monétaires mineures (ex. 1 000 = 1 000 XOF). */
  amount: number;
  /** Code devise ISO 4217, par exemple "XOF". */
  currency: string;
  /** Référence métier unique fournie par l'intégrateur. */
  reference: string;
  /** Numéro du payeur au format E.164 lorsqu'il est connu ou requis par le flux. */
  customerPhone?: string;
  /** URL de retour générique après succès, lorsque le provider la prend en charge. */
  successUrl?: string;
  /** URL de retour générique après échec ou annulation, lorsque le provider la prend en charge. */
  failureUrl?: string;
  /** Informations métier non sensibles, transmises seulement si le provider le permet. */
  metadata?: Readonly<Record<string, string>>;
}

export interface PaymentSession {
  /** Identifiant stable utilisé par toutes les opérations suivantes du SDK. */
  id: string;
  /** Référence métier reçue dans PaymentRequest. */
  reference: string;
  /** Montant demandé, en unités monétaires mineures. */
  amount: number;
  /** Devise ISO 4217 de la demande. */
  currency: string;
  /** État connu au moment de la création de la session. */
  status: PaymentStatus;
  /** URL ou deep-link générique où le client peut poursuivre le paiement, si applicable. */
  paymentUrl?: string;
  /** Date ISO 8601 d'expiration de la session, si le provider en définit une. */
  expiresAt?: string;
}

export enum PaymentStatus {
  Pending = "pending",
  Success = "success",
  Failed = "failed",
  Expired = "expired",
}

export type PaymentStatusResult =
  | {
      /** L'état courant de la session, hors échec. */
      status: PaymentStatus.Pending | PaymentStatus.Success | PaymentStatus.Expired;
      /** Absent lorsque le statut n'est pas `failed`. */
      error?: never;
    }
  | {
      /** Un échec définitif. */
      status: PaymentStatus.Failed;
      /** Cause normalisée obligatoire lorsque le statut est `failed`. */
      error: PaymentError;
    };

export interface PaymentEvent {
  /** Identifiant unique de l'événement, utilisé pour l'idempotence. */
  id: string;
  /** Identifiant de la session WaslPay concernée. */
  sessionId: string;
  /** État de paiement résultant de l'événement. */
  status: PaymentStatus;
  /** Référence métier, si elle est disponible dans la notification. */
  reference?: string;
  /** Date ISO 8601 à laquelle l'événement a été émis ou observé. */
  occurredAt: string;
  /** Erreur normalisée, présente seulement pour un événement en échec. */
  error?: PaymentError;
}

export interface RefundResult {
  /** Identifiant de la session dont le paiement est remboursé. */
  sessionId: string;
  /** Identifiant stable du remboursement retourné ou créé par le provider. */
  refundId: string;
  /** Montant remboursé ou demandé, en unités monétaires mineures. */
  amount: number;
  /** État connu du remboursement : pending si son traitement est asynchrone. */
  status: PaymentStatus;
}

export enum PaymentError {
  InsufficientFunds = "INSUFFICIENT_FUNDS",
  ProviderTimeout = "PROVIDER_TIMEOUT",
  InvalidPhone = "INVALID_PHONE",
  InvalidRefundAmount = "INVALID_REFUND_AMOUNT",
  RefundAmountExceedsBalance = "REFUND_AMOUNT_EXCEEDS_BALANCE",
  UserCancelled = "USER_CANCELLED",
  Unknown = "UNKNOWN",
}
```

### Sémantique des opérations

`initiatePayment` crée ou démarre une demande de paiement. Son résultat doit toujours contenir un `id` utilisable avec `checkStatus` et `refund`. Il peut être immédiatement `success`, mais il est généralement `pending`. Une absence de `paymentUrl` est valide pour les flux où le provider invite le client par USSD, notification mobile ou autre mécanisme hors navigateur.

`checkStatus` retourne un `PaymentStatusResult` avec l'état courant normalisé de la session dans `status`. Les quatre valeurs sont exhaustives : `pending` tant que le résultat n'est pas définitif, `success` après paiement confirmé, `failed` après échec définitif et `expired` lorsque la demande a dépassé sa durée de validité sans succès. Pour `pending`, `success` et `expired`, la propriété `error` est absente. Pour `failed`, `error` est obligatoire et contient l'une des valeurs de `PaymentError`.

`handleWebhook` reçoit le body HTTP brut exact (`rawBody`) et tous les en-têtes HTTP entrants (`headers`). Il extrait dans l'adaptateur l'en-tête de signature propre au provider, puis vérifie la signature sur `rawBody` avant toute désérialisation. `rawBody` doit être transmis sans transformation, y compris ses espaces et son encodage; l'adaptateur ne doit jamais parser puis re-sérialiser le payload avant sa vérification. Les clés de `headers` doivent être traitées sans distinction de casse. Pour une signature absente, invalide ou non vérifiable, il doit rejeter la promesse, ne produire aucun événement et ne déclencher aucune mise à jour métier. Les livraisons répétées du même `PaymentEvent.id` doivent produire le même résultat sans effet de bord supplémentaire côté intégration.

`refund` demande le remboursement d'un paiement confirmé. Si `amount` est absent, le remboursement porte sur le montant total encore remboursable. S'il est présent, il doit être strictly positif, exprimé en unités mineures et ne pas dépasser ce montant. Un provider dont le remboursement est asynchrone retourne `pending`; sinon `success` ou `failed`. Si une API provider ne permet pas le remboursement partiel, elle doit rejeter une valeur `amount` inférieure au solde remboursable plutôt que de rembourser un montant différent.

### Support actuel de `expired`

`expired` est actuellement pris en charge **uniquement par l'adaptateur Wave**, dans les SDK Node.js, PHP et Python : `checkout_status: "expired"` est prioritaire sur `payment_status`, y compris dans une notification webhook. Wave est le seul provider pour lequel cette information est confirmée par les données de session utilisées par l'adaptateur.

Orange Money et MTN MoMo ne prennent pas encore en charge `expired`. Aucune source API officielle suffisamment précise ne confirme un statut d'expiration sur les endpoints effectivement interrogés par ces adaptateurs. Ils ne déduisent pas l'expiration depuis une date : si leurs API continuent à retourner leur statut `PENDING`, le SDK retourne donc `pending`; si elles retournent une valeur inconnue, le mapping rejette avec une erreur `UNKNOWN`. Cette limitation est assumée, au même titre que les limitations de remboursement propres à chaque provider.

### Limitation connue de la validation de remboursement

La validation `REFUND_AMOUNT_EXCEEDS_BALANCE` compare le montant demandé au **montant original** de la transaction. Elle ne compare pas à un solde remboursable réellement suivi après d'éventuels remboursements partiels antérieurs : aucun provider actuel ne conserve cet historique. Cette limitation est connue et assumée, pas un bug.

Les montants sont des entiers sûrs et positifs (`Number.isSafeInteger`). Les valeurs décimales, nulles ou négatives sont invalides. Les providers peuvent imposer des devises, des plafonds ou un téléphone obligatoire, mais ces règles doivent être validées et signalées par l'adaptateur, jamais exposées comme une spécificité dans la façade.

## Gestion d'erreur

Chaque adaptateur doit mapper toute erreur provider pertinente vers `PaymentError` :

| Erreur commune | Cas à mapper |
| --- | --- |
| `INSUFFICIENT_FUNDS` | Solde du payeur insuffisant. |
| `PROVIDER_TIMEOUT` | Délai d'attente réseau ou de traitement provider dépassé, sans résultat certain. |
| `INVALID_PHONE` | Numéro de téléphone absent lorsqu'il est requis, invalide ou non éligible. |
| `INVALID_REFUND_AMOUNT` | Montant de remboursement nul, négatif, décimal, non entier sûr ou non fini. |
| `REFUND_AMOUNT_EXCEEDS_BALANCE` | Montant de remboursement supérieur au montant original connu de la transaction. |
| `USER_CANCELLED` | Le payeur annule explicitement le paiement ou refuse la demande. |
| `UNKNOWN` | Toute autre erreur, y compris une réponse provider non reconnue. |

Les codes, messages HTTP et identifiants internes du provider peuvent être conservés dans les journaux sécurisés de l'adaptateur, mais ne doivent pas être ajoutés aux types publics ni fuiter dans la façade. Une signature de webhook invalide est une erreur de sécurité : elle est rejetée et mappée à `UNKNOWN` lorsqu'une représentation `PaymentError` est nécessaire.

## Tests de contrat obligatoires

Avant toute fusion, chaque provider doit exécuter les mêmes tests de contrat, avec sandbox ou doubles de test contrôlés :

1. **Paiement réussi** — `initiatePayment` puis `checkStatus` conduisent à `success`; la session conserve l'identifiant, la référence, le montant et la devise demandés.
2. **Paiement échoué** — un échec définitif est retourné comme `failed` et son erreur est l'une des valeurs de `PaymentError`.
3. **Webhook valide** — une signature valide produit un `PaymentEvent` avec un identifiant, une session, un état normalisé et une date; la même livraison peut être traitée de façon idempotente.
4. **Signature de webhook invalide** — `handleWebhook` rejette le payload et ne retourne pas d'événement.
5. **Remboursement partiel** — un montant inférieur au solde remboursable est remboursé exactement, ou explicitement rejeté si le provider ne le supporte pas; aucun montant différent ne peut être remboursé silencieusement.
6. **Remboursement total** — l'omission de `amount` rembourse le solde total et retourne un `RefundResult` cohérent.
7. **Timeout** — une indisponibilité ou un délai provider est mappé à `PROVIDER_TIMEOUT`, sans transformer arbitrairement l'état de la session en `success` ou `failed`.

Ces tests vérifient exclusivement le contrat public. Les requêtes HTTP, schémas et mécanismes d'authentification propres à chaque provider restent testés dans l'adaptateur correspondant.
