import { createFacePullMovement } from './facePull.js';
import { createLateralRaiseMovement } from './lateralRaise.js';

/**
 * Registre unique des exercices jouables. C'est la seule liste à mettre à
 * jour pour ajouter/retirer un exercice (l'écran de config en dérive ses
 * options, voir state.js#MOVEMENTS). `id` et `label` restent définis une
 * seule fois, dans le module de chaque mouvement — pas dupliqués ici : on
 * instancie chaque factory une fois au chargement pour lire ses métadonnées.
 */
const REGISTERED = [createFacePullMovement, createLateralRaiseMovement]
  .map((factory) => ({ meta: factory(), factory }));

export const MOVEMENT_IDS = REGISTERED.map((entry) => entry.meta.id);

export function createMovement(id) {
  const entry = REGISTERED.find((e) => e.meta.id === id) ?? REGISTERED[0];
  return entry.factory();
}

/** Libellés pour peupler le <select> de l'écran de configuration. */
export function listMovementOptions() {
  return REGISTERED.map((entry) => ({ id: entry.meta.id, label: entry.meta.label }));
}
