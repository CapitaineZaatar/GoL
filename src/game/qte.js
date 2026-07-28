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
        message: 'Trop lent ! Cerbère t’a échappé, il faut réagir plus tôt.',
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
    const message = angle > tolerance.angleMax
      ? 'Angle trop haut ! Attention à l’épaule.'
      : 'Traction incomplète, va jusqu’à la zone.';
    return { points: 0, quality: 'bad', zone, speedQuality, angle, holdMs, message };
  }

  if (speedQuality === 'jerk') {
    return { points: 3, quality: 'acceptable', zone, speedQuality, angle, holdMs, message: 'À-coup ! Tire plus régulièrement.' };
  }
  if (speedQuality === 'slow') {
    return { points: 3, quality: 'acceptable', zone, speedQuality, angle, holdMs, message: 'Trop lent, garde la tension.' };
  }

  if (zone === 'perfect') {
    return { points: 10, quality: 'perfect', zone, speedQuality, angle, holdMs, message: 'Mouvement parfait !' };
  }
  if (zone === 'good') {
    return { points: 7, quality: 'good', zone, speedQuality, angle, holdMs, message: 'Bonne traction !' };
  }
  return { points: 3, quality: 'acceptable', zone, speedQuality, angle, holdMs, message: 'Acceptable, reste régulier.' };
}
