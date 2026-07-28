import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QTEEngine, evaluateRelease, SWEEP_DURATION_MS, SWEEP_MAX_ANGLE } from './qte.js';

// Matches computeTolerance({ shoulderPain: true }) in state.js
const tolerance = {
  angleMin: 55,
  angleMax: 85,
  perfectHalfWidth: 6,
  goodHalfWidth: 13,
  minHoldMs: 480,
  maxHoldMs: 1350,
};

test('evaluateRelease: centered angle with controlled tempo is perfect', () => {
  const result = evaluateRelease(tolerance, 70, 800);
  assert.equal(result.quality, 'perfect');
  assert.equal(result.points, 10);
  assert.equal(result.zone, 'perfect');
});

test('evaluateRelease: angle within the good band is a good rep', () => {
  const result = evaluateRelease(tolerance, 80, 800);
  assert.equal(result.quality, 'good');
  assert.equal(result.points, 7);
  assert.equal(result.zone, 'good');
});

test('evaluateRelease: angle at the edge of the tolerance is acceptable', () => {
  const result = evaluateRelease(tolerance, 85, 800);
  assert.equal(result.quality, 'acceptable');
  assert.equal(result.points, 3);
  assert.equal(result.zone, 'acceptable');
});

test('evaluateRelease: releasing too fast is a jerk, even in the perfect zone', () => {
  const result = evaluateRelease(tolerance, 70, 200);
  assert.equal(result.quality, 'acceptable');
  assert.equal(result.points, 3);
  assert.equal(result.speedQuality, 'jerk');
});

test('evaluateRelease: holding too long is too slow, even in the perfect zone', () => {
  const result = evaluateRelease(tolerance, 70, 2000);
  assert.equal(result.quality, 'acceptable');
  assert.equal(result.points, 3);
  assert.equal(result.speedQuality, 'slow');
});

test('evaluateRelease: undershooting the angle is a miss with no penalty points', () => {
  const result = evaluateRelease(tolerance, 40, 800);
  assert.equal(result.quality, 'bad');
  assert.equal(result.points, 0);
  assert.equal(result.zone, 'miss');
  assert.match(result.message, /incomplète/);
});

test('evaluateRelease: overshooting the angle warns about the shoulder', () => {
  const result = evaluateRelease(tolerance, 95, 800);
  assert.equal(result.quality, 'bad');
  assert.equal(result.points, 0);
  assert.equal(result.zone, 'miss');
  assert.match(result.message, /haut/);
});

test('QTEEngine: press then release reports the angle and hold duration reached', () => {
  const engine = new QTEEngine(tolerance);
  engine.startRep();

  engine.update(500); // sweep runs before the patient reacts
  engine.pressStart();
  engine.update(800); // patient holds the pull
  const result = engine.pressEnd();

  assert.ok(result);
  assert.equal(result.holdMs, 800);
  assert.ok(Math.abs(result.angle - (1300 / SWEEP_DURATION_MS) * SWEEP_MAX_ANGLE) < 0.001);
  assert.equal(engine.isActive, false);
});

test('QTEEngine: never pulling in time auto-resolves as a miss', () => {
  const engine = new QTEEngine(tolerance);
  engine.startRep();

  let result = null;
  for (let elapsed = 0; elapsed < SWEEP_DURATION_MS + 100 && !result; elapsed += 100) {
    result = engine.update(100);
  }

  assert.ok(result);
  assert.equal(result.points, 0);
  assert.equal(result.zone, 'miss');
});
