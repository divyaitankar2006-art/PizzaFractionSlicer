/**
 * ============================================================
 *  Pizza Fraction Adventure — game.js
 *  Kid-friendly educational fraction game using Canvas.
 *
 *  SLICING LOGIC RETAINED.
 *  Level UI generated dynamically strictly per-level (Verified).
 * ============================================================
 */

'use strict';

/* ============================================================
   1. CONFIG & CONSTANTS
   ============================================================ */

const CFG = {
  PIZZA_SIZE_FACTOR: 0.68,
  MAX_PIZZA_PX: 400,
  MIN_PIZZA_PX: 200,

  R_OUTER: 1.00,
  R_CRUST: 0.92,
  R_SAUCE: 0.86,
  R_CHEESE: 0.82,

  CENTER_SNAP_RATIO: 0.22,
  MIN_DRAG_RATIO: 0.35,
  DUPLICATE_ANG_DEG: 12,
  EQUAL_TOLERANCE: 0.18,

  SHADE_COLOR: 'rgba(77, 150, 255, 0.50)',
  SHADE_HOVER_COLOR: 'rgba(77, 150, 255, 0.25)',

  FLASH_MS: 600,
  CONFETTI_COUNT: 80,
  CHALLENGES_PER_LEVEL: 5,
};

/* ============================================================
   2. AUDIO SYSTEM
   ============================================================ */

let audioCtx = null;
let soundEnabled = true;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

const SoundManager = {
  _play(freq, type, duration, vol, delay = 0) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (e) { }
  },
  playCut() { this._play(480, 'triangle', 0.18, 0.25); this._play(360, 'sine', 0.12, 0.15, 0.05); },
  playClick() { this._play(700, 'sine', 0.08, 0.20); },
  playShade() { this._play(520, 'sine', 0.10, 0.18); },
  playSuccess() {
    this._play(523.25, 'sine', 0.22, 0.30, 0.00);
    this._play(659.25, 'sine', 0.22, 0.30, 0.14);
    this._play(783.99, 'sine', 0.22, 0.30, 0.28);
    this._play(1046.50, 'sine', 0.40, 0.28, 0.42);
  },
  playError() {
    this._play(350, 'sine', 0.22, 0.18, 0.00);
    this._play(280, 'sine', 0.28, 0.15, 0.18);
  },
  playFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 880, 1046.50, 1318.51];
    notes.forEach((f, i) => this._play(f, 'triangle', 0.25, 0.28, i * 0.13));
  },
};

/* ============================================================
   3. STATE MANAGEMENT
   ============================================================ */

const sessionState = {
  unlockedLevels: 1,
  levelStars: Array(16).fill(0),
  totalScore: 0,
};

const state = {
  currentLevel: 1,
  challengeNumber: 0,
  score: 0,
  streak: 0,
  phase: 'cutting',

  challenge: null,
  cx: 0, cy: 0, r: 0,
  cutAngles: [],
  wedges: [],
  dragging: false,
  dragStart: null,
  dragCurrent: null,
  hoverWedgeIdx: -1,
  toppings: [],

  timerId: null,
  timeLeft: 0,
  hintUsed: false,
};

const el = id => document.getElementById(id);

/* ============================================================
   4. LEVELS & CHALLENGE GENERATION (12 LEVELS)
   ============================================================ */

const LEVELS = [
  { id: 1, title: 'Level 1: Slice It', icon: '🔪' },
  { id: 2, title: 'Level 2: Shade It', icon: '🎨' },
  { id: 3, title: 'Level 3: Find the Fraction', icon: '❓' },
  { id: 4, title: 'Level 4: Numerator/Denominator', icon: '📚' },
  { id: 5, title: 'Level 5: Compare Fractions', icon: '⚖️' },
  { id: 6, title: 'Level 6: Equivalent Fractions', icon: '🔗' },
  { id: 7, title: 'Level 7: Complete the Fraction', icon: '🧩' },
  { id: 8, title: 'Level 8: Pizza Order', icon: '👨🍳' },
  { id: 9, title: 'Level 9: Fraction Match', icon: '🔍' },
  { id: 10, title: 'Level 10: Fraction Addition', icon: '➕' },
  { id: 11, title: 'Level 11: Fraction Subtraction', icon: '➖' },
  { id: 12, title: 'Level 12: Fraction Multiplication', icon: '✖️' },
  { id: 13, title: 'Level 13: Fraction Division', icon: '➗' },
  { id: 14, title: 'Level 14: Different Denoms', icon: '🔄' },
  { id: 15, title: 'Level 15: Mixed Challenge', icon: '🎯' },
  { id: 16, title: 'Level 16: Fraction Master', icon: '🏆' }
];

function randomFraction(maxDenom = 8, allowWhole = false) {
  const denoms = [2, 3, 4, 5, 6, 8].filter(d => d <= maxDenom);
  const d = denoms[Math.floor(Math.random() * denoms.length)];
  const n = Math.floor(Math.random() * (allowWhole ? d : d - 1)) + 1;
  return { n, d };
}

