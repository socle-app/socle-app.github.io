# Ajouter un design en 3 étapes

## 1. Créer le squelette

```bash
node scripts/new-item.mjs <categorie> <id> ["Nom affiché"]
# ex. node scripts/new-item.mjs cartes carte-produit "Carte produit"
```

Les identifiants de catégorie sont dans `registry/categories.js` (`boutons`, `pricing`, `texte-anime`…). L’`id` est en minuscules et tirets ; il devient l’URL `#/i/<id>`.

Le script crée :

```
registry/items/<id>/
├── meta.json        Fiche du design
├── demo.html        Aperçu live (chargé dans une iframe)
└── code/
    ├── index.html   Onglet « HTML + CSS »
    └── <Nom>.jsx    Onglet « React + Tailwind »
```

## 2. Dessiner le design

**Le code d’abord.** `code/index.html` est la référence : le balisage entre `<!-- SECTION -->` et `<!-- /SECTION -->`, et le CSS dans `<style>`. La démo du squelette lit ce fichier et l’affiche : démo et code restent identiques sans copie.

**La démo.** `demo.html` charge `demo-kit/demo.js`, qui gère le thème, le fond quadrillé et les props :

```js
var props = Socle.props({ duree: 600, actif: true });  // mêmes valeurs par défaut que meta.json
Socle.onChange(render);   // appelé à chaque réglage dans le panneau Props
Socle.onReplay(render);   // bouton « Rejouer »
if (Socle.thumb) { /* vignette : version compacte */ }
```

**La fiche.** Dans `meta.json` :

| Champ | Rôle |
| --- | --- |
| `nom`, `description`, `tags`, `date` | Affichage, recherche, filtres, tri « récent » |
| `niveau` | `"essentiel"` (par défaut si absent) ou `"premium"` : badge « Premium » sur la vignette et la fiche, filtre Tous / Essentiel / Premium de la catégorie |
| `ordre` | Facultatif : départage les designs ajoutés le même jour (plus petit d’abord, 50 si absent) |
| `thumb.width` | Largeur de rendu de la vignette (elle est réduite à la carte) |
| `stage.desktopMin` | Largeur minimale du mode Bureau (1280 pour une section de page) |
| `palette` | Facultatif : palette par défaut du design, un `id` de `data/palettes.json` (`"cobalt"`, `"jade"`…). Sélectionnée d’office dans le bloc « Palette » des Props et utilisée par la vignette ; Terracotta (palette Socle) si absent |
| `dependances` | `[{ "nom": "tokens.css", "note": "…" }]` |
| `props` | Contrôles générés : `number` (min, max, step, unit), `boolean`, `select` (options), `text` |
| `props[].code` | Motif qui met le code à jour en direct : `{ "html": "--duree: {v}ms", "react": "duree={{v}}" }` (une chaîne ou une liste) |
| `code` | Onglets : `{ "id", "label", "file", "lang" }` (`html`, `css`, `js`, `jsx`) |
| `usage`, `accessibilite` | Notes affichées sous le code |
| `logo_exemple` | Facultatif : logo de la marque fictive du design, affiché dans Marques → « Idées de logos ». `{ "nom", "secteur", "fichier": "logo.svg", "palette", "typo" }` (voir ci-dessous) |

**Premium.** Un design `"niveau": "premium"` vise le niveau d’un abonnement payant : repli statique avec « réduire les animations », pause hors écran (IntersectionObserver) pour tout ce qui tourne en boucle, AA mesuré en clair et en sombre, clavier complet, poids et dépendances annoncés. Pour l’instant l’onglet de code reste visible ; seul le badge le distingue.

**Logo d’exemple.** Si la démo met en scène une marque fictive (Sillage, Vélin, Maillon…), ajoutez son logo pour qu’il rejoigne la rubrique « Idées de logos » des Marques, qui se met à jour seule :

```json
"logo_exemple": { "nom": "Maillon", "secteur": "Intégrations", "fichier": "logo.svg", "palette": "violet", "typo": "Geist SemiBold" }
```

- `nom` (obligatoire) : le nom de la marque. Deux designs qui déclarent le même nom partagent une seule carte (« Vu dans … »).
- `secteur` : sert de filtre dans la rubrique ; `palette` : palette d’origine, un `id` de `data/palettes.json` (Terracotta si absent) ; `typo` : police du mot-symbole, pour la fiche.
- `fichier` : un `.svg` du dossier du design, en pratique `registry/items/<id>/logo.svg`. Le logo seul, sans fond ni marge (la planche, le fond clair / sombre et la zone de protection de 40 unités sont ajoutés par Socle) :
  - `viewBox` serré, et `data-icone="x y largeur hauteur"` sur la balise `<svg>` : la boîte carrée de l’icône. Socle en tire l’icône d’app et le pictogramme.
  - Couleurs uniquement par variables avec repli, pour accepter toutes les palettes et rester utilisable hors de Socle : `style="fill:var(--p, currentColor)"`. Rôles : `--p` principale, `--s` secondaire, `--a` accent, `--t` texte coloré, `--ink` mot-symbole, `--lt` clair (découpe sur une forme pleine, repli `#fff`).
  - Mot-symbole vectorisé (chemins, pas de `<text>`) pour un rendu identique en PNG. Les `id` internes sont rendus uniques automatiquement.

`node scripts/build-index.mjs` vérifie le fichier (`viewBox`, `data-icone`, variables) et recopie le champ dans `registry/index.json`.

**Palette.** Le bloc « Palette » des Props change la palette de la démo en direct (les 42 palettes de Fondations ou des couleurs personnalisées) : l’application surcharge les variables de `tokens.css` sur la racine de la démo, en clair et en sombre (`demo-kit/demo.js`, message `palette`). Le choix est partagé dans l’URL (`#/i/<id>?palette=cobalt`, ou `?palette=perso&c=…`) et ajouté au code copié sous forme d’un bloc `:root` / `.dark`. Pour que tout design suive : **n’utiliser que les variables de tokens** (`--accent`, `--accent-fg`, `--accent-vivid`, `--accent-subtle`, `--bg`, `--surface`, `--raised`, `--border`, `--text`…), jamais de couleur en dur ni de couleur recopiée en JavaScript. Un canvas ou un shader relit ses couleurs avec `getComputedStyle` quand l’attribut `style`, `class` ou `data-accent` de `<html>` change (MutationObserver).

Règles du design system à respecter : couleurs uniquement par variables de `tokens.css`, grille de 8 px, rayons 8 / 12 / 16 / 999, accent rare, contraste AA en clair et en sombre, cibles de 44 px et champs de 16 px sur mobile, aucune ombre ni bordure colorée sur une carte, pas de dégradé ni d’emoji, animations coupées avec `prefers-reduced-motion`.

## 3. Publier

```bash
node scripts/build-index.mjs   # vérifie les fiches (dont « niveau ») et régénère registry/index.json
node scripts/serve.mjs         # contrôle sur http://localhost:4000/
git add registry && git commit -m "Ajout : <nom>" && git push
```

Le compteur de la catégorie, la recherche ⌘K et « Derniers ajouts » se mettent à jour seuls.

## Ajouter une catégorie

Ajoutez un objet dans la bonne section de `registry/categories.js` : `id`, `nom`, `description` d’une ligne et `icon` (contenu SVG 24 × 24, trait 1,5 px, `fill="none"`). Elle apparaît dans la navigation, l’accueil et la recherche, avec l’état « Bientôt » tant qu’elle est vide.
