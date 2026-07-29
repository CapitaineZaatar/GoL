import './style.css';
import { GameState } from './game/state.js';
import { initScene } from './game/scene.js';
import { createHercules, createCerberus } from './game/characters.js';
import { addOutline } from './game/toon.js';
import { createMovement } from './game/movements/index.js';
import { QTEEngine, SWEEP_MAX_ANGLE } from './game/qte.js';
import { renderMenu, renderConfig, renderGame, renderRecap, renderDashboard } from './game/ui.js';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui-root');
const state = new GameState();

const { scene, gradientMap, resize, updateFrame, triggerCrowdReaction, kickCamera, render, setCameraPreset, cameraPresetCount } = initScene(canvas);

const hercules = createHercules(gradientMap);
hercules.group.position.set(-2, 0, 0);
hercules.group.rotation.y = Math.PI / 2;
addOutline(hercules.group);
scene.add(hercules.group);

const cerberus = createCerberus(gradientMap);
const cerberusBaseX = 3.4;
cerberus.group.position.set(cerberusBaseX, 0, -0.4);
addOutline(cerberus.group, { thickness: 0.05 });
scene.add(cerberus.group);

const rig = { hercules, cerberus };

// Le mouvement actif possède seul la connaissance de l'exercice en cours
// (pose, connecteurs visuels, narration, messages). Voir game/movements/README.md.
let activeMovement = null;
let connectors = {};

function disposeConnectors() {
  Object.values(connectors).forEach((connector) => {
    scene.remove(connector.group);
    connector.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
  });
  connectors = {};
}

function setActiveMovement(movementId) {
  disposeConnectors();
  activeMovement = createMovement(movementId);
  connectors = activeMovement.buildConnectors(gradientMap);
  Object.values(connectors).forEach((connector) => scene.add(connector.group));
}

setActiveMovement(state.config.movement);

function resizeAll() { resize(); }
window.addEventListener('resize', resizeAll);
resizeAll();

let poseCurrent = 0;
let poseTarget = 0;
let lurch = 0;
let retreat = 0;
let impactPulse = 0;
let repCounter = 0;

function animate(now) {
  const dt = Math.min(48, now - (animate.last || now));
  animate.last = now;
  updateFrame(dt);

  poseCurrent += (poseTarget - poseCurrent) * 0.18;

  lurch = Math.max(0, lurch - dt * 0.0022);
  cerberus.lurch(lurch);
  cerberus.group.position.x = cerberusBaseX + retreat * 0.85;

  if (impactPulse > 0) {
    impactPulse = Math.max(0, impactPulse - dt * 0.006);
    const bounce = 1 + Math.sin(impactPulse * Math.PI) * 0.06;
    hercules.group.scale.setScalar(bounce);
  }

  const anchors = activeMovement.animate(poseCurrent, dt, rig);
  Object.entries(anchors).forEach(([connectorId, [from, to]]) => {
    connectors[connectorId]?.update(from, to);
  });

  render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function clearUI() { uiRoot.innerHTML = ''; }

function goMenu() {
  poseTarget = 0; retreat = 0; lurch = 0;
  setCameraPreset(0);
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
  setActiveMovement(state.config.movement);
  poseTarget = 0; retreat = 0; lurch = 0; repCounter = 0;
  gameHud = renderGame(uiRoot, state);
  gameHud.setCounter(1, state.config.series, 0);
  gameHud.setGauge(0);
  activeMovement.restPose(rig);
  setCameraPreset(0);
  gameHud.setSubtitle(activeMovement.narrative.grip);

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
    gameHud.setSubtitle(activeMovement.narrative.cue);
    repTimer = setTimeout(startRep, 2600);
  }, 1400);
}

function startRep() {
  qte = new QTEEngine(state.session.tolerance);
  qte.startRep();
  gameHud.setupZones(state.session.tolerance, SWEEP_MAX_ANGLE);
  gameHud.setSubtitle(`Série ${state.session.currentSeries} — Répétition ${state.session.currentRep}/${state.config.reps}`);
  setCameraPreset(repCounter % cameraPresetCount);
  repCounter += 1;
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
  const message = activeMovement.messages[result.messageKey] ?? '';
  gameHud.flashFeedback(result.quality, message);
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
    impactPulse = result.quality === 'perfect' ? 1 : 0.5;
  }

  activeMovement.onRepEnd(result, rig);

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
  setCameraPreset(0);
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