function generateChallengeForLevel(level) {
  let type = '';

  if (level === 1) type = 'slice';
  else if (level === 2) type = 'shade';
  else if (level === 3) type = 'mc';
  else if (level === 4) type = 'num_denom';
  else if (level === 5) type = 'compare';
  else if (level === 6) type = 'equivalent';
  else if (level === 7) type = 'complete_frac';
  else if (level === 8) type = 'order';
  else if (level === 9) type = 'match';
  else if (level === 10) type = 'add';
  else if (level === 11) type = 'sub';
  else if (level === 12) type = 'mult';
  else if (level === 13) type = 'div';
  else if (level === 14) type = 'diff_denom';
  else {
    const types = ['slice', 'shade', 'mc', 'num_denom', 'compare', 'equivalent', 'complete_frac', 'order', 'match', 'word_problem', 'add', 'sub', 'mult', 'div', 'diff_denom'];
    type = types[Math.floor(Math.random() * types.length)];
  }

  let f1 = randomFraction(level >= 7 ? 8 : 6, false);

  if (type === 'slice') {
    return { type, n: f1.d, d: f1.d, cuts: f1.d - 1, msg: `Cut the pizza into ${f1.d} equal pieces.`, useVisual: true };
  }
  else if (type === 'shade') {
    return { type, n: f1.n, d: f1.d, cuts: f1.d - 1, msg: `Cut into ${f1.d} pieces, then shade ${f1.n}.`, useVisual: true };
  }
  else if (type === 'mc') {
    const opts = [`${f1.n}/${f1.d}`, `${f1.n + 1}/${f1.d}`, `${Math.max(1, f1.n - 1)}/${f1.d}`, `${f1.d}/${f1.d}`];
    return { type, n: f1.n, d: f1.d, opts: [...new Set(opts)].slice(0, 3).sort(() => Math.random() - 0.5), msg: `What fraction of the pizza is shaded?`, useVisual: true };
  }
  else if (type === 'num_denom') {
    const askNum = Math.random() > 0.5;
    const msg = `In ${f1.n}/${f1.d}, what does the ${askNum ? f1.n : f1.d} tell us?`;
    let ans = askNum ? "Shaded pieces" : "Total equal pieces";
    const opts = ["Total equal pieces", "Shaded pieces", "Number of pizzas"].sort(() => Math.random() - 0.5);
    return { type, opts, ans, msg, useVisual: false };
  }
  else if (type === 'compare') {
    let f2 = randomFraction();
    while (f1.n / f1.d === f2.n / f2.d) f2 = randomFraction();
    if (Math.random() > 0.8) f2 = { n: f1.n * 2, d: f1.d * 2 };
    let ans = '=';
    if (f1.n / f1.d > f2.n / f2.d) ans = 'A';
    if (f1.n / f1.d < f2.n / f2.d) ans = 'B';
    return { type, f1, f2, ans, msg: `Which pizza has more shaded?`, useVisual: true };
  }
  else if (type === 'equivalent') {
    const eqList = [
      { f1: { n: 1, d: 2 }, f2: { n: 2, d: 4 }, opts: ['1/4', '2/4', '3/4', '4/4'] },
      { f1: { n: 1, d: 2 }, f2: { n: 4, d: 8 }, opts: ['2/8', '3/8', '4/8', '5/8'] },
      { f1: { n: 1, d: 3 }, f2: { n: 2, d: 6 }, opts: ['1/6', '2/6', '3/6', '4/6'] },
      { f1: { n: 2, d: 3 }, f2: { n: 4, d: 6 }, opts: ['2/6', '3/6', '4/6', '5/6'] },
      { f1: { n: 1, d: 4 }, f2: { n: 2, d: 8 }, opts: ['1/8', '2/8', '3/8', '4/8'] },
    ];
    const eq = eqList[Math.floor(Math.random() * eqList.length)];
    return { type, n: eq.f1.n, d: eq.f1.d, ans: `${eq.f2.n}/${eq.f2.d}`, opts: eq.opts.sort(() => Math.random() - 0.5), msg: `Which fraction shows the same amount as ${eq.f1.n}/${eq.f1.d}?`, useVisual: true };
  }
  else if (type === 'complete_frac') {
    const eqList = [
      { f1: { n: 1, d: 2 }, ans: '4/8', opts: ['2/8', '4/8', '6/8', '8/8'] },
      { f1: { n: 2, d: 4 }, ans: '1/2', opts: ['1/2', '2/2', '1/4', '3/4'] },
      { f1: { n: 1, d: 3 }, ans: '2/6', opts: ['1/6', '2/6', '3/6', '4/6'] },
    ];
    const eq = eqList[Math.floor(Math.random() * eqList.length)];
    return { type, ans: eq.ans, opts: eq.opts.sort(() => Math.random() - 0.5), msg: `${eq.f1.n}/${eq.f1.d} is equal to which of these?`, useVisual: false };
  }
  else if (type === 'order') {
    const toppings = ['cheese', 'pepperoni', 'olives', 'mushrooms'];
    const t = toppings[Math.floor(Math.random() * toppings.length)];
    return { type, n: f1.n, d: f1.d, cuts: f1.d - 1, msg: `👨🍳 Order: A customer wants ${f1.n}/${f1.d} of the pizza with ${t}!`, useVisual: true };
  }
  else if (type === 'match') {
    const pizzas = [f1];
    while (pizzas.length < 3) {
      let cand = randomFraction(8, false);
      if (cand.n / cand.d !== f1.n / f1.d) pizzas.push(cand);
    }
    pizzas.sort(() => Math.random() - 0.5);
    const ansIdx = pizzas.findIndex(p => p.n === f1.n && p.d === f1.d);
    return { type, n: f1.n, d: f1.d, pizzas, ansIdx, msg: `Which pizza shows ${f1.n}/${f1.d}?`, useVisual: true };
  }
  else if (type === 'word_problem') {
    const names = ["Riya", "Leo", "Maya", "Sam"];
    const name = names[Math.floor(Math.random() * names.length)];
    const msg = `There are ${f1.d} pizza slices. ${name} eats ${f1.n} slices. What fraction did ${name} eat?`;
    const ans = `${f1.n}/${f1.d}`;
    const opts = [`${f1.n}/${f1.d}`, `${f1.d - f1.n}/${f1.d}`, `1/${f1.d}`, `${f1.d}/${f1.d}`];
    return { type, opts: [...new Set(opts)].slice(0, 3).sort(() => Math.random() - 0.5), ans, msg, useVisual: false };
  }
  else if (type === 'add') {
    const denoms = [3, 4, 5, 6, 8];
    const d = denoms[Math.floor(Math.random() * denoms.length)];
    const n1 = Math.floor(Math.random() * (d - 1)) + 1;
    const n2 = Math.floor(Math.random() * (d - n1)) + 1;
    const ans = `${n1 + n2}/${d}`;
    const opts = [ans, `${n1 + n2}/${d * 2}`, `${Math.abs(n1 - n2) || 1}/${d}`, `${n1}/${d}`];
    return { type, f1: {n: n1, d}, f2: {n: n2, d}, opts: [...new Set(opts)].slice(0, 3).sort(() => Math.random() - 0.5), ans, msg: `What is the total? (${n1}/${d} + ${n2}/${d})`, useVisual: true };
  }
  else if (type === 'sub') {
    const denoms = [3, 4, 5, 6, 8];
    const d = denoms[Math.floor(Math.random() * denoms.length)];
    const n1 = Math.floor(Math.random() * (d - 1)) + 2; 
    const n2 = Math.floor(Math.random() * (n1 - 1)) + 1; 
    const ans = `${n1 - n2}/${d}`;
    const opts = [ans, `${n1 + n2}/${d}`, `${n1 - n2}/${d * 2}`, `1/${d}`];
    return { type, f1: {n: n1, d}, f2: {n: n2, d}, opts: [...new Set(opts)].slice(0, 3).sort(() => Math.random() - 0.5), ans, msg: `How much pizza is left? (${n1}/${d} − ${n2}/${d})`, useVisual: true };
  }
  else if (type === 'mult') {
    const questions = [
      { f1: {n:1,d:2}, f2: {n:1,d:2}, ans: '1/4', opts: ['1/4', '1/2', '2/4'] },
      { f1: {n:1,d:2}, f2: {n:2,d:3}, ans: '1/3', opts: ['1/3', '2/3', '1/6'] },
      { f1: {n:2,d:3}, f2: {n:1,d:2}, ans: '1/3', opts: ['1/3', '2/6', '2/3'] }
    ];
    const q = questions[Math.floor(Math.random() * questions.length)];
    return { type, f1: q.f1, f2: q.f2, opts: q.opts.sort(() => Math.random() - 0.5), ans: q.ans, msg: `What is ${q.f1.n}/${q.f1.d} of ${q.f2.n}/${q.f2.d}?`, useVisual: false };
  }
  else if (type === 'div') {
    const questions = [
      { f1: {n:1,d:2}, f2: {n:1,d:4}, ans: '2', opts: ['2', '4', '1/2'] },
      { f1: {n:3,d:4}, f2: {n:1,d:4}, ans: '3', opts: ['3', '2', '4'] },
      { f1: {n:1,d:1}, f2: {n:1,d:8}, ans: '8', opts: ['8', '4', '2'] }
    ];
    const q = questions[Math.floor(Math.random() * questions.length)];
    return { type, f1: q.f1, f2: q.f2, opts: q.opts.sort(() => Math.random() - 0.5), ans: q.ans, msg: `How many ${q.f2.n}/${q.f2.d} pieces fit inside ${q.f1.n}/${q.f1.d}?`, useVisual: false };
  }
  else if (type === 'diff_denom') {
    const questions = [
      { f1: {n:1,d:2}, op: '+', f2: {n:1,d:4}, ans: '3/4', opts: ['3/4', '2/6', '2/4'] },
      { f1: {n:3,d:4}, op: '-', f2: {n:1,d:2}, ans: '1/4', opts: ['1/4', '2/4', '2/2'] }
    ];
    const q = questions[Math.floor(Math.random() * questions.length)];
    return { type, f1: q.f1, f2: q.f2, op: q.op, opts: q.opts.sort(() => Math.random() - 0.5), ans: q.ans, msg: `${q.f1.n}/${q.f1.d} ${q.op} ${q.f2.n}/${q.f2.d} = ?`, useVisual: false };
  }
}

/* ============================================================
   5. CANVAS SIZING & DPI
   ============================================================ */

function getDPI() { return window.devicePixelRatio || 1; }

