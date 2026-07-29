import { buildChain } from '../characters.js';

/**
 * Face-Pull : Hercule tire une chaîne à deux mains vers son visage,
 * Cerbère résiste en tendant ses trois têtes vers l'avant.
 *
 * Contrat d'un mouvement, voir movements/README.md.
 */
export function createFacePullMovement() {
  return {
    id: 'face_pull',
    label: 'Face-Pull (tirage horizontal épaule)',

    narrative: {
      grip: 'Hercule empoigne la chaîne… Cerbère s’éveille.',
      cue: '« Hercule, retiens Cerbère ! Tire fort... mais sans à-coups ! »',
    },

    messages: {
      missHigh: 'Angle trop haut ! Attention à l’épaule.',
      missLow: 'Traction incomplète, va jusqu’à la zone.',
      timeout: 'Trop lent ! Cerbère t’a échappé, il faut réagir plus tôt.',
      jerk: 'À-coup ! Tire plus régulièrement.',
      slow: 'Trop lent, garde la tension.',
      perfect: 'Mouvement parfait !',
      good: 'Bonne traction !',
      acceptable: 'Acceptable, reste régulier.',
    },

    buildConnectors(gradientMap) {
      return { chain: buildChain(gradientMap, { linkCount: 13, radius: 0.1, tube: 0.045 }) };
    },

    restPose({ hercules, cerberus }) {
      hercules.restPose();
      cerberus.restPose();
    },

    animate(t, dt, { hercules, cerberus }) {
      const c = Math.min(1, Math.max(0, t));

      hercules.setArmPose('left', { shoulderX: 0.1 - c * 2.1, elbowX: 0.2 + c * 1.3 });
      hercules.setArmPose('right', { shoulderX: 0.1 - c * 2.1, elbowX: 0.2 + c * 1.3 });
      hercules.setTorsoPose({ leanX: -c * 0.22 });
      hercules.setHipsPose({ z: c * 0.12 });

      ['center', 'left', 'right'].forEach((headId, i) => {
        cerberus.setHeadRotation(headId, {
          x: -0.15 - c * 0.3 + Math.sin(Date.now() * 0.004 + i) * 0.03,
        });
      });

      const handR = hercules.handWorldPosition('right');
      const handL = hercules.handWorldPosition('left');
      const mid = handR.add(handL).multiplyScalar(0.5);
      return { chain: [mid, cerberus.collarWorldPosition()] };
    },

    onRepEnd() {
      // Rien de spécifique : le retour au repos suffit pour ce mouvement.
    },
  };
}
