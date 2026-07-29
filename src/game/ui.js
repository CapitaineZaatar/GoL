import { MOVEMENTS } from './state.js';

function el(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild;
}

export function renderMenu(container, state, { onStart, onSettings, onQuit }) {
  container.innerHTML = '';
  const next = state.nextUnlock();
  const screen = el(`
    <div class="screen menu-screen">
      <div class="profile-badge">
        Niveau <strong>${state.level()}</strong> — ${state.profile.totalXP} XP
        ${next ? `<br/><span style="opacity:0.75">Prochain déblocage : ${next.label} (${next.xp} XP)</span>` : ''}
      </div>
      <div class="menu-title">
        <h1>Hercule vs Cerbère</h1>
        <div class="subtitle">Les Travaux du Héros — Démo QTE</div>
      </div>
      <div class="menu-buttons">
        <button class="brawl-btn" id="btn-start">Lancer un entraînement</button>
        <button class="brawl-btn secondary" id="btn-settings">Paramètres</button>
        <button class="brawl-btn secondary" id="btn-quit">Quitter</button>
      </div>
    </div>
  `);
  container.appendChild(screen);
  screen.querySelector('#btn-start').addEventListener('click', onStart);
  screen.querySelector('#btn-settings').addEventListener('click', onSettings);
  screen.querySelector('#btn-quit').addEventListener('click', onQuit);
}

