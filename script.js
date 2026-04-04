/* ============================================================
   NEURONS NOT INCLUDED — script.js
   Simon Says brain training game.
   Vanilla JS, Web Audio API, zero dependencies.
============================================================ */

'use strict';

/* ============================================================
   CONFIG
============================================================ */

/** 9 retro hex colours for the tile grid, one per tile. */
const TILE_COLORS = [
  '#ff2d78', // hot pink
  '#00f5ff', // cyan
  '#ffe000', // yellow
  '#00ff88', // green
  '#ff7c00', // orange
  '#c87dff', // purple
  '#ff4444', // red
  '#44bbff', // sky blue
  '#ff88cc', // light pink
];

/** Frequencies (Hz) mapped to each tile — roughly C4 to D5 pentatonic. */
const TILE_NOTES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];

/** Level-up popup messages. Index = level - 1 (level 1 onward). */
const LEVEL_MSGS = [
  'LEVEL 1 — YOUR NEURONS ARE WARMING UP.',
  'LEVEL 2 — OH, YOU THINK YOU CAN HANDLE THIS?',
  'LEVEL 3 — SWEAT DETECTED. GOOD.',
  'LEVEL 4 — YOUR PREFRONTAL CORTEX IS CRYING.',
  'LEVEL 5 — BRAIN CELLS FILING FOR BANKRUPTCY.',
  'LEVEL 6 — NEURAL PATHWAYS: CRITICAL CONDITION.',
  'LEVEL 7 — DOCTORS ARE CONCERNED.',
  'LEVEL 8 — PLEASE CONSULT A NEUROLOGIST.',
  'LEVEL 9 — THIS IS ILLEGAL IN 12 COUNTRIES.',
  'LEVEL 10 — YOU ARE BEYOND HELP. WE ARE IMPRESSED.',
];

/** Messages shown when the player gets a sequence right. */
const WIN_MSGS = [
  'NOT BAD. DID THAT HURT?',
  'CORRECT! NEURONS BRIEFLY WORKING!',
  'SEQUENCE MATCHED. BRAIN STILL INTACT.',
  'YOUR MEMORY WORKS? WILD.',
  'NICE! PRESCRIBING YOURSELF FULL CREDIT.',
  'BANG ON. THE DOCTORS ARE SURPRISED.',
  'YOU DID IT! WE ARE AS SHOCKED AS YOU.',
  'CORRECT. YOUR FRONTAL LOBE SAYS THANKS.',
  'FLAWLESS. FOR NOW.',
  'IMPRESSIVE. OR LUCKY. PROBABLY LUCKY.',
];

/** Messages shown when the player gets a sequence wrong. */
const FAIL_MSGS = [
  'NOPE. SEQUENCE NOT FOUND IN YOUR SKULL.',
  'WRONG ORDER. BRAIN.EXE NOT RESPONDING.',
  'INCORRECT. THE NEURONS HAVE LEFT THE CHAT.',
  'CLOSE. BUT CLOSE IS FOR HORSESHOES AND GRENADES.',
  'THAT WAS... NOT IT. TRY PAYING ATTENTION.',
  'ERROR 404: CORRECT ANSWER NOT FOUND.',
  'YOUR WORKING MEMORY CALLED IN SICK.',
  'OOPS. REPLAY INCOMING. YOU\'RE WELCOME.',
  'WRONG! THE TILES WILL NOW JUDGE YOU.',
  'SEQUENCE FAILED. NEURONS NOT INCLUDED.',
];

/** Game over headline variants. */
const OVER_HEADLINES = [
  'BRAIN.EXE HAS STOPPED',
  'NEURONS HAVE LEFT THE BUILDING',
  'MEMORY FULL — PLEASE DELETE FILES',
  'COGNITIVE OVERFLOW ERROR',
  'SHORT-TERM MEMORY: NOT FOUND',
];

/** Game over diagnosis lines. */
const OVER_DIAGNOSES = [
  'OFFICIAL DIAGNOSIS: REMEMBERED LESS THAN A GOLDFISH.',
  'CAUSE OF DEATH: OVERCONFIDENCE AND UNDER-NEURONS.',
  'PROGNOSIS: MORE PRACTICE. LESS DOOM-SCROLLING.',
  'THE TILES FEEL BAD FOR YOU. THE TILES.',
  'YOUR BRAIN TRIED ITS BEST. IT WAS NOT ENOUGH.',
  'MEDICAL ADVICE: SLEEP MORE, FORGET LESS.',
];

