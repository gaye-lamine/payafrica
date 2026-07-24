# Exemple Node.js + Express

> **Avertissement :** cet exemple utilise un `FakePaymentProvider` uniquement
> pour la démonstration locale. Il ne contacte ni Wave, ni Orange Money, ni MTN
> MoMo. En production, remplacez-le par un provider réel avec vos propres
> identifiants et secrets.

Cet exemple montre le flux HTTP complet : création de session, consultation de
statut, réception d'un webhook avec body brut et signature HMAC, puis
remboursement.

## Lancer l'exemple

Depuis ce dossier :

```bash
npm install
npm start
```

Le serveur écoute par défaut sur `http://localhost:3000`. Le secret de webhook
local affiché au démarrage est `whsec_demo_local_only` ; il est réservé à cette
démonstration et ne doit jamais être utilisé en production.

Dans un autre terminal, lancez les tests d'intégration :

```bash
npm test
```

Pour connecter un vrai provider Orange Money, Wave ou MTN MoMo, consultez le
[README de `@waslpay/core-node`](../../core-node/README.md).