function getCanvas(id) { return document.getElementById(id); }

function resizeMainCanvas() {
  const canvas = getCanvas('pizzaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const vw = Math.min(window.innerWidth, 860);
  const raw = Math.floor(vw * CFG.PIZZA_SIZE_FACTOR);
  const size = Math.max(CFG.MIN_PIZZA_PX, Math.min(CFG.MAX_PIZZA_PX, raw));
  const dpr = getDPI();

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  state.cx = size / 2;
  state.cy = size / 2;
  state.r = (size / 2) * CFG.R_OUTER * 0.90;
}

function resizeDualCanvas(canvasId) {
  const c = getCanvas(canvasId);
  if (!c) return null;
  const vw = Math.min(window.innerWidth, 860);
  const raw = Math.floor(vw * 0.35);
  const size = Math.max(100, Math.min(250, raw));
  const dpr = getDPI();

  c.width = size * dpr;
  c.height = size * dpr;
  c.style.width = size + 'px';
  c.style.height = size + 'px';

  return { cx: size / 2, cy: size / 2, r: (size / 2) * CFG.R_OUTER * 0.90, ctx: c.getContext('2d') };
}

/* ============================================================
   6. PIZZA DRAWING HELPERS
   ============================================================ */

function drawPizzaBase(ctxToUse, cx, cy, r, toppingsList = []) {
  // Shadow underneath
  const plateShadow = ctxToUse.createRadialGradient(cx, cy + r * 0.08, r * 0.6, cx, cy + r * 0.08, r * 1.15);
  plateShadow.addColorStop(0, 'rgba(0,0,0,0)');
  plateShadow.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctxToUse.beginPath(); ctxToUse.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
  ctxToUse.fillStyle = plateShadow; ctxToUse.fill();

  // Golden-brown crust
  const crustGrad = ctxToUse.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.5, cx, cy, r);
  crustGrad.addColorStop(0.0, '#f5b041');
  crustGrad.addColorStop(0.7, '#e67e22');
  crustGrad.addColorStop(1.0, '#d35400');
  ctxToUse.beginPath(); ctxToUse.arc(cx, cy, r, 0, Math.PI * 2);
  ctxToUse.fillStyle = crustGrad; ctxToUse.fill();
  drawCrustBumps(ctxToUse, cx, cy, r);

  // Tomato sauce
  const sauceGrad = ctxToUse.createRadialGradient(cx, cy, 0, cx, cy, r * CFG.R_SAUCE);
  sauceGrad.addColorStop(0.0, '#e74c3c');
  sauceGrad.addColorStop(0.8, '#c0392b');
  sauceGrad.addColorStop(1.0, '#922b21');
  ctxToUse.beginPath(); ctxToUse.arc(cx, cy, r * CFG.R_SAUCE, 0, Math.PI * 2);
  ctxToUse.fillStyle = sauceGrad; ctxToUse.fill();

  // Melted cheese
  const cheeseGrad = ctxToUse.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r * CFG.R_CHEESE);
  cheeseGrad.addColorStop(0.0, '#f9e79f');
  cheeseGrad.addColorStop(0.6, '#f1c40f');
  cheeseGrad.addColorStop(1.0, '#d4ac0d');
  ctxToUse.beginPath(); ctxToUse.arc(cx, cy, r * CFG.R_CHEESE, 0, Math.PI * 2);
  ctxToUse.fillStyle = cheeseGrad; ctxToUse.fill();
  drawCheeseMelt(ctxToUse, cx, cy, r);

  drawToppings(ctxToUse, cx, cy, r, toppingsList);

  // Glossy highlight for cartoon effect
  const crustHL = ctxToUse.createLinearGradient(cx - r, cy - r, cx + r * 0.5, cy + r * 0.5);
  crustHL.addColorStop(0, 'rgba(255,255,255,0.3)');
  crustHL.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctxToUse.beginPath(); ctxToUse.arc(cx, cy, r, 0, Math.PI * 2);
  ctxToUse.fillStyle = crustHL; ctxToUse.fill();
}

function drawCrustBumps(ctx, cx, cy, r) {
  const bumps = 12;
  ctx.save(); 
  for (let i = 0; i < bumps; i++) {
    const angle = (i / bumps) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * r * 0.94, cy + Math.sin(angle) * r * 0.94, r * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(211, 84, 0, 0.4)'; 
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * r * 0.93, cy + Math.sin(angle) * r * 0.93, r * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
    ctx.fill();
  }
  ctx.restore();
}

