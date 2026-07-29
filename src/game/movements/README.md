# Mouvements

Un « mouvement » est un exercice de rééducation jouable (Face-Pull, Élévations
latérales, …). Ajouter un nouvel exercice ne doit toucher **aucun** fichier
en dehors de ce dossier (plus `index.js` pour l'enregistrer).

## Pourquoi ce découpage

Avant ce refactor, chaque exercice ajoutait une branche
`if (state.config.movement === '...')` dans `main.js` (4 endroits),
`characters.js` (une méthode de pose par exercice) et `qte.js` (messages en
dur). Au 3e ou 4e exercice, ce pattern devient impossible à maintenir sans
casser les précédents.

Séparation retenue :

- **`characters.js`** (le rig) : ne connaît que des angles de squelette
  (`setArmPose`, `setTorsoPose`, `setHeadRotation`, …). Il ignore
  totalement l'existence des exercices.
- **`movements/*.js`** (la chorégraphie) : chaque exercice pilote le rig et
  déclare tout ce qui lui est propre.
- **`qte.js`** (la mécanique de notation) : reste générique, ne renvoie que
  des faits (`zone`, `speedQuality`, `messageKey`) — jamais de texte.
- **`main.js`** (l'orchestrateur) : ne fait plus aucune comparaison sur
  `state.config.movement`. Il délègue au mouvement actif via l'interface
  ci-dessous.

## Interface d'un mouvement

Une factory `createXMovement()` (état interne dans une fermeture, pas de
classe nécessaire) retourne :

| Champ | Rôle |
|---|---|
| `id`, `label` | identifiant + libellé affiché dans l'écran de config |
| `narrative.grip` | sous-titre affiché à l'entrée en jeu |
| `narrative.cue` | sous-titre affiché juste avant la 1ère répétition |
| `messages` | dictionnaire `messageKey -> texte FR` pour chaque issue possible du QTE (`missHigh`, `missLow`, `timeout`, `jerk`, `slow`, `perfect`, `good`, `acceptable`) |
| `buildConnectors(gradientMap)` | crée les chaînes/cordes visuelles nécessaires, retourne `{ [id]: chainInstance }` |
| `restPose({ hercules, cerberus })` | replace les deux personnages en position neutre |
| `animate(t, dt, { hercules, cerberus })` | appelé à chaque frame avec `t` = progression QTE normalisée (0..1) ; pilote le rig et retourne `{ [connectorId]: [pointA, pointB] }` pour chaque connecteur déclaré |
| `onRepEnd(result, { hercules, cerberus })` | appelé une fois à la fin de chaque répétition (hook pour un effet propre à l'exercice, ex. le crash des têtes) |

Voir `facePull.js` (le plus simple) et `lateralRaise.js` (utilise
`onRepEnd` + état interne pour l'animation d'impact post-répétition).

## Ajouter un exercice

1. Créer `movements/monExercice.js` qui implémente l'interface ci-dessus.
2. L'enregistrer dans `movements/index.js`.
3. Si le rig actuel (`characters.js`) ne permet pas la pose voulue, ajouter
   un setter générique de joint (jamais une méthode nommée d'après
   l'exercice).

Rien d'autre à modifier.
