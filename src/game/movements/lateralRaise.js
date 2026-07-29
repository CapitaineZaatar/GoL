import { buildChain, CERBERUS_SIDE_HEAD_REST_ANGLE } from '../characters.js';

const SPREAD_MAX_ANGLE = 1.4; // écartement max des têtes latérales, spécifique à cet exercice
const CRASH_DECAY_PER_MS = 0.0035;

/**
 * Élévations latérales : Hercule empoigne les deux têtes annexes de Cerbère
 * et les écarte à l'horizontale. Au relâché, il les écrase violemment sur
 * la tête centrale avant d'enchaîner la répétition suivante.
 *
 * Contrat d'un mouvement, voir movements/README.md.
 */
export function createLateralRaiseMovement() {
  // État interne à l'instance : le "crash" est une animation post-répétition
  // indépendante de t, elle vit dans la fermeture plutôt que dans main.js.
  let crashPulse = 0;

  return {
    id: 'lateral_raise',
    label: 'Élévations latérales',

    narrative: {
      grip: 'Hercule empoigne les deux têtes de Cerbère… la troisième gronde au centre.',
      cue: '« Hercule, écarte-les bien droit... puis frappe les têtes l’une contre l’autre ! »',
    },

    messages: {
      missHigh: 'Amplitude trop grande ! Attention à l’épaule.',
      missLow: 'Élévation incomplète, monte jusqu’à la zone.',
      timeout: 'Trop lent ! Cerbère t’a échappé, il faut réagir plus tôt.',
      jerk: 'À-coup ! Écarte plus régulièrement.',
      slow: 'Trop lent, garde la tension.',
      perfect: 'Écartement parfait !',
      good: 'Belle élévation !',
      acceptable: 'Acceptable, reste régulier.',
    },

    buildConnectors(gradientMap) {
      return {
        left: buildChain(gradientMap, { linkCount: 7, radius: 0.075, tube: 0.032 }),
        right: buildChain(gradientMap, { linkCount: 7, radius: 0.075, tube: 0.032 }),
      };
    },

    restPose({ hercules, cerberus }) {
      hercules.restPose();
      cerberus.restPose();
      crashPulse = 0;
    },

    animate(t, dt, { hercules, cerberus }) {
      const c = Math.min(1, Math.max(0, t));

      hercules.setArmPose('left', { shoulderZ: -c * (Math.PI / 2) * 0.9, shoulderX: 0.05, elbowX: 0.12 });
      hercules.setArmPose('right', { shoulderZ: c * (Math.PI / 2) * 0.9, shoulderX: 0.05, elbowX: 0.12 });
      hercules.setTorsoPose({ leanX: c * 0.08 });

      // Par défaut, l'écartement des têtes suit l'élévation des bras (0..1).
      // Après le relâché, `crashPulse` prend la main pour l'impact violent.
      let spread = c;
      if (crashPulse > 0) {
        crashPulse = Math.max(0, crashPulse - dt * CRASH_DECAY_PER_MS);
        const impact = Math.sin(crashPulse * Math.PI);
        spread = -impact;
        cerberus.setHeadRotation('center', { x: -0.1 - impact * 0.55 });
      } else {
        cerberus.setHeadRotation('center', { x: 0 });
      }

      const angle = spread >= 0
        ? CERBERUS_SIDE_HEAD_REST_ANGLE + spread * (SPREAD_MAX_ANGLE - CERBERUS_SIDE_HEAD_REST_ANGLE)
        : CERBERUS_SIDE_HEAD_REST_ANGLE * (1 + spread);
      cerberus.setHeadRotation('left', { y: -angle });
      cerberus.setHeadRotation('right', { y: angle });

      return {
        left: [hercules.handWorldPosition('left'), cerberus.headWorldPosition('left')],
        right: [hercules.handWorldPosition('right'), cerberus.headWorldPosition('right')],
      };
    },

    onRepEnd() {
      crashPulse = 1;
    },
  };
}