export function renderConfig(container, state, { onBack, onConfirm, onDashboard }) {
  container.innerHTML = '';
  const cfg = state.config;
  const screen = el(`
    <div class="screen config-screen">
      <div class="panel">
        <h2>Configuration Kinésithérapeute</h2>
        <div class="kicker">Écran caché au patient — à renseigner avant la séance</div>

        <div class="field">
          <label>Mouvement</label>
          <select id="cfg-movement">
            ${MOVEMENTS.map((m) => `<option value="${m.id}" ${m.id === cfg.movement ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>Charge <span class="value" id="val-load">${cfg.loadKg} kg</span></label>
          <input type="range" id="cfg-load" min="1" max="25" step="0.5" value="${cfg.loadKg}" />
        </div>

        <div class="field">
          <label>Séries <span class="value" id="val-series">${cfg.series}</span></label>
          <input type="range" id="cfg-series" min="1" max="6" step="1" value="${cfg.series}" />
        </div>

        <div class="field">
          <label>Répétitions par série <span class="value" id="val-reps">${cfg.reps}</span></label>
          <input type="range" id="cfg-reps" min="4" max="20" step="1" value="${cfg.reps}" />
        </div>

        <div class="toggle-row">
          <div>
            Patient avec douleur d’épaule
            <span class="hint">Réduit automatiquement l’amplitude et resserre la tolérance d’angle</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="cfg-pain" ${cfg.shoulderPain ? 'checked' : ''} />
            <span class="track"></span>
          </label>
        </div>

        <div class="tolerance-note" id="tolerance-note"></div>

        <button type="button" class="dashboard-link" id="btn-dashboard">📊 Voir l'historique des séances (${state.profile.history.length})</button>

        <div class="panel-actions">
          <button class="brawl-btn secondary" id="btn-back">Retour</button>
          <button class="brawl-btn" id="btn-confirm">Valider &amp; commencer</button>
        </div>
        <div class="config-timer" id="cfg-timer">Temps de configuration conseillé : 90 s max</div>
      </div>
    </div>
  `);
  container.appendChild(screen);

  if (onDashboard) {
    screen.querySelector('#btn-dashboard').addEventListener('click', onDashboard);
  }

  const noteEl = screen.querySelector('#tolerance-note');
  function refreshNote() {
    noteEl.textContent = cfg.shoulderPain
      ? 'Amplitude adaptée : 55°–85°, tempo souple accepté (0.48s–1.35s par traction).'
      : 'Amplitude standard : 48°–96°, tempo libre (0.38s–1.6s par traction).';
  }
  refreshNote();

  screen.querySelector('#cfg-movement').addEventListener('change', (e) => { cfg.movement = e.target.value; });
  screen.querySelector('#cfg-load').addEventListener('input', (e) => {
    cfg.loadKg = parseFloat(e.target.value);
    screen.querySelector('#val-load').textContent = `${cfg.loadKg} kg`;
  });
  screen.querySelector('#cfg-series').addEventListener('input', (e) => {
    cfg.series = parseInt(e.target.value, 10);
    screen.querySelector('#val-series').textContent = cfg.series;
  });
  screen.querySelector('#cfg-reps').addEventListener('input', (e) => {
    cfg.reps = parseInt(e.target.value, 10);
    screen.querySelector('#val-reps').textContent = cfg.reps;
  });
  screen.querySelector('#cfg-pain').addEventListener('change', (e) => {
    cfg.shoulderPain = e.target.checked;
    refreshNote();
  });

  let seconds = 90;
  const timerEl = screen.querySelector('#cfg-timer');
  const timerId = setInterval(() => {
    seconds -= 1;
    timerEl.textContent = seconds > 0
      ? `Temps de configuration conseillé : ${seconds}s`
      : 'Temps conseillé dépassé — le patient attend';
    if (seconds <= 0) clearInterval(timerId);
  }, 1000);

  screen.querySelector('#btn-back').addEventListener('click', () => { clearInterval(timerId); onBack(); });
  screen.querySelector('#btn-confirm').addEventListener('click', () => { clearInterval(timerId); onConfirm(); });
}

export function renderGame(container, state) {
  container.innerHTML = '';
  const screen = el(`
    <div class="screen game-screen">
      <div class="hud-top">
        <div class="hud-counter">Série<br/><strong id="hud-series">1 / ${state.config.series}</strong></div>
        <div class="hud-progress">
          <div class="label">Cerbère faiblit</div>
          <div class="gauge-track"><div class="gauge-fill" id="hud-gauge"></div></div>
        </div>
        <div class="hud-counter">Score<br/><strong id="hud-score">0</strong></div>
      </div>

      <div class="subtitle-box" id="hud-subtitle">&nbsp;</div>

      <div class="qte-wrap" id="qte-wrap">
        <div class="qte-bar" id="qte-bar">
          <div class="qte-zone" id="zone-acceptable"></div>
          <div class="qte-zone good" id="zone-good"></div>
          <div class="qte-zone perfect" id="zone-perfect"></div>
          <div class="qte-cursor" id="qte-cursor"></div>
        </div>
        <div class="qte-hint">Appuie et maintiens <kbd>ESPACE</kbd> (ou le bouton) puis relâche dans la zone dorée, sans à-coup.</div>
        <button class="pull-btn" id="pull-btn">Tirer la chaîne</button>
      </div>

      <div class="feedback-flash" id="feedback-flash"></div>
      <div class="warn-arrow" id="warn-arrow">➜</div>

      <div class="set-break hidden" id="set-break">
        <h3 id="set-break-title">Série terminée !</h3>
        <div id="set-break-sub"></div>
      </div>
    </div>
  `);
  container.appendChild(screen);

  const els = {
    series: screen.querySelector('#hud-series'),
    score: screen.querySelector('#hud-score'),
    gauge: screen.querySelector('#hud-gauge'),
    subtitle: screen.querySelector('#hud-subtitle'),
    qteWrap: screen.querySelector('#qte-wrap'),
    zoneAcceptable: screen.querySelector('#zone-acceptable'),
    zoneGood: screen.querySelector('#zone-good'),
    zonePerfect: screen.querySelector('#zone-perfect'),
    cursor: screen.querySelector('#qte-cursor'),
    pullBtn: screen.querySelector('#pull-btn'),
    flash: screen.querySelector('#feedback-flash'),
    warnArrow: screen.querySelector('#warn-arrow'),
    setBreak: screen.querySelector('#set-break'),
    setBreakTitle: screen.querySelector('#set-break-title'),
    setBreakSub: screen.querySelector('#set-break-sub'),
  };

  let flashTimeout = null;
  let arrowTimeout = null;

  return {
    setSubtitle(text) { els.subtitle.textContent = text; },
    setCounter(series, totalSeries, score) {
      els.series.textContent = `${series} / ${totalSeries}`;
      els.score.textContent = score;
    },
    setGauge(pct) { els.gauge.style.width = `${Math.max(0, Math.min(100, pct))}%`; },
    setupZones(tolerance, sweepMaxAngle) {
      const toPct = (v) => (v / sweepMaxAngle) * 100;
      els.zoneAcceptable.style.left = `${toPct(tolerance.angleMin)}%`;
      els.zoneAcceptable.style.width = `${toPct(tolerance.angleMax - tolerance.angleMin)}%`;
      const center = (tolerance.angleMin + tolerance.angleMax) / 2;
      els.zoneGood.style.left = `${toPct(center - tolerance.goodHalfWidth)}%`;
      els.zoneGood.style.width = `${toPct(tolerance.goodHalfWidth * 2)}%`;
      els.zonePerfect.style.left = `${toPct(center - tolerance.perfectHalfWidth)}%`;
      els.zonePerfect.style.width = `${toPct(tolerance.perfectHalfWidth * 2)}%`;
    },
    setCursor(angle, sweepMaxAngle) {
      els.cursor.style.left = `${Math.min(100, (angle / sweepMaxAngle) * 100)}%`;
    },
    setPressed(pressed) { els.pullBtn.classList.toggle('pressed', pressed); },
    flashFeedback(quality, message) {
      clearTimeout(flashTimeout);
      els.flash.textContent = message;
      els.flash.className = `feedback-flash show ${quality}`;
      flashTimeout = setTimeout(() => { els.flash.classList.remove('show'); }, 850);
    },
    showWarnArrow() {
      clearTimeout(arrowTimeout);
      els.warnArrow.classList.add('show');
      arrowTimeout = setTimeout(() => els.warnArrow.classList.remove('show'), 500);
    },
    showSetBreak(title, sub) {
      els.setBreakTitle.textContent = title;
      els.setBreakSub.textContent = sub;
      els.setBreak.classList.remove('hidden');
    },
    hideSetBreak() { els.setBreak.classList.add('hidden'); },
    bindPull({ onPressStart, onPressEnd }) {
      const pd = (e) => { e.preventDefault(); onPressStart(); };
      const pu = (e) => { e.preventDefault(); onPressEnd(); };
      els.pullBtn.addEventListener('pointerdown', pd);
      window.addEventListener('pointerup', pu);
      const kd = (e) => { if (e.code === 'Space') { e.preventDefault(); onPressStart(); } };
      const ku = (e) => { if (e.code === 'Space') { e.preventDefault(); onPressEnd(); } };
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      return () => {
        els.pullBtn.removeEventListener('pointerdown', pd);
        window.removeEventListener('pointerup', pu);
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
      };
    },
  };
}

function qualityLabel(q) {
  return { perfect: 'Parfait', good: 'Bon', acceptable: 'Acceptable', bad: 'Raté' }[q] || q;
}

export function renderRecap(container, state, { entry, progressPct }, { onExport, onReplay, onMenu }) {
  container.innerHTML = '';
  const tally = { perfect: 0, good: 0, acceptable: 0, bad: 0 };
  entry.repsLog.forEach((r) => { tally[r.quality] = (tally[r.quality] || 0) + 1; });

  const next = state.nextUnlock();
  const movementLabel = MOVEMENTS.find((m) => m.id === entry.config.movement)?.label ?? entry.config.movement;
  const progressLine = progressPct === null
    ? 'Première séance enregistrée — sers de référence pour la suite !'
    : progressPct >= 0
      ? `Tu as gagné +${progressPct}% de force par rapport à la dernière séance !`
      : `${Math.abs(progressPct)}% en dessous de la dernière séance, la régularité paie plus que la vitesse.`;

  const screen = el(`
    <div class="screen recap-screen">
      <div class="panel">
        <h2>Quête accomplie</h2>
        <div class="kicker">Hercule vs Cerbère — ${movementLabel}</div>
        <div class="recap-score">${entry.score} points</div>
        <div class="recap-tagline">${progressLine}</div>

        <div class="recap-stats">
          <div class="stat"><span class="n">${entry.completedReps}/${entry.totalReps}</span><span class="l">Répétitions</span></div>
          <div class="stat"><span class="n">${entry.config.loadKg} kg</span><span class="l">Charge</span></div>
          <div class="stat"><span class="n">${tally.perfect}</span><span class="l">Parfaits</span></div>
          <div class="stat"><span class="n">${tally.good}</span><span class="l">Bons</span></div>
          <div class="stat"><span class="n">${tally.acceptable}</span><span class="l">Acceptables</span></div>
          <div class="stat"><span class="n">${tally.bad}</span><span class="l">Ratés</span></div>
        </div>

        <div class="recap-teaser">
          <div class="kicker" style="margin-bottom:0.2rem">Progression</div>
          Niveau <strong>${state.level()}</strong> — ${state.profile.totalXP} XP
          ${next ? `<br/>Prochain déblocage : <strong>${next.label}</strong> (${Math.max(0, next.xp - state.profile.totalXP)} XP restants)` : '<br/>Tous les déblocages actuels sont obtenus !'}
          <br/><br/>Teaser : prochain défi — <strong>Les Écuries d’Augias</strong>, un nouvel univers t’attend.
        </div>

        <div class="panel-actions">
          <button class="brawl-btn secondary" id="btn-export">Exporter (kiné)</button>
          <button class="brawl-btn secondary" id="btn-menu">Menu</button>
          <button class="brawl-btn" id="btn-replay">Rejouer</button>
        </div>
      </div>
    </div>
  `);
  container.appendChild(screen);
  screen.querySelector('#btn-export').addEventListener('click', onExport);
  screen.querySelector('#btn-menu').addEventListener('click', onMenu);
  screen.querySelector('#btn-replay').addEventListener('click', onReplay);
}

function drawScoreChart(canvas, history) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (history.length === 0) return;

  const pad = { l: 34, r: 12, t: 12, b: 22 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const maxScore = Math.max(10, ...history.map((e) => e.score));

  ctx.strokeStyle = 'rgba(232,193,104,0.25)';
  ctx.lineWidth = 1;
  ctx.font = '10px Georgia';
  ctx.fillStyle = 'rgba(240,226,192,0.7)';
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.t + plotH * (1 - i / 4);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillText(Math.round((maxScore * i) / 4), 2, y + 3);
  }

  const points = history.map((entry, i) => {
    const x = history.length === 1 ? pad.l + plotW / 2 : pad.l + (i / (history.length - 1)) * plotW;
    const y = pad.t + plotH * (1 - entry.score / maxScore);
    return { x, y };
  });

  ctx.strokeStyle = '#e8c168';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe6a3';
    ctx.fill();
  });
}

export function renderDashboard(container, state, { onBack, onExportCSV }) {
  container.innerHTML = '';
  const history = state.profile.history;
  const totalSessions = history.length;
  const avgScore = totalSessions ? Math.round(history.reduce((s, e) => s + e.score, 0) / totalSessions) : 0;
  const bestScore = totalSessions ? Math.max(...history.map((e) => e.score)) : 0;

  const rows = history.slice().reverse().slice(0, 12).map((entry) => {
    const d = new Date(entry.date);
    const dateStr = `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    return `<tr><td>${dateStr}</td><td>${entry.score}</td><td>${entry.completedReps}/${entry.totalReps}</td><td>${entry.config.loadKg} kg</td><td>${entry.config.shoulderPain ? 'Oui' : 'Non'}</td></tr>`;
  }).join('');

  const screen = el(`
    <div class="screen config-screen">
      <div class="panel dashboard-panel">
        <h2>Espace Kinésithérapeute</h2>
        <div class="kicker">Historique et progression du patient</div>

        <div class="recap-stats" style="margin-bottom:1.2rem">
          <div class="stat"><span class="n">${totalSessions}</span><span class="l">Séances</span></div>
          <div class="stat"><span class="n">${state.level()}</span><span class="l">Niveau patient</span></div>
          <div class="stat"><span class="n">${avgScore}</span><span class="l">Score moyen</span></div>
          <div class="stat"><span class="n">${bestScore}</span><span class="l">Meilleur score</span></div>
        </div>

        ${totalSessions ? '<canvas id="score-chart" class="score-chart"></canvas>' : '<p class="hint">Aucune séance enregistrée pour l’instant.</p>'}

        ${totalSessions ? `
        <div class="history-table-wrap">
          <table class="history-table">
            <thead><tr><th>Date</th><th>Score</th><th>Reps</th><th>Charge</th><th>Douleur</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : ''}

        <div class="panel-actions">
          <button class="brawl-btn secondary" id="btn-export-csv" ${totalSessions ? '' : 'disabled'}>Exporter CSV</button>
          <button class="brawl-btn" id="btn-dash-back">Retour</button>
        </div>
      </div>
    </div>
  `);
  container.appendChild(screen);

  if (totalSessions) {
    const canvas = screen.querySelector('#score-chart');
    requestAnimationFrame(() => drawScoreChart(canvas, history));
  }

  screen.querySelector('#btn-dash-back').addEventListener('click', onBack);
  screen.querySelector('#btn-export-csv').addEventListener('click', onExportCSV);
}

export { qualityLabel };
