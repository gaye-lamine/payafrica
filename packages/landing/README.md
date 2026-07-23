# PayAfrica Landing

Landing page statique officielle du SDK PayAfrica.

## Lancer localement

Installez les dépendances depuis ce dossier :

```bash
npm install
npm run preview
```

La commande exacte `npm run preview` exécute `node server.mjs`. La landing est
alors disponible sur [http://localhost:4173](http://localhost:4173) par défaut.

## Déploiement

Il n'existe aujourd'hui aucun déploiement automatisé ni hébergement public
configuré pour cette landing. Elle est servie localement par `server.mjs` tant
qu'une solution d'hébergement et un workflow de déploiement n'ont pas été
ajoutés.

## Tests

Ce package ne possède **pas encore de tests automatisés réels**. Le script
`npm test` exécute volontairement `node --test` sans fichier de test afin que
`npm test --workspaces` puisse inclure ce package sans échouer à cause d'un
script manquant. Une sortie `1..0` signifie donc « aucun test découvert », et
ne doit pas être interprétée comme une couverture de la landing page.
