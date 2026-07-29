export const SWEEP_DURATION_MS = 2200;
export const SWEEP_MAX_ANGLE = 130;

const PHASE_WAITING = 'waiting';
const PHASE_HOLDING = 'holding';
const PHASE_DONE = 'done';

export class QTEEngine {
  constructor(tolerance) {
    this.tolerance = tolerance;
    this.phase = PHASE_WAITING;
    this.elapsedMs = 0;
    this.pressStartMs = null;
    this.angle = 0;
  }

  startRep() {
    this.phase = PHASE_WAITING;
    this.elapsedMs = 0;
    this.pressStartMs = null;
    this.angle = 0;
  }

  get isActive() {
    return this.phase !== PHASE_DONE;
  }

  get currentAngle() {
    return this.angle;
  }

  /** Avance la simulation. Retourne un résultat de rep si le temps est écoulé, sinon null. */
  update(dtMs) {
    if (this.phase === PHASE_DONE) return null;
    this.elapsedMs += dtMs;
    this.angle = Math.min(SWEEP_MAX_ANGLE, (this.elapsedMs / SWEEP_DURATION_MS) * SWEEP_MAX_ANGLE);

    if (this.phase === PHASE_HOLDING && this.angle >= SWEEP_MAX_ANGLE) {
      return this._conclude(SWEEP_MAX_ANGLE, this.elapsedMs);
    }
    if (this.phase === PHASE_WAITING && this.elapsedMs >= SWEEP_DURATION_MS) {
      this.phase = PHASE_DONE;
      return {
        points: 0,
        quality: 'bad',
        zone: 'miss',
        speedQuality: 'none',
        angle: 0,
        holdMs: 0,
        messageKey: 'timeout',
      };
    }
    return null;
  }

  pressStart() {
    if (this.phase !== PHASE_WAITING) return;
    this.phase = PHASE_HOLDING;
    this.pressStartMs = this.elapsedMs;
  }

  pressEnd() {
    if (this.phase !== PHASE_HOLDING) return null;
    return this._conclude(this.angle, this.elapsedMs);
  }

  _conclude(angleAtRelease, releaseElapsedMs) {
    const holdMs = releaseElapsedMs - this.pressStartMs;
    const result = evaluateRelease(this.tolerance, angleAtRelease, holdMs);
    this.phase = PHASE_DONE;
    return result;
  }
}

/**
 * Évalue une répétition. Ne retourne que des faits mécaniques (zone, vitesse,
 * points) et une `messageKey` neutre — jamais de texte. Le texte affiché au
 * patient est propre à chaque exercice et vit dans le dictionnaire
 * `messages` du mouvement actif (voir src/game/movements/).
 */
export function evaluateRelease(tolerance, angle, holdMs) {
  const center = (tolerance.angleMin + tolerance.angleMax) / 2;
  const dist = Math.abs(angle - center);

  let zone;
  if (angle < tolerance.angleMin || angle > tolerance.angleMax) zone = 'miss';
  else if (dist <= tolerance.perfectHalfWidth) zone = 'perfect';
  else if (dist <= tolerance.goodHalfWidth) zone = 'good';
  else zone = 'acceptable';

  let speedQuality;
  if (holdMs < tolerance.minHoldMs) speedQuality = 'jerk';
  else if (holdMs > tolerance.maxHoldMs) speedQuality = 'slow';
  else speedQuality = 'ok';

  if (zone === 'miss') {
    const messageKey = angle > tolerance.angleMax ? 'missHigh' : 'missLow';
    return { points: 0, quality: 'bad', zone, speedQuality, angle, holdMs, messageKey };
  }

  if (speedQuality === 'jerk') {
    return { points: 3, quality: 'acceptable', zone, speedQuality, angle, holdMs, messageKey: 'jerk' };
  }
  if (speedQuality === 'slow') {
    return { points: 3, quality: 'acceptable', zone, speedQuality, angle, holdMs, messageKey: 'slow' };
  }

  if (zone === 'perfect') {
    return { points: 10, quality: 'perfect', zone, speedQuality, angle, holdMs, messageKey: 'perfect' };
  }
  if (zone === 'good') {
    return { points: 7, quality: 'good', zone, speedQuality, angle, holdMs, messageKey: 'good' };
  }
  return { points: 3, quality: 'acceptable', zone, speedQuality, angle, holdMs, messageKey: 'acceptable' };
}