function drawCheeseMelt(ctx, cx, cy, r) {
  ctx.save();
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#fef9e7';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const d = (0.2 + Math.random() * 0.5) * r * CFG.R_CHEESE;
    const br = (0.06 + Math.random() * 0.04) * r;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, br, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function generateToppings(r) {
  const toppings = [];
  const types = ['pepperoni', 'olive', 'mushroom', 'pepper'];
  for (let i = 0; i < 16; i++) {
    const ring = 0.15 + Math.random() * 0.6;
    const angle = Math.random() * Math.PI * 2;
    const type = types[Math.floor(Math.random() * types.length)];
    const size = r * (type === 'pepperoni' ? 0.09 : type === 'mushroom' ? 0.07 : type === 'pepper' ? 0.06 : 0.035);
    toppings.push({ type, angle, dist: ring * r * CFG.R_CHEESE, size, rot: Math.random() * Math.PI * 2 });
  }
  return toppings;
}

function drawToppings(ctx, cx, cy, r, toppingsList) {
  for (const t of toppingsList) {
    const tx = cx + Math.cos(t.angle) * t.dist;
    const ty = cy + Math.sin(t.angle) * t.dist;
    
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(t.rot);
    
    // Drop shadow for topping
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    if (t.type === 'pepperoni') {
      ctx.beginPath(); ctx.arc(0, 0, t.size, 0, Math.PI * 2); 
      ctx.fillStyle = '#e74c3c'; ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(-t.size*0.3, -t.size*0.3, t.size*0.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(t.size*0.4, t.size*0.1, t.size*0.15, 0, Math.PI*2); ctx.fill();
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(-t.size*0.2, t.size*0.2, t.size*0.1, 0, Math.PI*2); ctx.fill();
    } else if (t.type === 'olive') {
      ctx.beginPath(); ctx.arc(0, 0, t.size, 0, Math.PI * 2); 
      ctx.fillStyle = '#34495e'; ctx.fill();
      ctx.shadowColor = 'transparent'; // no shadow for hole
      ctx.beginPath(); ctx.arc(0, 0, t.size * 0.4, 0, Math.PI * 2); 
      ctx.fillStyle = '#f1c40f'; ctx.fill(); 
    } else if (t.type === 'mushroom') {
      ctx.fillStyle = '#f5f5dc';
      ctx.beginPath();
      ctx.moveTo(-t.size, 0);
      ctx.bezierCurveTo(-t.size, -t.size*1.2, t.size, -t.size*1.2, t.size, 0);
      ctx.lineTo(t.size*0.3, 0);
      ctx.lineTo(t.size*0.3, t.size*0.8);
      ctx.lineTo(-t.size*0.3, t.size*0.8);
      ctx.lineTo(-t.size*0.3, 0);
      ctx.fill();
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(-t.size*0.4, -t.size*0.4, t.size*0.2, 0, Math.PI*2); ctx.fill();
    } else if (t.type === 'pepper') {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = t.size * 0.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, t.size, Math.PI * 1.2, Math.PI * 2.8);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

/* ============================================================
   7. SLICE / GEOMETRY UTILITIES
   ============================================================ */

function eventToCanvas(e, cvs) {
  const rect = cvs.getBoundingClientRect();
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
  } else {
    clientX = e.clientX; clientY = e.clientY;
  }
  const scaleX = cvs.width / getDPI() / rect.width;
  const scaleY = cvs.height / getDPI() / rect.height;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function insidePizza(x, y) {
  const dx = x - state.cx, dy = y - state.cy;
  return Math.sqrt(dx * dx + dy * dy) <= state.r;
}
function canonicalAngle(angle) {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a;
}
function dragToAngle(start, end) {
  return canonicalAngle(Math.atan2(end.y - state.cy, end.x - state.cx));
}
function dragLengthRatio(start, end) {
  const dx = end.x - state.cx, dy = end.y - state.cy;
  return Math.sqrt(dx * dx + dy * dy) / state.r;
}
function isNearCenter(x, y) {
  const dx = x - state.cx, dy = y - state.cy;
  return Math.sqrt(dx * dx + dy * dy) <= state.r * CFG.CENTER_SNAP_RATIO;
}
function isDuplicateCut(newAngle) {
  const thresh = (CFG.DUPLICATE_ANG_DEG * Math.PI) / 180;
  const existing = [-Math.PI / 2, ...state.cutAngles];
  return existing.some(a => {
    let diff = Math.abs(a - newAngle) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff < thresh;
  });
}

function computeWedges() {
  const allAngles = [-Math.PI / 2, ...state.cutAngles];
  for (let i = 0; i < allAngles.length; i++) {
    let a = allAngles[i] % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    allAngles[i] = a;
  }
  if (allAngles.length === 1) {
    return [{ startAngle: allAngles[0], endAngle: allAngles[0] + Math.PI * 2, shaded: false }];
  }
  allAngles.sort((a, b) => a - b);
  const wedges = [];
  for (let i = 0; i < allAngles.length; i++) {
    const start = allAngles[i];
    const end = allAngles[(i + 1) % allAngles.length];
    const span = end > start ? end - start : end + Math.PI * 2 - start;
    wedges.push({ startAngle: start, endAngle: start + span, shaded: false });
  }
  return wedges;
}

function wedgesAreEqual(wedges) {
  if (wedges.length < 2) return true;
  const ideal = (Math.PI * 2) / wedges.length;
  const tol = ideal * CFG.EQUAL_TOLERANCE;
  return wedges.every(w => Math.abs((w.endAngle - w.startAngle) - ideal) <= tol);
}

function wedgeIndexAt(px, py) {
  if (!insidePizza(px, py)) return -1;
  const dx = px - state.cx, dy = py - state.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > state.r * CFG.R_CRUST) return -1;
  let angle = Math.atan2(dy, dx);
  if (angle < 0) angle += Math.PI * 2;
  const EPS = 0.001;
  for (let i = 0; i < state.wedges.length; i++) {
    const w = state.wedges[i];
    let start = w.startAngle % (Math.PI * 2);
    if (start < 0) start += Math.PI * 2;
    const span = w.endAngle - w.startAngle;
    let rel = angle - start;
    if (rel < -EPS) rel += Math.PI * 2;
    if (rel < span + EPS) return i;
  }
  return state.wedges.length - 1;
}

/* ============================================================
   8. CUT LINE & DRAG PREVIEW
   ============================================================ */

function drawCutLine(ctx, cx, cy, r, angle, alpha = 1.0) {
  const x2 = cx + Math.cos(angle) * r;
  const y2 = cy + Math.sin(angle) * r;

  ctx.save(); ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2.5, r * 0.022);
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();

  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = '#d4ac0d';
  ctx.lineWidth = Math.max(2.5, r * 0.022) * 0.45;
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

function drawDragPreview(ctx) {
  if (!state.dragging || !state.dragStart || !state.dragCurrent || state.phase !== 'cutting') return;
  const dragLen = dragLengthRatio(state.dragStart, state.dragCurrent);
  if (dragLen < 0.05) return;

  const angle = dragToAngle(state.dragStart, state.dragCurrent);
  drawCutLine(ctx, state.cx, state.cy, state.r, angle, 0.35);

  const { cx, cy, r } = state;
  const cutterDist = Math.min(dragLen, 0.98) * r;
  const ex = cx + Math.cos(angle) * cutterDist;
  const ey = cy + Math.sin(angle) * cutterDist;

  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(angle + Math.PI / 2);

  const sz = Math.max(14, r * 0.10);
  ctx.fillStyle = '#e74c3c';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.roundRect(-sz * 0.28, sz * 0.3, sz * 0.56, sz * 0.8, sz * 0.15); ctx.fill();

  ctx.fillStyle = '#3498db';
  ctx.beginPath(); ctx.arc(0, sz * 0.22, sz * 0.24, 0, Math.PI * 2); ctx.fill();

  const wheelGrad = ctx.createRadialGradient(-sz * 0.12, -sz * 0.1, sz * 0.05, 0, 0, sz * 0.42);
  wheelGrad.addColorStop(0, '#ecf0f1'); wheelGrad.addColorStop(0.6, '#bdc3c7'); wheelGrad.addColorStop(1, '#7f8c8d');
  ctx.fillStyle = wheelGrad; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(0, 0, sz * 0.42, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#e74c3c'; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.arc(0, 0, sz * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWedge(ctx, cx, cy, r, wedge, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r * CFG.R_CRUST, wedge.startAngle, wedge.endAngle);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawShadedWedges(ctx) {
  for (const w of state.wedges) {
    if (w.shaded) drawWedge(ctx, state.cx, state.cy, state.r, w, CFG.SHADE_COLOR);
  }
  if (state.hoverWedgeIdx >= 0 && state.phase === 'shading') {
    const hw = state.wedges[state.hoverWedgeIdx];
    if (hw && !hw.shaded) drawWedge(ctx, state.cx, state.cy, state.r, hw, CFG.SHADE_HOVER_COLOR);
  }
}

/* ============================================================
   9. REDRAW PIPELINE
   ============================================================ */

function redrawMain() {
  const canvas = getCanvas('pizzaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cssW = canvas.width / getDPI();
  const cssH = canvas.height / getDPI();
  ctx.clearRect(0, 0, cssW, cssH);

  drawPizzaBase(ctx, state.cx, state.cy, state.r, state.toppings);

  if (state.wedges.length > 0) drawShadedWedges(ctx);

  drawCutLine(ctx, state.cx, state.cy, state.r, -Math.PI / 2);
  for (const angle of state.cutAngles) drawCutLine(ctx, state.cx, state.cy, state.r, angle);

  drawDragPreview(ctx);
}

function redrawStaticPizza(canvasId, frac) {
  const p = resizeDualCanvas(canvasId);
  if (!p) return;
  p.ctx.clearRect(0, 0, p.ctx.canvas.width, p.ctx.canvas.height);
  const tops = generateToppings(p.r);
  drawPizzaBase(p.ctx, p.cx, p.cy, p.r, tops);

  const ideal = (Math.PI * 2) / frac.d;
  for (let i = 0; i < frac.d; i++) {
    const start = -Math.PI / 2 + (i * ideal);
    const end = start + ideal;
    drawCutLine(p.ctx, p.cx, p.cy, p.r, start);
    if (i < frac.n) drawWedge(p.ctx, p.cx, p.cy, p.r, { startAngle: start, endAngle: end }, CFG.SHADE_COLOR);
  }
}

/* ============================================================
   10. INPUT HANDLING 
   ============================================================ */

function onPointerDown(e) {
  if (state.phase !== 'cutting' && state.phase !== 'shading') return;
  e.preventDefault();
  const cvs = e.currentTarget;
  const pos = eventToCanvas(e, cvs);
  if (state.phase === 'cutting' && !isNearCenter(pos.x, pos.y)) return;
  if (state.phase === 'shading' && !insidePizza(pos.x, pos.y)) return;

  state.dragging = true;
  state.dragStart = pos;
  state.dragCurrent = pos;
}

function onPointerMove(e) {
  if (state.phase !== 'cutting' && state.phase !== 'shading') return;
  e.preventDefault();
  const cvs = e.currentTarget;
  const pos = eventToCanvas(e, cvs);
  if (state.dragging) {
    state.dragCurrent = pos;
    redrawMain();
    return;
  }
  if (state.phase === 'shading') {
    const idx = wedgeIndexAt(pos.x, pos.y);
    if (idx !== state.hoverWedgeIdx) {
      state.hoverWedgeIdx = idx;
      redrawMain();
    }
  }
}

function onPointerUp(e) {
  if (state.phase !== 'cutting' && state.phase !== 'shading') return;
  e.preventDefault();
  const cvs = e.currentTarget;
  const pos = eventToCanvas(e, cvs);

  if (state.dragging && state.dragStart) {
    const dx = pos.x - state.dragStart.x, dy = pos.y - state.dragStart.y;
    const isTap = Math.sqrt(dx * dx + dy * dy) < 10;
    if (isTap) {
      if (state.phase === 'shading') {
        const idx = wedgeIndexAt(pos.x, pos.y);
        if (idx >= 0) toggleShading(idx);
      }
      finishDrag(); return;
    }
  }

  if (!state.dragging || !state.dragStart) return;
  if (state.phase === 'cutting') tryAddCut(state.dragStart, pos);
  finishDrag();
}

function finishDrag() {
  state.dragging = false; state.dragStart = null; state.dragCurrent = null;
  redrawMain();
}

function onPointerLeave(e) {
  if (state.dragging) finishDrag();
  state.hoverWedgeIdx = -1;
  redrawMain();
}

function tryAddCut(start, end) {
  if (state.cutAngles.length >= state.challenge.cuts) return;
  if (!isNearCenter(start.x, start.y)) return;

  const ratio = dragLengthRatio(start, end);
  if (ratio < CFG.MIN_DRAG_RATIO) { flashInvalid(); return; }

  const angle = dragToAngle(start, end);
  if (isDuplicateCut(angle)) { flashInvalid(); return; }

  state.cutAngles.push(angle);
  state.wedges = computeWedges();
  state.wedges.forEach(w => w.shaded = false);

  SoundManager.playCut();
  spawnCrumbs(angle);

  if (state.cutAngles.length === state.challenge.cuts) {
    if (state.challenge.type === 'slice') {
      checkAnswer();
    } else {
      state.phase = 'shading';
      setMascotSpeech('Now shade it! 🎨');
    }
  }

  redrawMain();
  updateUI();
}

function toggleShading(idx) {
  if (idx < 0 || idx >= state.wedges.length) return;
  SoundManager.playShade();
  state.wedges[idx].shaded = !state.wedges[idx].shaded;
  redrawMain();
  updateUI();
}

function flashInvalid() {
  SoundManager.playError();
  const canvas = getCanvas('pizzaCanvas');
  if (canvas) {
    canvas.classList.add('wrong-flash');
    setTimeout(() => canvas.classList.remove('wrong-flash'), CFG.FLASH_MS);
  }
}

/* ============================================================
   11. ANSWER CHECKING & MULTI CHOICE
   ============================================================ */

function checkAnswer(selectedAns = null, btnEl = null) {
  if (state.phase === 'checked') return;

  let isCorrect = false;
  let eduMsg = '';

  const c = state.challenge;

  if (state.phase === 'cutting' || state.phase === 'shading') {
    const wedgeCount = state.wedges.length;
    const shadedCount = state.wedges.filter(w => w.shaded).length;

    const correctCount = wedgeCount === c.d;
    const correctEqual = wedgesAreEqual(state.wedges);
    let correctShaded = true;
    if (c.type !== 'slice') correctShaded = shadedCount === c.n;

    isCorrect = correctCount && correctShaded && correctEqual;

    if (!isCorrect) {
      if (!correctCount) eduMsg = `Need ${c.d} equal slices. ✂️`;
      else if (!correctEqual) eduMsg = 'Make slices equal size!';
      else eduMsg = `Shade exactly ${c.n} slices! 🎨`;
    } else {
      eduMsg = c.type === 'slice' ? `Awesome! ${c.d} equal pieces!` : `${c.n} out of ${c.d} pieces are shaded!`;
    }
  } else if (['mc', 'equivalent', 'num_denom', 'complete_frac', 'word_problem', 'add', 'sub', 'mult', 'div', 'diff_denom'].includes(state.phase)) {
    isCorrect = (selectedAns === c.ans || selectedAns === `${c.n}/${c.d}`);
    if (c.type === 'mc') eduMsg = isCorrect ? `${c.n} parts out of ${c.d} are shaded.` : `Count the shaded parts.`;
    else if (c.type === 'equivalent') eduMsg = isCorrect ? `Yes! ${c.n}/${c.d} and ${c.ans} show the same amount.` : `Try to find the same amount visually.`;
    else if (c.type === 'num_denom') eduMsg = isCorrect ? `Correct!` : `Remember: top is shaded, bottom is total pieces.`;
    else if (c.type === 'complete_frac') eduMsg = isCorrect ? `Perfect match!` : `Think about equivalent amounts.`;
    else if (c.type === 'word_problem') eduMsg = isCorrect ? `Correct! ${c.ans} of the pizza was eaten.` : `Read carefully!`;
    else eduMsg = isCorrect ? `Great job! 🎉` : `Think about it and try again!`;
  } else if (state.phase === 'compare') {
    isCorrect = (selectedAns === c.ans);
    eduMsg = isCorrect ? `Great job comparing!` : `Let's look at the sizes again.`;
  } else if (state.phase === 'match') {
    isCorrect = (selectedAns === c.ansIdx);
    eduMsg = isCorrect ? `Yes! That pizza shows ${c.n}/${c.d}.` : `Look for ${c.n} shaded pieces out of ${c.d}.`;
  }

  if (isCorrect) {
    if (btnEl) btnEl.style.backgroundColor = '#4CAF50'; // Visual success feedback
    state.phase = 'checked';
    state.score += state.hintUsed ? 70 : 100;
    state.streak++;
    SoundManager.playSuccess();
    showFeedback(true, '', eduMsg);
    bumpScore();
    launchConfetti();
    setMascotSpeech('Great job! 🎉');

    // Disable all mc buttons
    document.querySelectorAll('.mc-btn').forEach(b => {
      b.disabled = true;
      b.style.pointerEvents = 'none';
      if (b !== btnEl) b.style.opacity = '0.5';
    });

    const cvs = getCanvas('pizzaCanvas');
    if (cvs) {
      cvs.classList.add('correct-flash');
      setTimeout(() => cvs.classList.remove('correct-flash'), CFG.FLASH_MS * 1.5);
    }

    // Auto-hide the "GREAT JOB!" overlay after 2 seconds and show the NEXT button
    let timeoutId = setTimeout(() => {
      hideFeedback();
      const ab = el('actionButtons'); if (ab) ab.style.display = 'none';
      const nbc = el('nextButtonContainer'); if (nbc) nbc.classList.remove('hidden'); // SHOW NEXT BUTTON
      const mc = el('multipleChoiceContainer');
      if (mc) mc.style.display = 'none'; // visually hide options so they must click NEXT
      const mpc = el('matchPizzaContainer');
      if (mpc) mpc.style.display = 'none';
    }, 2000);
    state.feedbackTimeout = timeoutId; // Keep reference to prevent overlap

  } else {
    if (btnEl) {
      btnEl.classList.add('wrong-shake');
      btnEl.style.backgroundColor = '#e74c3c';
      setTimeout(() => {
        btnEl.classList.remove('wrong-shake');
        btnEl.style.backgroundColor = '';
      }, 500);
    }
    state.streak = 0;
    SoundManager.playError();
    showFeedback(false, eduMsg);
    setMascotSpeech('Let\'s try again! 😊');

    const cvs = getCanvas('pizzaCanvas');
    if (cvs) {
      cvs.classList.add('wrong-flash');
      setTimeout(() => cvs.classList.remove('wrong-flash'), CFG.FLASH_MS);
    }
  }
  updateUI();
}

function handleOptionClick(opt, btnEl = null) {
  checkAnswer(opt, btnEl);
}

/* ============================================================
   12. UI UPDATES & DOM GENERATION
   ============================================================ */

function clearGameState() {
  if (state.feedbackTimeout) clearTimeout(state.feedbackTimeout);
  state.feedbackTimeout = null;
  state.cutAngles = []; state.wedges = [];
  state.dragging = false; state.dragStart = null; state.dragCurrent = null;
  state.hoverWedgeIdx = -1;
  state.hintUsed = false;
  el('hintPopup').classList.add('hidden');
  const nbc = el('nextButtonContainer');
  if (nbc) nbc.classList.add('hidden');
  hideFeedback();
}

function updateChallengePanel() {
  const c = state.challenge;
  if (!c.useVisual && c.type !== 'word_problem' && c.type !== 'num_denom' && c.type !== 'complete_frac') {
    el('fractionDisplay').style.display = 'none';
  } else if (c.n && c.d && c.type !== 'word_problem') {
    el('fractionDisplay').style.display = 'flex';
    el('fracNumerator').textContent = c.n;
    el('fracDenominator').textContent = c.d;
  } else {
    el('fractionDisplay').style.display = 'none'; // text only
  }
  el('challengeText').textContent = c.msg;
}

function updateUI() {
  if (!state.challenge) return;
  const c = state.challenge;

  if (state.phase !== 'checked' && (c.type === 'slice' || c.type === 'shade' || c.type === 'order')) {
    el('progressPips').style.display = 'flex';
    el('pipRowCuts').style.display = 'flex';
    el('pipRowShading').style.display = c.type === 'slice' ? 'none' : 'flex';

    const cutsDone = state.cutAngles.length;
    const shadedCount = state.wedges.filter(w => w.shaded).length;
    const cutsOk = cutsDone === c.cuts;
    const shadingOk = shadedCount === c.n && cutsOk;

    el('pipCuts').classList.toggle('done', cutsOk);
    el('pipShading').classList.toggle('done', shadingOk);
    el('pipCutsLabel').textContent = `${cutsDone} / ${c.cuts} cut${c.cuts !== 1 ? 's' : ''}`;
    el('pipShadingLabel').textContent = `${shadedCount} / ${c.n} shaded`;

    el('actionButtons').style.display = 'flex';
    el('btnCheck').disabled = (state.phase !== 'shading');
    el('btnUndo').disabled = (state.cutAngles.length === 0);
  } else {
    el('progressPips').style.display = 'none';
    if (state.phase !== 'checked') el('actionButtons').style.display = 'none';
  }

  const hbc = el('hintButtonContainer');
  if (hbc) {
    if (state.phase !== 'checked' && c.type !== 'slice' && c.type !== 'shade') {
      hbc.classList.remove('hidden');
    } else {
      hbc.classList.add('hidden');
    }
  }

  el('scoreDisplay').textContent = state.score;
  const pct = (state.challengeNumber / CFG.CHALLENGES_PER_LEVEL) * 100;
  el('progressFill').style.width = Math.min(pct, 100) + '%';
  el('challengeCounter').textContent = `Challenge ${state.challengeNumber} / ${CFG.CHALLENGES_PER_LEVEL}`;
  el('streakBadge').style.display = state.streak >= 2 ? 'flex' : 'none';
  el('streakDisplay').textContent = state.streak;
  el('streakEmoji').textContent = ['', '🔥', '🔥🔥', '⚡', '💫', '🌟', '🚀'][Math.min(state.streak, 6)];
}

function setMascotSpeech(text, lockMs = 1600) {
  const sp = el('mascotSpeech');
  if (!sp) return;
  sp.textContent = text;
  sp._locked = true;
  clearTimeout(sp._lockTimer);
  sp._lockTimer = setTimeout(() => { sp._locked = false; }, lockMs);
}

function renderFeedbackOverlay() {
  return `
    <div class="feedback-overlay" id="feedbackOverlay" aria-live="assertive">
      <div class="feedback-emoji" id="feedbackEmoji"></div>
      <div class="feedback-msg" id="feedbackText"></div>
      <div class="feedback-edu" id="feedbackEducational"></div>
      <div class="feedback-stars" id="feedbackStars"></div>
    </div>
  `;
}

function renderMascotSidebar() {
  return `
    <div class="mascot-sidebar">
      <div class="mascot-small" id="gameMascot">
        <div class="mascot-hat sm"></div>
        <div class="mascot-body sm">
          <div class="mascot-face sm">
            <div class="m-eye left"></div>
            <div class="m-eye right"></div>
            <div class="m-smile" id="mascotMouth"></div>
            <div class="m-blush left"></div>
            <div class="m-blush right"></div>
          </div>
        </div>
      </div>
      <div class="mascot-bubble" id="mascotSpeech">Let's slice! ✂️</div>
    </div>
  `;
}

function showFeedback(isCorrect, detail = '', edu = '') {
  const overlay = el('feedbackOverlay');
  if (!overlay) return;
  overlay.classList.add('visible');

  if (isCorrect) {
    el('feedbackEmoji').textContent = '🌟';
    el('feedbackText').textContent = ['🎉 GREAT JOB!', '🌟 PERFECT!', '🍕 AMAZING!', '🏆 AWESOME!'][Math.floor(Math.random() * 4)];
    el('feedbackEducational').textContent = edu;
    el('feedbackEducational').style.display = 'block';
    el('feedbackStars').textContent = '⭐⭐⭐';
    el('feedbackStars').style.display = 'block';
  } else {
    el('feedbackEmoji').textContent = '😊';
    el('feedbackText').textContent = detail || 'Almost there! Try again!';
    el('feedbackEducational').style.display = 'none';
    el('feedbackStars').style.display = 'none';
    setTimeout(() => { hideFeedback(); }, 2000);
  }
}

function hideFeedback() {
  const overlay = el('feedbackOverlay');
  if (overlay) overlay.classList.remove('visible');
}

function bumpScore() {
  const sv = el('scoreDisplay');
  sv.classList.remove('bump'); void sv.offsetWidth; sv.classList.add('bump');
  setTimeout(() => sv.classList.remove('bump'), 500);
}

function launchConfetti() {
  const container = el('confettiContainer'); container.innerHTML = '';
  const colors = ['#FFD93D', '#e74c3c', '#6BCB77', '#4D96FF', '#FF6B9D', '#C77DFF', '#FF6B2B', '#ffffff'];
  for (let i = 0; i < CFG.CONFETTI_COUNT; i++) {
    const p = document.createElement('div'); p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw'; p.style.top = '-20px';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
    p.style.width = p.style.height = (6 + Math.random() * 10) + 'px';
    p.style.animationDuration = (0.9 + Math.random() * 0.9) + 's';
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    container.appendChild(p);
  }
  setTimeout(() => { container.innerHTML = ''; }, 2200);
}

function spawnCrumbs(angle) {
  const { cx, cy, r } = state;
  const container = el('confettiContainer');
  const canvas = getCanvas('pizzaCanvas');
  if (!canvas) return;
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div'); p.className = 'confetti-piece';
    const dist = r * (0.3 + Math.random() * 0.6);
    const px = cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 22;
    const py = cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 22;
    const rect = canvas.getBoundingClientRect();
    const dpr = getDPI();
    p.style.left = (rect.left + px * (rect.width / canvas.width * dpr)) + 'px';
    p.style.top = (rect.top + py * (rect.height / canvas.height * dpr)) + 'px';
    p.style.backgroundColor = ['#FFD93D', '#e74c3c', '#6BCB77'][Math.floor(Math.random() * 3)];
    p.style.width = p.style.height = (4 + Math.random() * 4) + 'px';
    p.style.animationDuration = '.6s';
    container.appendChild(p);
  }
  setTimeout(() => { container.innerHTML = ''; }, 700);
}

/* ============================================================
   13. SCREEN MANAGEMENT & FLOW
   ============================================================ */

function switchScreen(id) {
  ['startScreen', 'howToPlayScreen', 'levelMapScreen', 'gameScreen', 'levelCompleteScreen', 'completionScreen']
    .forEach(s => el(s).classList.toggle('hidden', s !== id));
}

function initMap() {
  const grid = el('levelGrid');
  grid.innerHTML = '';
  LEVELS.forEach((lvl, idx) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.disabled = lvl.id > sessionState.unlockedLevels;

    let stars = sessionState.levelStars[idx] || 0;
    if (stars > 0) btn.classList.add('completed');

    let starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    if (stars === 0 && btn.disabled) starStr = '🔒';

    btn.innerHTML = `<span class="level-icon">${lvl.icon}</span>Level ${lvl.id}<div class="level-stars">${starStr}</div>`;
    btn.onclick = () => { SoundManager.playClick(); startGameLevel(lvl.id); };
    grid.appendChild(btn);
  });
}

function startGameLevel(levelId) {
  clearGameState();
  hideFeedback();
  state.currentLevel = levelId;
  state.challengeNumber = 0;
  state.score = 0;
  state.streak = 0;
  const lvlDef = LEVELS[levelId - 1];
  el('levelTitleDisplay').textContent = `${lvlDef.icon} ${lvlDef.title}`;

  if (levelId === 7 || levelId === 15 || levelId === 16) {
    el('timerContainer').classList.remove('hidden');
    state.timeLeft = levelId >= 15 ? 120 : 60;
    el('timeDisplay').textContent = state.timeLeft;
    state.timerId = setInterval(() => {
      state.timeLeft--;
      el('timeDisplay').textContent = state.timeLeft;
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        endLevel();
      }
    }, 1000);
  } else {
    el('timerContainer').classList.add('hidden');
  }

  switchScreen('gameScreen');
  getAudioCtx();
  startNewQuestion();
}

function startNewQuestion() {
  if (state.challengeNumber >= CFG.CHALLENGES_PER_LEVEL) {
    endLevel();
    return;
  }

  clearGameState();

  state.challengeNumber++;
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 20) {
    state.challenge = generateChallengeForLevel(state.currentLevel);
    const c = state.challenge;
    if (!c || !c.msg) { attempts++; continue; }

    // Validate options exist and contain the correct answer
    const needsOpts = ['mc', 'num_denom', 'complete_frac', 'word_problem', 'equivalent', 'add', 'sub', 'mult', 'div', 'diff_denom'];
    if (needsOpts.includes(c.type)) {
      const correctAns = c.ans || `${c.n}/${c.d}`;
      if (!c.opts || !Array.isArray(c.opts) || c.opts.length < 2 || !c.opts.includes(correctAns)) {
        attempts++;
        continue;
      }
    } else if (c.type === 'match') {
      if (!c.pizzas || c.pizzas.length < 3) { attempts++; continue; }
    }

    valid = true;
  }

  const c = state.challenge;

  if (c.type === 'compare') state.phase = 'compare';
  else if (c.type === 'match') state.phase = 'match';
  else if (c.type === 'slice') state.phase = c.cuts === 0 ? 'shading' : 'cutting';
  else if (c.type === 'shade' || c.type === 'order') state.phase = 'cutting';
  else state.phase = c.type; // 'mc', 'add', 'sub', etc.



  state.toppings = generateToppings(150);

  updateChallengePanel();

  // DYNAMICALLY RENDER THE EXACT UI NEEDED FOR THIS CHALLENGE
  renderLevelUI();
  updateUI();

  const hints = {
    'mc': 'Read carefully!', 'match': 'Find the match!', 'compare': 'Which is bigger?', 'cutting': "Let's slice! ✂️"
  };
  setMascotSpeech(hints[state.phase] || "Let's go! 🍕");
}

function renderLevelUI() {
  const gameArea = el('gameArea');
  gameArea.innerHTML = ''; // Wipe everything!

  const c = state.challenge;
  const t = c.type;

  let html = '';

  if (t === 'compare' || t === 'add') {
    // LEVEL 5 / 10 - COMPARE/ADD: Only show two pizzas and answer choices.
    html += `
      <div id="specialGameArea" class="special-area">
        <div id="dualPizzaContainer" class="dual-pizza">
          <div class="pizza-side">
            <canvas id="pizzaCanvasA"></canvas>
            <div class="pizza-label">Pizza A</div>
          </div>
          <div class="pizza-side">
            <canvas id="pizzaCanvasB"></canvas>
            <div class="pizza-label">Pizza B</div>
          </div>
        </div>
        <div id="multipleChoiceContainer" class="mc-container"></div>
      </div>
    `;
    html += renderFeedbackOverlay();
    gameArea.innerHTML = html;

    redrawStaticPizza('pizzaCanvasA', c.f1);
    redrawStaticPizza('pizzaCanvasB', c.f2);

    const mc = el('multipleChoiceContainer');
    mc.innerHTML = '';
    mc.style.display = 'flex'; // Explicitly guarantee visibility
    if (t === 'compare') {
      [{ l: 'Pizza A', v: 'A' }, { l: 'Same', v: '=' }, { l: 'Pizza B', v: 'B' }].forEach(o => {
        const btn = document.createElement('button');
        btn.className = 'mc-btn'; btn.textContent = o.l;
        btn.onclick = (e) => { SoundManager.playClick(); handleOptionClick(o.v, e.target); };
        mc.appendChild(btn);
      });
    } else {
      c.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'mc-btn'; btn.textContent = opt;
        btn.onclick = (e) => { SoundManager.playClick(); handleOptionClick(opt, e.target); };
        mc.appendChild(btn);
      });
    }

  } else if (t === 'match') {
    // LEVEL 8/9 - MATCH: Only show target fraction and 3 small pizzas
    html += `
      <div id="specialGameArea" class="special-area">
        <div id="matchPizzaContainer" class="match-pizza"></div>
      </div>
    `;
    html += renderFeedbackOverlay();
    gameArea.innerHTML = html;

    const mc = el('matchPizzaContainer');
    mc.innerHTML = '';
    mc.style.display = 'flex';
    c.pizzas.forEach((pFrac, idx) => {
      const wrapper = document.createElement('div'); wrapper.className = 'match-pizza-side';
      const canv = document.createElement('canvas'); canv.id = 'matchCanvas' + idx;
      wrapper.appendChild(canv);
      mc.appendChild(wrapper);

      setTimeout(() => {
        redrawStaticPizza(canv.id, pFrac);
        canv.onclick = (e) => { SoundManager.playClick(); handleOptionClick(idx, canv); };
      }, 0);
    });
  } else if (t === 'mc' || t === 'equivalent' || t === 'sub') {
    // LEVEL 3/6/11 - FIND / EQUIVALENT / SUB: Show one static pizza, options, NO cutter.
    html += `
      <div id="specialGameArea" class="special-area">
        <div class="pizza-wrapper" id="pizzaWrapper">
          <canvas id="pizzaCanvas" role="img" aria-label="Visual representation"></canvas>
        </div>
        <div id="multipleChoiceContainer" class="mc-container"></div>
      </div>
    `;
    html += renderFeedbackOverlay();
    gameArea.innerHTML = html;

    resizeMainCanvas();
    let n = c.n, d = c.d;
    if (t === 'sub') { n = c.f1.n; d = c.f1.d; }
    
    const ideal = (Math.PI * 2) / d;
    for (let i = 0; i < d; i++) state.cutAngles.push(-Math.PI / 2 + (i * ideal));
    state.wedges = computeWedges();
    for (let i = 0; i < n; i++) if (state.wedges[i]) state.wedges[i].shaded = true;
    redrawMain();

    const mc = el('multipleChoiceContainer');
    mc.innerHTML = '';
    mc.style.display = 'flex';
    c.opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'mc-btn'; btn.textContent = opt;
      btn.onclick = (e) => { SoundManager.playClick(); handleOptionClick(opt, e.target); };
      mc.appendChild(btn);
    });
  } else if (t === 'num_denom' || t === 'complete_frac' || t === 'word_problem' || t === 'mult' || t === 'div' || t === 'diff_denom') {
    // LEVEL 4/7/10/12/13/14 - TEXT/MATH ONLY: Show question and options, NO pizza.
    html += `
      <div id="specialGameArea" class="special-area">
        <div id="multipleChoiceContainer" class="mc-container"></div>
      </div>
    `;
    html += renderFeedbackOverlay();
    gameArea.innerHTML = html;

    const mc = el('multipleChoiceContainer');
    mc.innerHTML = '';
    mc.style.display = 'flex';
    c.opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'mc-btn'; btn.textContent = opt;
      btn.onclick = (e) => { SoundManager.playClick(); handleOptionClick(opt, e.target); };
      mc.appendChild(btn);
    });
  } else {
    // LEVEL 1/2/8 - SLICE/SHADE/ORDER: Show main interactive pizza, cutter controls, and mascot.
    html += `
      <div class="pizza-wrapper" id="pizzaWrapper">
        <canvas id="pizzaCanvas" role="img" aria-label="Interactive pizza for cutting and shading"></canvas>
        ${renderFeedbackOverlay()}
      </div>
      ${renderMascotSidebar()}
    `;
    gameArea.innerHTML = html;

    resizeMainCanvas();
    redrawMain();

    // Attach event listeners explicitly to the newly created canvas
    const canvas = getCanvas('pizzaCanvas');
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerLeave);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp, { passive: false });
    canvas.addEventListener('touchcancel', onPointerLeave, { passive: false });
  }
}

