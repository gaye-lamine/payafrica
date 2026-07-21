# PayAfrica SDK — Instructions persistantes

## Vision du projet

PayAfrica est un SDK open source unifié pour intégrer les paiements mobiles
ouest-africains derrière une interface unique. Les fournisseurs concernés sont
Orange Money, Wave, Free Money, Wizall et MTN MoMo. Le SDK cible Node.js en
premier, puis PHP dans un second temps.

## Architecture : règle absolue

Aucune logique spécifique à un fournisseur ne doit fuiter dans la façade
`PayAfrica`. Chaque fournisseur est un adaptateur isolé et doit implémenter
exactement l'interface définie dans `spec/provider-interface.md`.

Les adaptateurs implémentent exactement l'interface `PaymentProvider` définie
dans `spec/provider-interface.md` : `initiatePayment`, `checkStatus`,
`handleWebhook` et `refund`. Ne pas faire diverger leurs signatures ni ajouter
de logique provider à la façade.

## Qualité et sécurité

- Écrire du TypeScript strict : aucun `any`.
- Ajouter et faire passer les tests de contrat avant toute fusion d'un provider.
- Ne jamais committer de clé API, de secret ou d'identifiant réel.
- Lire les secrets exclusivement depuis les variables d'environnement.
