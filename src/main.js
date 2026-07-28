import './style.css';
import * as THREE from 'three';
import { GameState } from './game/state.js';
import { initScene } from './game/scene.js';
import { createHercules, createCerberus, buildChain } from './game/characters.js';
import { QTEEngine, SWEEP_MAX_ANGLE } from './game/qte.js';
import { renderMenu, renderConfig, renderGame, renderRecap, renderDashboard } from './game/ui.js';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui-root');
const state = new GameState();

const { scene, camera, renderer, gradientMap, resize, updateFrame, triggerCrowdReaction, kickCamera } = initScene(canvas);

const hercules = createHercules(gradientMap);
hercules.group.position.set(-1.7, 0, 0);
hercules.group.rotation.y = Math.PI / 2.5;
scene.add(hercules.group);

const cerberus = createCerberus(gradientMap);
const cerberusBaseX = 1.9;
cerberus.group.position.set(cerberusBaseX, 0, 0);
scene.add(cerberus.group);

const chain = buildChain(gradientMap);
scene.add(chain.group);

function resizeAll() { resize(); }
window.addEventListener('resize', resizeAll);
resizeAll();

let poseCurrent = 0;
let poseTarget = 0;
let lurch = 0;
let retreat = 0;

function animate(now) {
  const dt = Math.min(48, now - (animate.last || now));
  animate.last = now;
  updateFrame(dt);

  poseCurrent += (poseTarget - poseCurrent) * 0.18;
  hercules.setPullPose(poseCurrent);
  cerberus.strain(poseCurrent);

  lurch = Math.max(0, lurch - dt * 0.0022);
  cerberus.lurch(lurch);
  cerberus.group.position.x = cerberusBaseX + retreat * 0.85;

  const handR = hercules.handWorldPosition('right');
  const handL = hercules.handWorldPosition('left');
  const mid = handR.add(handL).multiplyScalar(0.5);
  const collarPos = cerberus.collarWorldPosition();
  chain.update(mid, collarPos);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function clearUI() { uiRoot.innerHTML = ''; }

function goMenu() {
  poseTarget = 0; retreat = 0; lurch = 0;
  clearUI();
  renderMenu(uiRoot, state, {
    onStart: goConfig,
    onSettings: goConfig,
    onQuit: goQuit,
  });
}

function goQuit() {
  clearUI();
  uiRoot.innerHTML = `
    <div class="screen menu-screen" style="justify-content:center">
      <div class="panel" style="text-align:center">
        <h2>À bientôt, héros</h2>
        <p>Tu peux fermer cet onglet. Séance sauvegardée localement.</p>
        <div class="panel-actions"><button class="brawl-btn" id="btn-return">Retour au menu</button></div>
      </div>
    </div>`;
  uiRoot.querySelector('#btn-return').addEventListener('click', goMenu);
}

function goConfig() {
  clearUI();
  renderConfig(uiRoot, state, {
    onBack: goMenu,
    onConfirm: () => goGame(),
    onDashboard: goDashboard,
  });
}

function goDashboard() {
  clearUI();
  renderDashboard(uiRoot, state, {
    onBack: goConfig,
    onExportCSV: () => exportHistoryCSV(),
  });
}

function exportHistoryCSV() {
  const csv = state.exportHistoryCSV();
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historique-hercule-cerbere-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let gameHud = null;
let qte = null;
let unbindPull = null;
let repTimer = null;

function goGame() {
  clearUI();
  state.startSession();
  poseTarget = 0; retreat = 0; lurch = 0;
  gameHud = renderGame(uiRoot, state);
  gameHud.setCounter(1, state.config.series, 0);
  gameHud.setGauge(0);
  gameHud.setSubtitle('Hercule empoigne la chaîne… Cerbère s’éveille.');
  cerberus.restPose();
  hercules.restPose();

  unbindPull = gameHud.bindPull({
    onPressStart: () => { if (qte) { qte.pressStart(); gameHud.setPressed(true); } },
    onPressEnd: () => {
      if (!qte) return;
      const result = qte.pressEnd();
      gameHud.setPressed(false);
      if (result) handleRepResult(result);
    },
  });

  repTimer = setTimeout(() => {
    gameHud.setSubtitle('« Hercule, retiens Cerbère ! Tire fort... mais sans à-coups ! »');
    repTimer = setTimeout(startRep, 2600);
  }, 1400);
}

function startRep() {
  qte = new QTEEngine(state.session.tolerance);
  qte.startRep();
  gameHud.setupZones(state.session.tolerance, SWEEP_MAX_ANGLE);
  gameHud.setSubtitle(`Série ${state.session.currentSeries} — Répétition ${state.session.currentRep}/${state.config.reps}`);
}

function qteFrame(dt) {
  if (!qte || !qte.isActive) return;
  const result = qte.update(dt);
  gameHud.setCursor(qte.currentAngle, SWEEP_MAX_ANGLE);
  poseTarget = qte.currentAngle / SWEEP_MAX_ANGLE;
  if (result) handleRepResult(result);
}

function handleRepResult(result) {
  qte = null;
  state.recordRep(result);
  gameHud.flashFeedback(result.quality, result.message);
  gameHud.setCounter(state.session.currentSeries, state.config.series, state.session.score);

  const maxPossible = state.session.totalReps * 10;
  const gaugePct = (state.session.score / maxPossible) * 100;
  gameHud.setGauge(gaugePct);
  retreat = gaugePct / 100;

  if (result.quality === 'bad') {
    gameHud.showWarnArrow();
    triggerCrowdReaction('boo');
    lurch = 1;
    kickCamera(0.5);
  } else {
    triggerCrowdReaction('cheer');
    kickCamera(result.quality === 'perfect' ? 1.1 : 0.5);
  }

  poseTarget = 0;

  repTimer = setTimeout(() => {
    const finished = state.advanceRep();
    if (finished) {
      goRecap();
    } else if (state.session.currentRep === 1) {
      gameHud.showSetBreak(
        `Série ${state.session.currentSeries - 1} terminée !`,
        `${state.session.score} points cumulés — encore ${state.config.series - state.session.currentSeries + 1} série(s).`,
      );
      repTimer = setTimeout(() => {
        gameHud.hideSetBreak();
        startRep();
      }, 1700);
    } else {
      startRep();
    }
  }, 900);
}

function goRecap() {
  clearUI();
  if (unbindPull) { unbindPull(); unbindPull = null; }
  clearTimeout(repTimer);
  qte = null;
  poseTarget = 0; lurch = 0;
  const { entry, progressPct } = state.finishSession();
  renderRecap(uiRoot, state, { entry, progressPct }, {
    onExport: () => exportSession(),
    onReplay: () => goGame(),
    onMenu: () => goMenu(),
  });
}

function exportSession() {
  const json = state.exportLastSessionJSON();
  if (!json) return;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seance-hercule-cerbere-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let lastQteTick = performance.now();
function qteLoop(now) {
  const dt = now - lastQteTick;
  lastQteTick = now;
  qteFrame(dt);
  requestAnimationFrame(qteLoop);
}
requestAnimationFrame(qteLoop);

goMenu();
