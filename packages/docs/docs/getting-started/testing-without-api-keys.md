---
sidebar_position: 2
---

# Tester sans clés API

```bash
npx @payafrica/cli init --language node --framework express --providers wave --mock
payafrica dev
```

Le fichier généré contient :

```dotenv
WAVE_API_KEY=mock_wave_key
WAVE_WEBHOOK_SECRET=mock_wave_webhook
WAVE_BASE_URL=http://localhost:4004/mock/wave
```

Le code reste identique en production : remplacez les clés et supprimez
uniquement `WAVE_BASE_URL`. Le même principe s'applique à Orange et MTN.