function endLevel() {
  if (state.timerId) clearInterval(state.timerId);
  clearGameState();

  let starsEarned = 1;
  if (state.score >= 30) starsEarned = 2;
  if (state.score >= 50) starsEarned = 3;

  const idx = state.currentLevel - 1;
  if (starsEarned > sessionState.levelStars[idx]) {
    sessionState.levelStars[idx] = starsEarned;
  }

  if (state.currentLevel === sessionState.unlockedLevels && state.currentLevel < 16) {
    sessionState.unlockedLevels++;
  }

  sessionState.totalScore += state.score;

  if (state.currentLevel === 16) {
    el('finalScoreDisplay').textContent = sessionState.totalScore;
    el('finalStarsDisplay').textContent = sessionState.levelStars.reduce((a, b) => a + b, 0);
    switchScreen('completionScreen');
    SoundManager.playFanfare();
    launchConfetti();
  } else {
    el('levelStarsDisplay').textContent = '⭐'.repeat(starsEarned);
    el('levelScoreDisplay').textContent = state.score;
    const lvlTitle = LEVELS[state.currentLevel - 1].title;
    el('levelCompleteSub').textContent = `Great job on ${lvlTitle.split(':')[0]}!`;
    switchScreen('levelCompleteScreen');
    SoundManager.playSuccess();
    launchConfetti();
  }
}

