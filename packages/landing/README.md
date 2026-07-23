# PayAfrica Landing

Landing page statique officielle du SDK PayAfrica.

## Lancer localement

```bash
npm run preview
```

## Tests

Ce package ne possède **pas encore de tests automatisés réels**. Le script
`npm test` exécute volontairement `node --test` sans fichier de test afin que
`npm test --workspaces` puisse inclure ce package sans échouer à cause d'un
script manquant. Une sortie `1..0` signifie donc « aucun test découvert », et
ne doit pas être interprétée comme une couverture de la landing page.
