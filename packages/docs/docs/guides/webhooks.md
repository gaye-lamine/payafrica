---
sidebar_position: 1
---

# Sécuriser les webhooks

Transmettez toujours le body HTTP brut et les headers entrants au provider. Ne
parsez pas puis ne re-sérialisez pas le payload avant la vérification : une
signature HMAC dépend des octets exacts reçus.

```ts
app.post("/webhooks/payafrica", express.raw({ type: "application/json" }), async (req, res) => {
  const event = await payAfrica.handleWebhook(req.body, req.headers);
  res.status(200).json({ accepted: true, eventId: event.id });
});
```

Une signature invalide doit être rejetée avant toute mise à jour métier. Pour
les événements répétés, utilisez un store d'idempotence persistant dans les
déploiements multi-worker ou serverless.