/* ============================================================
   14. EVENT LISTENERS
   ============================================================ */

el('btnStartGame').addEventListener('click', () => { SoundManager.playClick(); switchScreen('levelMapScreen'); initMap(); });
el('btnHowToPlay').addEventListener('click', () => { SoundManager.playClick(); switchScreen('howToPlayScreen'); });
el('btnHowToBack').addEventListener('click', () => { SoundManager.playClick(); switchScreen('startScreen'); });

el('btnBackToMap').addEventListener('click', () => { if (state.timerId) clearInterval(state.timerId); SoundManager.playClick(); switchScreen('levelMapScreen'); initMap(); });
el('btnBackToMapFromLevel').addEventListener('click', () => { SoundManager.playClick(); switchScreen('levelMapScreen'); initMap(); });
el('btnBackToMapFromEnd').addEventListener('click', () => { SoundManager.playClick(); switchScreen('levelMapScreen'); initMap(); });

el('btnNextLevel').addEventListener('click', () => { SoundManager.playClick(); startGameLevel(state.currentLevel + 1); });
el('btnPlayAgain').addEventListener('click', () => {
  sessionState.unlockedLevels = 1; sessionState.levelStars.fill(0); sessionState.totalScore = 0;
  SoundManager.playClick(); switchScreen('levelMapScreen'); initMap();
});