/** Game over tip lines. */
const OVER_TIPS = [
  'TIP: CHUNKING SEQUENCES INTO GROUPS HELPS. (LOOK IT UP.)',
  'TIP: SAY THE COLORS OUT LOUD. REALLY. IT WORKS.',
  'TIP: THE PATTERN NEVER LIES. YOUR MEMORY DOES.',
  'TIP: SLEEP IS WHERE MEMORIES CONSOLIDATE. JUST SAYING.',
  'TIP: STRESS IMPAIRS WORKING MEMORY. BREATHE.',
  'TIP: YOUR HIPPOCAMPUS THANKS YOU FOR THE WORKOUT.',
];

/* ============================================================
   AUDIO ENGINE
   Lazy-initialised Web Audio API.
   initAudio() must be called on the first user gesture.
============================================================ */

let audioCtx = null;

/** Initialise the AudioContext (must be triggered by user gesture). */
function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('Web Audio API not available:', e);
  }
}

/**
 * Play a single tone.
 * @param {number} freq - Frequency in Hz.
 * @param {number} duration - Duration in ms.
 * @param {string} type - OscillatorNode type: 'square' | 'sawtooth' | 'sine' | 'triangle'.
 * @param {number} [volume=0.18] - Gain (0–1).
 */
function playNote(freq, duration, type = 'square', volume = 0.18) {
  if (!audioCtx) return;
  try {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration / 1000);
  } catch (e) { /* silent fail */ }
}

/** Three-note ascending arpeggio for a correct answer. */
function playSuccess() {
  if (!audioCtx) return;
  playNote(523.25, 80,  'square',   0.15);
  setTimeout(() => playNote(659.25, 80,  'square',   0.15), 90);
  setTimeout(() => playNote(783.99, 120, 'square',   0.18), 180);
}

/** Low sawtooth buzz for a wrong answer. */
function playFail() {
  if (!audioCtx) return;
  playNote(110, 300, 'sawtooth', 0.2);
  setTimeout(() => playNote(90, 250, 'sawtooth', 0.15), 120);
}

/** Short click sound when a tile is tapped during input phase. */
function playClick(freq) {
  if (!audioCtx) return;
  playNote(freq, 60, 'square', 0.12);
}

/* ============================================================
   STATE
============================================================ */

/**
 * Game state object G.
 * phase: 'MENU' | 'SHOWING' | 'INPUT' | 'WAIT' | 'OVER'
 */
const G = {
  phase:   'MENU',
  seq:     [],      // full sequence of tile indices
  input:   [],      // player's current-round inputs
  level:   1,
  score:   0,
  lives:   3,
  streak:  0,       // consecutive correct rounds
  mult:    1.0,     // combo multiplier
  flashMs: 600,     // tile flash duration (ms)
  pauseMs: 150,     // pause between flashes (ms)
  maxSeq:  0,       // longest sequence player reached
};

/* ============================================================
   DOM HELPERS
============================================================ */

/** Short alias for getElementById. */
const $ = id => document.getElementById(id);

/** Returns the tile div at index i. */
const tile = i => document.querySelector(`.tile[data-idx="${i}"]`);

/* ============================================================
   SCREEN MANAGEMENT
============================================================ */

/**
 * Switch to a named screen.
 * @param {'menu'|'howto'|'game'|'over'} name
 */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(`screen-${name}`).classList.add('active');
}

/* ============================================================
   GRID CONSTRUCTION
============================================================ */

/**
 * Darkens a hex colour to 15% brightness for the dim (idle) tile state.
 * @param {string} hex - e.g. '#ff2d78'
 * @returns {string} CSS rgb() colour string.
 */
function dimColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.12)}, ${Math.round(g * 0.12)}, ${Math.round(b * 0.12)})`;
}

/** Creates the 9 tile divs and appends them to #grid. */
function buildGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  TILE_COLORS.forEach((color, i) => {
    const div = document.createElement('div');
    div.className = 'tile no-click';
    div.dataset.idx = i;
    div.style.setProperty('--bright', color);
    div.style.setProperty('--dim-color', dimColor(color));
    div.style.background = dimColor(color);
    div.addEventListener('click', () => onTileClick(i));
    grid.appendChild(div);
  });
}

/** Sets a tile's background to its dim state. */
function dimTile(i) {
  const t = tile(i);
  if (!t) return;
  t.classList.remove('lit');
  t.style.background = dimColor(TILE_COLORS[i]);
  t.style.borderColor = '';
  t.style.boxShadow  = '';
}

/**
 * Lights a tile for `ms` milliseconds, plays its note, then dims it.
 * Returns a Promise that resolves after the dim + pauseMs gap.
 */
function flashTile(i, ms) {
  return new Promise(resolve => {
    const t = tile(i);
    if (!t) { resolve(); return; }

    // Light it up
    t.classList.add('lit');
    playNote(TILE_NOTES[i], ms * 0.9, 'square', 0.15);

    // Dim after ms
    setTimeout(() => {
      dimTile(i);
      // Pause between flashes
      setTimeout(resolve, G.pauseMs);
    }, ms);
  });
}

/* ============================================================
   ENABLE / DISABLE TILE CLICKS
============================================================ */

function setClickable(yes) {
  document.querySelectorAll('.tile').forEach(t => {
    if (yes) {
      t.classList.remove('no-click');
    } else {
      t.classList.add('no-click');
    }
  });
}

/* ============================================================
   HUD UPDATES
============================================================ */

function updateHUD() {
  $('hud-level-val').textContent = G.level;
  $('hud-score-val').textContent = G.score;
  $('seq-len').textContent = G.seq.length;
  $('mult-val').textContent = G.mult.toFixed(1);
}

function updateLives() {
  for (let i = 0; i < 3; i++) {
    const el = $(`life-${i}`);
    if (i >= G.lives) {
      el.classList.add('dead');
    } else {
      el.classList.remove('dead');
    }
  }
}

function setStatus(txt) {
  $('status-text').textContent = txt;
}

/* ============================================================
   POPUP MESSAGES
============================================================ */

/**
 * Show the popup banner.
 * @param {string} msg - Message text.
 * @param {'info'|'success'|'error'} type - Colour variant.
 */
function showPopup(msg, type = 'info') {
  const el = $('popup');
  el.className = `popup ${type}`;
  $('popup-text').textContent = msg;
}

function hidePopup() {
  const el = $('popup');
  el.className = 'popup hidden';
  $('popup-text').textContent = '';
}

/* ============================================================
   UTILITIES
============================================================ */

/** Random integer 0 <= n < max. */
function rand(max) {
  return Math.floor(Math.random() * max);
}

/** Pick a random element from an array. */
function pick(arr) {
  return arr[rand(arr.length)];
}

/** Promise-based setTimeout. */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ============================================================
   CORE GAME FLOW
============================================================ */

/** Resets all state and starts the game. */
function startGame() {
  G.phase   = 'WAIT';
  G.seq     = [];
  G.input   = [];
  G.level   = 1;
  G.score   = 0;
  G.lives   = 3;
  G.streak  = 0;
  G.mult    = 1.0;
  G.flashMs = 600;
  G.pauseMs = 150;
  G.maxSeq  = 0;

  buildGrid();
  updateHUD();
  updateLives();
  hidePopup();
  setStatus('get ready...');
  showScreen('game');

  // Short delay before showing the first level banner
  setTimeout(() => showLevelBanner(false), 400);
}

/**
 * Shows the level banner popup, then kicks off the next round.
 * @param {boolean} isNew - true when levelling up mid-game.
 */
async function showLevelBanner(isNew) {
  const idx = Math.min(G.level - 1, LEVEL_MSGS.length - 1);
  const msg = isNew
    ? `⬆ LEVEL ${G.level}! ${LEVEL_MSGS[idx]}`
    : LEVEL_MSGS[idx];

  showPopup(msg, 'info');
  setClickable(false);
  await sleep(2200);
  hidePopup();
  await sleep(200);
  nextRound();
}

/** Adds one tile to the sequence and plays the full sequence for the player to watch. */
async function nextRound() {
  // Grow the sequence
  G.seq.push(rand(9));
  G.input = [];

  if (G.seq.length > G.maxSeq) G.maxSeq = G.seq.length;

  updateHUD();
  setStatus('watch carefully...');
  setClickable(false);
  hidePopup();

  await sleep(700);
  await playSequence();

  // Ready for player input
  G.phase = 'INPUT';
  setClickable(true);
  setStatus("your turn! don't blow it.");
}

/** Plays the current full sequence by flashing tiles. */
async function playSequence() {
  G.phase = 'SHOWING';
  for (let i = 0; i < G.seq.length; i++) {
    await flashTile(G.seq[i], G.flashMs);
  }
}

/**
 * Handles a tile click during the INPUT phase.
 * @param {number} i - Tile index 0–8.
 */
function onTileClick(i) {
  if (G.phase !== 'INPUT') return;

  // Audio init on first gesture
  initAudio();

  // Visual + audio feedback for the click regardless of correctness
  const t = tile(i);
  t.classList.add('lit');
  playClick(TILE_NOTES[i]);
  setTimeout(() => dimTile(i), 180);

  const pos = G.input.length;
  G.input.push(i);

  if (i !== G.seq[pos]) {
    // WRONG TILE
    onWrong();
    return;
  }

  if (G.input.length === G.seq.length) {
    // COMPLETED SEQUENCE
    onCorrect();
  }
  // Otherwise: correct so far, keep waiting for more input
}

/** Called when the player completes the sequence correctly. */
async function onCorrect() {
  G.phase = 'WAIT';
  setClickable(false);

  // Update streak & multiplier
  G.streak++;
  if (G.streak % 3 === 0 && G.mult < 4.0) {
    G.mult = Math.min(4.0, G.mult + 0.5);
  }

  // Score: sequence_length × 10 × multiplier
  const earned = Math.round(G.seq.length * 10 * G.mult);
  G.score += earned;

  updateHUD();
  showPopup(`${pick(WIN_MSGS)} (+${earned})`, 'success');
  playSuccess();

  await sleep(1600);
  hidePopup();

  // Check for level-up (every 5 rounds)
  if (G.seq.length % 5 === 0) {
    await sleep(200);
    levelUp();
  } else {
    await sleep(200);
    nextRound();
  }
}

/** Called when the player clicks the wrong tile. */
async function onWrong() {
  G.phase = 'WAIT';
  setClickable(false);

  // Reset streak & multiplier
  G.streak = 0;
  G.mult   = 1.0;

  // Lose a life
  G.lives--;
  updateLives();
  updateHUD();

  // Red error shake on all tiles
  document.querySelectorAll('.tile').forEach(t => t.classList.add('error'));
  playFail();
  showPopup(pick(FAIL_MSGS), 'error');

  await sleep(1800);

  document.querySelectorAll('.tile').forEach(t => t.classList.remove('error'));
  hidePopup();

  if (G.lives <= 0) {
    await sleep(300);
    gameOver();
    return;
  }

  // Replay same sequence (no new tile added)
  setStatus('try that again...');
  await sleep(600);
  await playSequence();
  G.phase = 'INPUT';
  G.input = [];
  setClickable(true);
  setStatus("your turn! (again. embarrassing.)");
}

/** Increments level, speeds up flashing, shows level banner. */
function levelUp() {
  G.level++;
  G.flashMs = Math.max(250, G.flashMs - 60);
  updateHUD();
  showLevelBanner(true);
}

/** Transitions to the game over screen. */
function gameOver() {
  G.phase = 'OVER';

  // Populate game over screen
  $('over-headline').textContent   = pick(OVER_HEADLINES);
  $('over-diagnosis').textContent  = pick(OVER_DIAGNOSES);
  $('over-tip').textContent        = pick(OVER_TIPS);
  $('stat-score').textContent      = G.score;
  $('stat-level').textContent      = G.level;
  $('stat-maxseq').textContent     = G.maxSeq;

  showScreen('over');
}

/* ============================================================
   INITIALISATION — BUTTON BINDINGS
============================================================ */

// Menu → Start Game
$('btn-start').addEventListener('click', () => {
  initAudio();
  startGame();
});

// Menu → How To Play
$('btn-howto').addEventListener('click', () => {
  showScreen('howto');
});

// How To Play → Back
$('btn-back').addEventListener('click', () => {
  showScreen('menu');
});

// Game Over → Try Again
$('btn-restart').addEventListener('click', () => {
  initAudio();
  startGame();
});

// Game Over → Menu
$('btn-menu').addEventListener('click', () => {
  G.phase = 'MENU';
  showScreen('menu');
});

// Initial screen state — menu is already active via HTML class,
// but set phase explicitly.
G.phase = 'MENU';
