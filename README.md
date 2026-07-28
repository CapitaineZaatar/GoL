# Hercule vs Cerbère — Démo QTE Kiné

Petite démo jouable dans le navigateur : un QTE narratif de rééducation
(mouvement Face-Pull) habillé dans un univers grec antique, style plan fixe
3D stylisé façon Naruto Ultimate Ninja Storm / Street Fighter 6.

## Lancer la démo

```bash
npm install
npm run dev
```

Ouvrir l'URL affichée (par défaut http://localhost:5173).

Build de production : `npm run build` (sortie dans `dist/`).

## Parcours

1. **Écran d'accueil** — Lancer un entraînement / Paramètres / Quitter.
2. **Paramètres (écran kiné)** — mouvement, charge, séries, répétitions,
   douleur d'épaule (ajuste automatiquement la tolérance d'angle).
3. **Quête** — Hercule tient la chaîne de Cerbère. À chaque répétition,
   maintenir `ESPACE` (ou le bouton "Tirer la chaîne") et relâcher dans la
   zone dorée, sans à-coup ni lenteur excessive :
   - Parfait = 10 pts, Bon = 7 pts, Acceptable = 3 pts, Raté = 0 pt (jamais
     bloquant, la foule réagit et une flèche rouge prévient en cas d'erreur).
4. **Récap de séance** — score, statistiques, progression XP par rapport à
   la séance précédente (sauvegardée en `localStorage`), export JSON pour le
   kiné, teaser du prochain univers ("Les Écuries d'Augias").

## Structure

- `src/game/state.js` — état du jeu, config kiné, XP/déblocages, persistance.
- `src/game/qte.js` — moteur du QTE (angle, tempo, scoring).
- `src/game/scene.js` — arène 3D, éclairage, foule, caméra fixe.
- `src/game/characters.js` — Hercule, Cerbère et la chaîne, construits en
  primitives Three.js avec un rendu toon (cel-shading).
- `src/game/ui.js` — écrans HTML/CSS (menu, config, HUD, récap).
- `src/main.js` — orchestration (machine à états + boucle de jeu).
