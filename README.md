# Terre 2187 — version GitHub Pages

Cette version est un site statique prêt à être publié depuis la racine d’un dépôt GitHub Pages.

## Publication

1. Créez un dépôt GitHub public, par exemple `terre-2187`.
2. Décompressez l’archive et ajoutez **tout son contenu** à la racine du dépôt (`index.html`, les autres pages, `assets/`, `css/`, `js/` et `.nojekyll`). Ne déposez pas seulement le fichier ZIP.
3. Sur GitHub, ouvrez **Settings → Pages**.
4. Dans **Build and deployment**, choisissez **Deploy from a branch**, puis la branche `main` et le dossier `/(root)`.
5. Enregistrez. GitHub affichera l’adresse de publication, généralement `https://votre-compte.github.io/terre-2187/`.

Aucune compilation n’est nécessaire. Les pages et leurs ressources utilisent des chemins relatifs pour fonctionner dans un dépôt de projet.

## Fonctionnalités et limites

- Le site livré est composé de pages HTML, de CSS, de JavaScript et de fichiers statiques.
- La création de personnage, les règles, le compendium, les aventures et le téléchargement du livret PDF sont inclus.
- La fiche de personnage est générée dans le navigateur. Les saisies ne sont pas enregistrées en ligne et sont perdues si la page est rechargée avant le téléchargement du PDF.
- Aucun appel à une base de données, à une API ou à un service propre à ChatGPT Sites n’a été repéré dans les fichiers exportés.

Pour mettre à jour le site, remplacez les fichiers du dépôt par ceux d’une nouvelle exportation, puis poussez les modifications sur `main`.
