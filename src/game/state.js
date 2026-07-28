const STORAGE_KEY = 'hc_qte_demo_profile_v1';

export const MOVEMENTS = {
  face_pull: { id: 'face_pull', label: 'Face-Pull (tirage horizontal épaule)' },
};

export const UNLOCKS = [
  { xp: 0, id: 'arene_grece', label: 'Arène : Grèce Antique', type: 'Univers' },
  { xp: 150, id: 'skin_bronze', label: 'Armure de Bronze', type: 'Skin Hercule' },
  { xp: 400, id: 'cerbere_ombre', label: 'Cerbère des Ombres', type: 'Variante Cerbère' },
  { xp: 900, id: 'univers_augias', label: 'Les Écuries d’Augias', type: 'Prochain Univers' },
  { xp: 1600, id: 'skin_or', label: 'Armure Dorée du Héros', type: 'Skin Hercule' },
];

function defaultConfig() {
  return {
    movement: 'face_pull',
    loadKg: 8,
    series: 3,
    reps: 12,
    shoulderPain: true,
  };
}

function computeTolerance(config) {
  return config.shoulderPain
    ? { angleMin: 55, angleMax: 85, perfectHalfWidth: 6, goodHalfWidth: 13, minHoldMs: 480, maxHoldMs: 1350 }
    : { angleMin: 48, angleMax: 96, perfectHalfWidth: 8, goodHalfWidth: 17, minHoldMs: 380, maxHoldMs: 1600 };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    /* localStorage indisponible ou corrompu : on repart d'un profil neuf */
  }
  return { totalXP: 0, history: [] };
}

export class GameState {
  constructor() {
    this.config = defaultConfig();
    this.profile = loadProfile();
    this.session = null;
  }

  saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (err) {
      /* stockage plein ou bloqué : la session continue sans persistance */
    }
  }

  level() {
    return 1 + Math.floor(this.profile.totalXP / 500);
  }

  nextUnlock() {
    return UNLOCKS.find((u) => u.xp > this.profile.totalXP) || null;
  }

  unlockedSoFar() {
    return UNLOCKS.filter((u) => u.xp <= this.profile.totalXP);
  }

  startSession() {
    this.session = {
      tolerance: computeTolerance(this.config),
      currentSeries: 1,
      currentRep: 1,
      totalReps: this.config.series * this.config.reps,
      completedReps: 0,
      score: 0,
      repsLog: [],
      startedAt: Date.now(),
    };
    return this.session;
  }

  recordRep(result) {
    this.session.score += result.points;
    this.session.repsLog.push(result);
    this.session.completedReps += 1;
  }

  advanceRep() {
    const s = this.session;
    if (s.currentRep >= this.config.reps) {
      s.currentRep = 1;
      s.currentSeries += 1;
    } else {
      s.currentRep += 1;
    }
    return s.currentSeries > this.config.series;
  }

  finishSession() {
    const previous = this.profile.history[this.profile.history.length - 1];
    const progressPct = previous && previous.score > 0
      ? Math.round(((this.session.score - previous.score) / previous.score) * 100)
      : null;

    const entry = {
      date: Date.now(),
      score: this.session.score,
      config: { ...this.config },
      completedReps: this.session.completedReps,
      totalReps: this.session.totalReps,
      repsLog: this.session.repsLog,
    };

    this.profile.history.push(entry);
    this.profile.totalXP += this.session.score;
    this.saveProfile();

    return { entry, progressPct };
  }

  exportLastSessionJSON() {
    const entry = this.profile.history[this.profile.history.length - 1];
    if (!entry) return null;
    return JSON.stringify(entry, null, 2);
  }

  exportHistoryCSV() {
    const header = 'date,score,completedReps,totalReps,mouvement,chargeKg,series,repsParSerie,douleurEpaule,parfaits,bons,acceptables,rates';
    const rows = this.profile.history.map((entry) => {
      const tally = { perfect: 0, good: 0, acceptable: 0, bad: 0 };
      entry.repsLog.forEach((r) => { tally[r.quality] = (tally[r.quality] || 0) + 1; });
      return [
        new Date(entry.date).toISOString(),
        entry.score,
        entry.completedReps,
        entry.totalReps,
        entry.config.movement,
        entry.config.loadKg,
        entry.config.series,
        entry.config.reps,
        entry.config.shoulderPain,
        tally.perfect,
        tally.good,
        tally.acceptable,
        tally.bad,
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }
}
