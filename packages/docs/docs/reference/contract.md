---
sidebar_position: 1
---

# Contrat de provider

Tous les adaptateurs implémentent les mêmes opérations :

```ts
interface PaymentProvider {
  initiatePayment(params: PaymentRequest): Promise<PaymentSession>;
  checkStatus(sessionId: string): Promise<PaymentStatusResult>;
  handleWebhook(rawBody: string | Buffer, headers: Headers): Promise<PaymentEvent>;
  refund(sessionId: string, amount?: number): Promise<RefundResult>;
}
```

`checkStatus()` retourne un objet contenant `status`. Lorsque le statut est
`failed`, `error` contient obligatoirement une valeur `PaymentError`.

La spécification complète et normative est disponible dans
[provider-interface.md](https://github.com/gaye-lamine/payafrica/blob/main/spec/provider-interface.md).