el('btnCheck').addEventListener('click', () => { SoundManager.playClick(); checkAnswer(); });
el('btnReset').addEventListener('click', () => { SoundManager.playClick(); startGameLevel(state.currentLevel); });
el('btnUndo').addEventListener('click', () => {
  SoundManager.playClick();
  if (state.cutAngles.length === 0) return;
  state.cutAngles.pop();
  state.wedges = state.cutAngles.length > 0 ? computeWedges() : [];
  state.wedges.forEach(w => w.shaded = false);
  if (state.phase === 'shading') state.phase = 'cutting';
  setMascotSpeech('No worries! ✂️');
  updateUI(); redrawMain();
});

el('btnHint').addEventListener('click', () => {
  SoundManager.playClick();
  state.hintUsed = true;
  const hp = el('hintPopup');
  const ht = el('hintText');
  let hintMsg = "Think about the problem!";
  const t = state.challenge.type;
  if (t === 'add') hintMsg = "The denominators are the same. Add the numerators: " + state.challenge.f1.n + " + " + state.challenge.f2.n;
  else if (t === 'sub') hintMsg = "Keep the denominator the same and subtract the numerators.";
  else if (t === 'compare') hintMsg = "Look at how much of each pizza is shaded.";
  else if (t === 'equivalent') hintMsg = "Multiply or divide the top and bottom by the same number.";
  else if (t === 'mult') hintMsg = "Try multiplying the numerators together and the denominators together.";
  else if (t === 'div') hintMsg = "Think about how many pieces of this size fit inside the other fraction.";
  else if (t === 'diff_denom') hintMsg = "First try to make the denominators the same.";
  else if (t === 'num_denom') hintMsg = "The numerator is on top, denominator is on bottom.";
  
  ht.textContent = hintMsg;
  hp.classList.remove('hidden');
});

el('btnHintClose').addEventListener('click', () => {
  SoundManager.playClick();
  el('hintPopup').classList.add('hidden');
});

el('btnNextChallenge').addEventListener('click', () => {
  SoundManager.playClick();
  startNewQuestion();
});

['btnSoundStart', 'btnSoundMap', 'btnSoundGame'].forEach(id => {
  el(id).addEventListener('click', (e) => {
    soundEnabled = !soundEnabled;
    const txt = soundEnabled ? '🔊' : '🔇';
    ['btnSoundStart', 'btnSoundMap', 'btnSoundGame'].forEach(btn => {
      el(btn).textContent = txt;
      el(btn).classList.toggle('muted', !soundEnabled);
    });
  });
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeMainCanvas();
    if (state.phase === 'compare') {
      redrawStaticPizza('pizzaCanvasA', state.challenge.f1);
      redrawStaticPizza('pizzaCanvasB', state.challenge.f2);
    } else if (state.phase === 'match') {
      state.challenge.pizzas.forEach((pFrac, idx) => redrawStaticPizza('matchCanvas' + idx, pFrac));
    } else {
      redrawMain();
    }
  }, 120);
});

// Init
switchScreen('startScreen');
