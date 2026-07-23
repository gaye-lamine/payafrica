# Documentation PayAfrica

Ce package contient le portail public de documentation Docusaurus. En production,
il est déployé sur GitHub Pages à l'adresse `https://gaye-lamine.github.io/payafrica/`.

## Développement local

Depuis la racine du monorepo :

```bash
npm install
npm --workspace @payafrica/docs start
```

La commande synchronise d'abord `COMPATIBILITY.md`, puis démarre Docusaurus.

Pour générer le site statique de production :

```bash
npm --workspace @payafrica/docs run build
```

Le workflow `.github/workflows/docs.yml` publie `packages/docs/build` sur GitHub
Pages après un push sur `main` qui touche la documentation ou `COMPATIBILITY.md`.
