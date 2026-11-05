/**
 * ============================================================
 *  Pizza Fraction Adventure — game.js
 *  Kid-friendly cartoon educational fraction game.
 *
 *  - Cartoon Kitchen Theme with Chef Mascot
 *  - Realistic but cute cartoon pizza on wooden peel
 *  - Animated cartoon pizza knife/cutter following mouse/finger
 *  - Satisfying Web Audio sound effects
 *  - Dynamic fractions (1/2, 1/4, 3/4, 2/3, 5/8, etc.)
 *  - Preserves all 16 levels and existing functionality!
 * ============================================================
 */

'use strict';

/* ============================================================
   1. CONFIG & CONSTANTS
   ============================================================ */

const CFG = {
  PIZZA_SIZE_FACTOR: 0.68,
  MAX_PIZZA_PX: 460,
  MIN_PIZZA_PX: 280,

  R_OUTER: 1.00,
  R_CRUST: 0.90,
  R_SAUCE: 0.83,
  R_CHEESE: 0.78,

  CENTER_SNAP_RATIO: 0.38,
  MIN_DRAG_RATIO: 0.30,
  DUPLICATE_ANG_DEG: 10,
  EQUAL_TOLERANCE: 0.22, // Kid-friendly equal tolerance

  SHADE_COLOR: 'rgba(255, 204, 0, 0.55)',
  SHADE_HOVER_COLOR: 'rgba(255, 230, 100, 0.35)',

  FLASH_MS: 600,
  CONFETTI_COUNT: 75,
  CHALLENGES_PER_LEVEL: 5,
};

/* ============================================================
   2. AUDIO SYSTEM (BACKGROUND MUSIC & SOUND EFFECTS)
   ============================================================ */

let audioCtx = null;
let sfxGainNode = null;
let bgmGainNode = null;

// Persistent audio settings
let soundEnabled = true;
let musicEnabled = true;
try {
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem('pizza_sfx') === 'false') soundEnabled = false;
    if (localStorage.getItem('pizza_music') === 'false') musicEnabled = false;
  }
} catch (e) {}

function getAudioCtx() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) {
      audioCtx = new AudioCtor();
      sfxGainNode = audioCtx.createGain();
      sfxGainNode.gain.setValueAtTime(soundEnabled ? 0.40 : 0, audioCtx.currentTime);
      sfxGainNode.connect(audioCtx.destination);

      bgmGainNode = audioCtx.createGain();
      bgmGainNode.gain.setValueAtTime(musicEnabled ? 0.09 : 0, audioCtx.currentTime);
      bgmGainNode.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Procedural Cheerful Background Music Engine (Warm, soft cartoon pizzeria tune)
const BGM = {
  timer: null,
  step: 0,
  tempo: 112, // BPM
  isPlaying: false,

  // 16-step upbeat cheerful cartoon Italian kitchen melody in C Major
  melody: [
    { f: 523.25, b: 130.81, d: 0.22 }, // C5, C3
    { f: 659.25, b: null,   d: 0.20 }, // E5
    { f: 783.99, b: 196.00, d: 0.22 }, // G5, G3
    { f: 659.25, b: null,   d: 0.20 }, // E5
    { f: 880.00, b: 110.00, d: 0.24 }, // A5, A2
    { f: 783.99, b: null,   d: 0.20 }, // G5
    { f: 659.25, b: 164.81, d: 0.22 }, // E5, E3
    { f: 523.25, b: null,   d: 0.20 }, // C5
    { f: 698.46, b: 174.61, d: 0.24 }, // F5, F3
    { f: 880.00, b: null,   d: 0.20 }, // A5
    { f: 1046.50, b: 130.81, d: 0.26 }, // C6, C3
    { f: 880.00, b: null,   d: 0.20 }, // A5
    { f: 783.99, b: 98.00,  d: 0.24 }, // G5, G2
    { f: 659.25, b: null,   d: 0.20 }, // E5
    { f: 587.33, b: 146.83, d: 0.22 }, // D5, D3
    { f: 523.25, b: 196.00, d: 0.35 }  // C5 (cheerfully sustained)
  ],

  start() {
    if (this.isPlaying) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    this.isPlaying = true;
    const stepDuration = 60 / this.tempo / 2; // 8th note interval ~ 0.267s
    this.timer = setInterval(() => {
      this._playStep();
    }, stepDuration * 1000);
    this._playStep();
  },

  _playStep() {
    if (!musicEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx || ctx.state !== 'running' || !bgmGainNode) return;

    const item = this.melody[this.step % this.melody.length];
    this.step++;

    const t = ctx.currentTime;
    // 1. Soft Marimba Lead
    if (item.f) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(item.f, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.38, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + item.d);

        osc.connect(gain);
        gain.connect(bgmGainNode);
        osc.start(t);
        osc.stop(t + item.d + 0.02);
      } catch (e) {}
    }

    // 2. Pizzicato Acoustic Bass Note
    if (item.b) {
      try {
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(item.b, t);

        bGain.gain.setValueAtTime(0, t);
        bGain.gain.linearRampToValueAtTime(0.28, t + 0.02);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + item.d * 1.5);

        bOsc.connect(bGain);
        bGain.connect(bgmGainNode);
        bOsc.start(t);
        bOsc.stop(t + item.d * 1.5 + 0.02);
      } catch (e) {}
    }
  },

  updateVolume() {
    if (!bgmGainNode || !audioCtx) return;
    bgmGainNode.gain.setValueAtTime(musicEnabled ? 0.09 : 0, audioCtx.currentTime);
  }
};

const SoundManager = {
  _playTone(freq, type, duration, vol, delay = 0, freqEnd = null) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx || !sfxGainNode) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + duration);
      }
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(sfxGainNode);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (e) { }
  },

  _playNoise(duration, vol, filterFreq = 3000, delay = 0) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx || !sfxGainNode) return;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGainNode);
      noise.start(t);
    } catch (e) { }
  },

  playCut() {
    // Satisfying crispy crust slice: noise crunch + sharp blade swoosh!
    this._playNoise(0.18, 0.32, 2600, 0);
    this._playNoise(0.10, 0.22, 4500, 0.03);
    this._playTone(540, 'triangle', 0.15, 0.22, 0.01, 260);
    this._playTone(320, 'sine', 0.12, 0.18, 0.02, 160);
  },

  playClick() {
    // Subtle tactile wooden button pop
    this._playTone(680, 'sine', 0.05, 0.18, 0, 480);
  },

  playShade() {
    // Bubbly cheese slice pop chime
    this._playTone(587.33, 'sine', 0.12, 0.22, 0, 880);
    this._playTone(1174.66, 'triangle', 0.08, 0.12, 0.03);
  },

  playUndo() {
    // Soft reverse whoosh / paper flick
    this._playTone(280, 'sine', 0.10, 0.18, 0, 440);
  },

  playCorrect() {
    // Cheerful "Good Job!" arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      this._playTone(f, 'triangle', 0.22, 0.28, i * 0.09);
      this._playTone(f * 2, 'sine', 0.14, 0.10, i * 0.09 + 0.02);
    });
  },

  playExcellent() {
    // Triumphant "Excellent!" sparkle chime for streaks and exceptional performance
    const sparkleNotes = [659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];
    sparkleNotes.forEach((f, i) => {
      this._playTone(f, 'sine', 0.24, 0.22, i * 0.07);
      this._playTone(f * 1.5, 'triangle', 0.16, 0.10, i * 0.07 + 0.02);
    });
  },

  playError() {
    // Gentle friendly boing: encouraging and non-punitive
    this._playTone(320, 'triangle', 0.22, 0.18, 0, 220);
    this._playTone(220, 'sine', 0.26, 0.14, 0.08, 150);
  },

  playFanfare() {
    // Celebratory level completion fanfare!
    const fanfareNotes = [
      { f: 523.25, d: 0.12, t: 0.00 },
      { f: 659.25, d: 0.12, t: 0.12 },
      { f: 783.99, d: 0.14, t: 0.24 },
      { f: 1046.50, d: 0.35, t: 0.38 },
      { f: 880.00, d: 0.14, t: 0.72 },
      { f: 1046.50, d: 0.45, t: 0.88 },
      { f: 1318.51, d: 0.60, t: 1.05 }
    ];
    fanfareNotes.forEach(n => {
      this._playTone(n.f, 'triangle', n.d, 0.28, n.t);
      this._playTone(n.f * 1.5, 'sine', n.d * 0.7, 0.12, n.t + 0.02);
    });
  },

  updateVolume() {
    if (!sfxGainNode || !audioCtx) return;
    sfxGainNode.gain.setValueAtTime(soundEnabled ? 0.40 : 0, audioCtx.currentTime);
  }
};

/* ============================================================
   SPOKEN ACHIEVEMENT VOICE FEEDBACK (Web Speech API)
   Plays: "Good Job!", "Great Job!", "Brilliant!", "Excellent!", "Wonderful!", "Amazing!"
   ============================================================ */

const VoiceManager = {
  speak(phrase) {
    if (!soundEnabled) return;

    // 1. Never overlap multiple voices — cancel previous speech immediately
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // 2. Play matching celebratory sound chime
    if (phrase === 'Wonderful!' || phrase === 'Amazing!') {
      SoundManager.playFanfare();
    } else if (phrase === 'Excellent!' || phrase === 'Brilliant!') {
      SoundManager.playExcellent();
    } else {
      SoundManager.playCorrect();
    }

    // 3. Spoken achievement voice
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.rate = 1.0;   // Natural, soft child-friendly pace
        utter.pitch = 1.2;  // Warm, friendly soft pitch
        utter.volume = 0.9; // Comfortable, soft volume

        // Choose a friendly soft English voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const pref = voices.find(v => v.lang.startsWith('en') && (
            v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || 
            v.name.includes('Zira') || v.name.includes('Jenny') || v.name.includes('Victoria')
          )) || voices.find(v => v.lang.startsWith('en'));
          if (pref) utter.voice = pref;
        }

        window.speechSynthesis.speak(utter);
      } catch (err) {
        console.warn('Voice synthesis error:', err);
      }
    }
  },

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
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
  pointerPos: null,
  isPointerOver: false,
  cutterWheelRot: 0,
  hoverWedgeIdx: -1,
  toppings: [],

  timerId: null,
  timeLeft: 0,
  hintUsed: false,
  feedbackTimeout: null,
};

const el = id => document.getElementById(id);

/* ============================================================
   4. LEVELS & DYNAMIC FRACTIONS (16 COMPLETE LEVELS)
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

// Rich pool of kid-friendly educational fractions including 1/2, 1/4, 3/4, 2/3, 5/8
const COMMON_FRACTIONS = [
  { n: 1, d: 2 },
  { n: 1, d: 4 },
  { n: 3, d: 4 },
  { n: 2, d: 3 },
  { n: 5, d: 8 },
  { n: 1, d: 3 },
  { n: 2, d: 4 },
  { n: 3, d: 8 },
  { n: 7, d: 8 },
  { n: 2, d: 5 },
  { n: 3, d: 5 },
  { n: 4, d: 5 },
  { n: 5, d: 6 }
];

// Curated, pedagogical 5-sublevel progression for ALL 16 levels
// Guarantees that EVERY sublevel within EVERY level has a 100% unique mathematical problem
const LEVEL_SUBLEVEL_CHALLENGES = {
  // Level 1: Slice It (Halves to Eighths)
  1: [
    { type: 'slice', n: 1, d: 2, cuts: 1, msg: "Cut the pizza into 2 equal pieces! (Each piece is 1/2)", useVisual: true },
    { type: 'slice', n: 1, d: 3, cuts: 2, msg: "Cut the pizza into 3 equal pieces! (Each piece is 1/3)", useVisual: true },
    { type: 'slice', n: 1, d: 4, cuts: 3, msg: "Cut the pizza into 4 equal pieces! (Each piece is 1/4)", useVisual: true },
    { type: 'slice', n: 1, d: 6, cuts: 5, msg: "Cut the pizza into 6 equal pieces! (Each piece is 1/6)", useVisual: true },
    { type: 'slice', n: 1, d: 8, cuts: 7, msg: "Cut the pizza into 8 equal pieces! (Each piece is 1/8)", useVisual: true }
  ],

  // Level 2: Shade It (Distinct fractions across all 5 sublevels)
  2: [
    { type: 'shade', n: 1, d: 2, cuts: 0, msg: "Tap the slices to shade 1/2 of the pizza! (1 slice)", useVisual: true },
    { type: 'shade', n: 2, d: 3, cuts: 0, msg: "Tap the slices to shade 2/3 of the pizza! (2 slices)", useVisual: true },
    { type: 'shade', n: 3, d: 4, cuts: 0, msg: "Tap the slices to shade 3/4 of the pizza! (3 slices)", useVisual: true },
    { type: 'shade', n: 2, d: 5, cuts: 0, msg: "Tap the slices to shade 2/5 of the pizza! (2 slices)", useVisual: true },
    { type: 'shade', n: 5, d: 8, cuts: 0, msg: "Tap the slices to shade 5/8 of the pizza! (5 slices)", useVisual: true }
  ],

  // Level 3: Find the Fraction (Multiple Choice)
  3: [
    { type: 'mc', n: 1, d: 3, ans: '1/3', opts: ['1/3', '2/3', '3/3'], msg: "What fraction of this pizza is shaded? (1 out of 3 slices)", useVisual: true },
    { type: 'mc', n: 1, d: 4, ans: '1/4', opts: ['1/4', '2/4', '3/4'], msg: "What fraction of this pizza is shaded? (1 out of 4 slices)", useVisual: true },
    { type: 'mc', n: 3, d: 4, ans: '3/4', opts: ['3/4', '1/4', '2/4'], msg: "What fraction of this pizza is shaded? (3 out of 4 slices)", useVisual: true },
    { type: 'mc', n: 3, d: 5, ans: '3/5', opts: ['3/5', '2/5', '4/5'], msg: "What fraction of this pizza is shaded? (3 out of 5 slices)", useVisual: true },
    { type: 'mc', n: 5, d: 8, ans: '5/8', opts: ['5/8', '3/8', '7/8'], msg: "What fraction of this pizza is shaded? (5 out of 8 slices)", useVisual: true }
  ],

  // Level 4: Numerator/Denominator (Concept & Meaning)
  4: [
    { type: 'num_denom', n: 3, d: 4, askNum: false, ans: "Total equal pieces", opts: ["Total equal pieces", "Shaded pieces", "Number of pizzas"], msg: "In 3/4, what does the 4 tell us?", useVisual: false },
    { type: 'num_denom', n: 2, d: 5, askNum: true, ans: "Shaded pieces", opts: ["Shaded pieces", "Total equal pieces", "Pizza slices left"], msg: "In 2/5, what does the 2 tell us?", useVisual: false },
    { type: 'num_denom', n: 5, d: 8, askNum: false, ans: "Total equal pieces", opts: ["Total equal pieces", "Shaded pieces", "Number of chefs"], msg: "In 5/8, what does the 8 tell us?", useVisual: false },
    { type: 'num_denom', n: 1, d: 3, askNum: true, ans: "Shaded pieces", opts: ["Shaded pieces", "Total equal pieces", "Oven temperature"], msg: "In 1/3, what does the 1 tell us?", useVisual: false },
    { type: 'num_denom', n: 7, d: 8, askNum: true, ans: "Shaded pieces", opts: ["Shaded pieces", "Total equal pieces", "Number of toppings"], msg: "In 7/8, what does the 7 tell us?", useVisual: false }
  ],

  // Level 5: Compare Fractions (Pizza A vs Pizza B)
  5: [
    { type: 'compare', f1: { n: 1, d: 2 }, f2: { n: 1, d: 4 }, ans: 'A', msg: "Which pizza has more shaded cheese? (1/2 vs 1/4)", useVisual: true },
    { type: 'compare', f1: { n: 2, d: 4 }, f2: { n: 3, d: 4 }, ans: 'B', msg: "Which pizza has a larger shaded portion? (2/4 vs 3/4)", useVisual: true },
    { type: 'compare', f1: { n: 2, d: 3 }, f2: { n: 1, d: 3 }, ans: 'A', msg: "Which pizza has more melted cheese? (2/3 vs 1/3)", useVisual: true },
    { type: 'compare', f1: { n: 2, d: 4 }, f2: { n: 1, d: 2 }, ans: '=', msg: "Compare Pizza A (2/4) and Pizza B (1/2) — which is bigger?", useVisual: true },
    { type: 'compare', f1: { n: 3, d: 8 }, f2: { n: 5, d: 8 }, ans: 'B', msg: "Which pizza has more shaded slices? (3/8 vs 5/8)", useVisual: true }
  ],

  // Level 6: Equivalent Fractions (Visual equivalents)
  6: [
    { type: 'equivalent', n: 1, d: 2, ans: '2/4', opts: ['1/4', '2/4', '3/4', '4/4'], msg: "Which fraction shows the same amount as 1/2?", useVisual: true },
    { type: 'equivalent', n: 1, d: 3, ans: '2/6', opts: ['1/6', '2/6', '3/6', '4/6'], msg: "Which fraction shows the same amount as 1/3?", useVisual: true },
    { type: 'equivalent', n: 2, d: 4, ans: '1/2', opts: ['1/2', '2/2', '1/3', '2/3'], msg: "Which fraction shows the same amount as 2/4?", useVisual: true },
    { type: 'equivalent', n: 3, d: 4, ans: '6/8', opts: ['4/8', '5/8', '6/8', '7/8'], msg: "Which fraction shows the same amount as 3/4?", useVisual: true },
    { type: 'equivalent', n: 4, d: 8, ans: '1/2', opts: ['1/2', '1/4', '3/4', '2/8'], msg: "Which fraction shows the same amount as 4/8?", useVisual: true }
  ],

  // Level 7: Complete the Fraction (Blackboard equivalent math - 5 GENUINELY DIFFERENT QUESTIONS)
  7: [
    { type: 'complete_frac', f1: { n: 1, d: 2 }, ans: '3/6', opts: ['2/6', '3/6', '4/6', '5/6'], msg: "1/2 is equal to which of these?", useVisual: false },
    { type: 'complete_frac', f1: { n: 2, d: 3 }, ans: '4/6', opts: ['3/6', '4/6', '5/6', '2/6'], msg: "2/3 is equal to which of these?", useVisual: false },
    { type: 'complete_frac', f1: { n: 1, d: 4 }, ans: '2/8', opts: ['1/8', '2/8', '3/8', '4/8'], msg: "1/4 is equal to which of these?", useVisual: false },
    { type: 'complete_frac', f1: { n: 3, d: 4 }, ans: '6/8', opts: ['4/8', '5/8', '6/8', '7/8'], msg: "3/4 is equal to which of these?", useVisual: false },
    { type: 'complete_frac', f1: { n: 4, d: 8 }, ans: '1/2', opts: ['1/2', '1/4', '3/4', '2/3'], msg: "4/8 is equal to which of these?", useVisual: false }
  ],

  // Level 8: Pizza Order (Cut and shade for customer)
  8: [
    { type: 'order', n: 1, d: 2, cuts: 1, msg: "👨🍳 Customer Order: Make 1/2 of the pizza with pepperoni! (Cut into 2, shade 1)", useVisual: true },
    { type: 'order', n: 2, d: 3, cuts: 2, msg: "👨🍳 Customer Order: Make 2/3 of the pizza with mushrooms! (Cut into 3, shade 2)", useVisual: true },
    { type: 'order', n: 3, d: 4, cuts: 3, msg: "👨🍳 Customer Order: Make 3/4 of the pizza with olives! (Cut into 4, shade 3)", useVisual: true },
    { type: 'order', n: 3, d: 5, cuts: 4, msg: "👨🍳 Customer Order: Make 3/5 of the pizza with sweet corn! (Cut into 5, shade 3)", useVisual: true },
    { type: 'order', n: 5, d: 8, cuts: 7, msg: "👨🍳 Customer Order: Make 5/8 of the pizza with green peppers! (Cut into 8, shade 5)", useVisual: true }
  ],

  // Level 9: Fraction Match (Identify which pizza matches)
  9: [
    { type: 'match', n: 1, d: 2, pizzas: [{ n: 1, d: 2 }, { n: 1, d: 4 }, { n: 3, d: 4 }], ansIdx: 0, msg: "Which pizza shows 1/2?", useVisual: true },
    { type: 'match', n: 2, d: 3, pizzas: [{ n: 1, d: 3 }, { n: 2, d: 3 }, { n: 2, d: 4 }], ansIdx: 1, msg: "Which pizza shows 2/3?", useVisual: true },
    { type: 'match', n: 3, d: 4, pizzas: [{ n: 1, d: 4 }, { n: 2, d: 4 }, { n: 3, d: 4 }], ansIdx: 2, msg: "Which pizza shows 3/4?", useVisual: true },
    { type: 'match', n: 3, d: 5, pizzas: [{ n: 3, d: 5 }, { n: 2, d: 5 }, { n: 4, d: 5 }], ansIdx: 0, msg: "Which pizza shows 3/5?", useVisual: true },
    { type: 'match', n: 5, d: 8, pizzas: [{ n: 3, d: 8 }, { n: 5, d: 8 }, { n: 7, d: 8 }], ansIdx: 1, msg: "Which pizza shows 5/8?", useVisual: true }
  ],

  // Level 10: Fraction Addition (Like denominators)
  10: [
    { type: 'add', f1: { n: 1, d: 4 }, f2: { n: 1, d: 4 }, ans: '2/4', opts: ['2/4', '2/8', '1/4'], msg: "What is the total? (1/4 + 1/4)", useVisual: true },
    { type: 'add', f1: { n: 1, d: 3 }, f2: { n: 1, d: 3 }, ans: '2/3', opts: ['2/3', '2/6', '1/3'], msg: "What is the total? (1/3 + 1/3)", useVisual: true },
    { type: 'add', f1: { n: 2, d: 5 }, f2: { n: 1, d: 5 }, ans: '3/5', opts: ['3/5', '3/10', '1/5'], msg: "What is the total? (2/5 + 1/5)", useVisual: true },
    { type: 'add', f1: { n: 1, d: 6 }, f2: { n: 3, d: 6 }, ans: '4/6', opts: ['4/6', '4/12', '2/6'], msg: "What is the total? (1/6 + 3/6)", useVisual: true },
    { type: 'add', f1: { n: 3, d: 8 }, f2: { n: 2, d: 8 }, ans: '5/8', opts: ['5/8', '5/16', '1/8'], msg: "What is the total? (3/8 + 2/8)", useVisual: true }
  ],

  // Level 11: Fraction Subtraction (Like denominators)
  11: [
    { type: 'sub', f1: { n: 3, d: 4 }, f2: { n: 1, d: 4 }, ans: '2/4', opts: ['2/4', '2/0', '1/4'], msg: "How much pizza is left? (3/4 − 1/4)", useVisual: true },
    { type: 'sub', f1: { n: 2, d: 3 }, f2: { n: 1, d: 3 }, ans: '1/3', opts: ['1/3', '1/0', '2/3'], msg: "How much pizza is left? (2/3 − 1/3)", useVisual: true },
    { type: 'sub', f1: { n: 4, d: 5 }, f2: { n: 2, d: 5 }, ans: '2/5', opts: ['2/5', '2/10', '1/5'], msg: "How much pizza is left? (4/5 − 2/5)", useVisual: true },
    { type: 'sub', f1: { n: 5, d: 6 }, f2: { n: 2, d: 6 }, ans: '3/6', opts: ['3/6', '3/12', '1/6'], msg: "How much pizza is left? (5/6 − 2/6)", useVisual: true },
    { type: 'sub', f1: { n: 7, d: 8 }, f2: { n: 4, d: 8 }, ans: '3/8', opts: ['3/8', '3/16', '2/8'], msg: "How much pizza is left? (7/8 − 4/8)", useVisual: true }
  ],

  // Level 12: Fraction Multiplication
  12: [
    { type: 'mult', f1: { n: 1, d: 2 }, f2: { n: 1, d: 2 }, ans: '1/4', opts: ['1/4', '1/2', '2/4'], msg: "What is 1/2 of 1/2?", useVisual: false },
    { type: 'mult', f1: { n: 1, d: 2 }, f2: { n: 2, d: 3 }, ans: '1/3', opts: ['1/3', '2/3', '1/6'], msg: "What is 1/2 of 2/3?", useVisual: false },
    { type: 'mult', f1: { n: 1, d: 3 }, f2: { n: 3, d: 4 }, ans: '1/4', opts: ['1/4', '2/4', '3/12'], msg: "What is 1/3 of 3/4?", useVisual: false },
    { type: 'mult', f1: { n: 3, d: 4 }, f2: { n: 1, d: 2 }, ans: '3/8', opts: ['3/8', '4/6', '2/8'], msg: "What is 3/4 of 1/2?", useVisual: false },
    { type: 'mult', f1: { n: 2, d: 3 }, f2: { n: 3, d: 5 }, ans: '2/5', opts: ['2/5', '3/5', '1/5'], msg: "What is 2/3 of 3/5?", useVisual: false }
  ],

  // Level 13: Fraction Division (Fit inside)
  13: [
    { type: 'div', f1: { n: 1, d: 2 }, f2: { n: 1, d: 4 }, ans: '2', opts: ['2', '4', '1/2'], msg: "How many 1/4 pieces fit inside 1/2?", useVisual: false },
    { type: 'div', f1: { n: 1, d: 2 }, f2: { n: 1, d: 6 }, ans: '3', opts: ['3', '2', '6'], msg: "How many 1/6 pieces fit inside 1/2?", useVisual: false },
    { type: 'div', f1: { n: 3, d: 4 }, f2: { n: 1, d: 4 }, ans: '3', opts: ['3', '2', '4'], msg: "How many 1/4 pieces fit inside 3/4?", useVisual: false },
    { type: 'div', f1: { n: 1, d: 2 }, f2: { n: 1, d: 8 }, ans: '4', opts: ['4', '2', '8'], msg: "How many 1/8 pieces fit inside 1/2?", useVisual: false },
    { type: 'div', f1: { n: 1, d: 1 }, f2: { n: 1, d: 8 }, ans: '8', opts: ['8', '4', '6'], msg: "How many 1/8 pieces fit inside 1 whole pizza?", useVisual: false }
  ],

  // Level 14: Different Denominators
  14: [
    { type: 'diff_denom', f1: { n: 1, d: 2 }, op: '+', f2: { n: 1, d: 4 }, ans: '3/4', opts: ['3/4', '2/6', '2/4'], msg: "1/2 + 1/4 = ?", useVisual: false },
    { type: 'diff_denom', f1: { n: 3, d: 4 }, op: '-', f2: { n: 1, d: 2 }, ans: '1/4', opts: ['1/4', '2/4', '2/2'], msg: "3/4 − 1/2 = ?", useVisual: false },
    { type: 'diff_denom', f1: { n: 1, d: 4 }, op: '+', f2: { n: 3, d: 8 }, ans: '5/8', opts: ['5/8', '4/12', '3/8'], msg: "1/4 + 3/8 = ?", useVisual: false },
    { type: 'diff_denom', f1: { n: 7, d: 8 }, op: '-', f2: { n: 1, d: 2 }, ans: '3/8', opts: ['3/8', '6/6', '2/8'], msg: "7/8 − 1/2 = ?", useVisual: false },
    { type: 'diff_denom', f1: { n: 1, d: 3 }, op: '+', f2: { n: 1, d: 6 }, ans: '3/6', opts: ['3/6', '2/9', '1/6'], msg: "1/3 + 1/6 = ?", useVisual: false }
  ],

  // Level 15: Mixed Challenge (Word Problem, Add, Compare, Equivalent, Order)
  15: [
    { type: 'word_problem', ans: '3/4', opts: ['3/4', '1/4', '4/4'], msg: "There are 4 pizza slices. Leo eats 3 slices. What fraction did Leo eat?", useVisual: false },
    { type: 'add', f1: { n: 2, d: 6 }, f2: { n: 3, d: 6 }, ans: '5/6', opts: ['5/6', '5/12', '1/6'], msg: "What is the total? (2/6 + 3/6)", useVisual: true },
    { type: 'compare', f1: { n: 3, d: 5 }, f2: { n: 1, d: 5 }, ans: 'A', msg: "Which pizza has more shaded?", useVisual: true },
    { type: 'equivalent', n: 2, d: 4, ans: '1/2', opts: ['1/2', '1/4', '3/4'], msg: "Which fraction shows the same amount as 2/4?", useVisual: true },
    { type: 'order', n: 5, d: 8, cuts: 7, msg: "👨🍳 Customer Order: Make 5/8 of the pizza with mushrooms! (Cut into 8, shade 5)", useVisual: true }
  ],

  // Level 16: Fraction Master (Cutting, Shading, Advanced Add, Division, Chef Special)
  16: [
    { type: 'slice', n: 1, d: 8, cuts: 7, msg: "Cut the pizza into 8 equal pieces! (Each piece is 1/8)", useVisual: true },
    { type: 'shade', n: 7, d: 8, cuts: 0, msg: "Tap the slices to shade 7/8 of the pizza! (7 slices)", useVisual: true },
    { type: 'diff_denom', f1: { n: 3, d: 8 }, op: '+', f2: { n: 1, d: 2 }, ans: '7/8', opts: ['7/8', '4/10', '5/8'], msg: "3/8 + 1/2 = ?", useVisual: false },
    { type: 'div', f1: { n: 3, d: 4 }, f2: { n: 1, d: 8 }, ans: '6', opts: ['6', '4', '8'], msg: "How many 1/8 pieces fit inside 3/4?", useVisual: false },
    { type: 'order', n: 3, d: 4, cuts: 3, msg: "👨🍳 Chef Special Order: Make 3/4 of the pizza with pepperoni! (Cut into 4, shade 3)", useVisual: true }
  ]
};

function generateChallengeForLevel(level, subIdx = undefined) {
  const lvlChallenges = LEVEL_SUBLEVEL_CHALLENGES[level];
  let idx = 0;
  if (typeof subIdx === 'number' && subIdx >= 0) {
    idx = subIdx % CFG.CHALLENGES_PER_LEVEL;
  } else if (state && typeof state.challengeNumber === 'number' && state.challengeNumber > 0) {
    idx = (state.challengeNumber - 1) % CFG.CHALLENGES_PER_LEVEL;
  }

  const template = lvlChallenges ? lvlChallenges[idx] : null;
  if (!template) {
    return { type: 'slice', n: 1, d: 2, cuts: 1, msg: "Cut the pizza into 2 equal pieces! (Each piece is 1/2)", useVisual: true };
  }

  // Deep clone to guarantee immutability of the question database
  const c = JSON.parse(JSON.stringify(template));
  if (c.opts && Array.isArray(c.opts)) {
    // Shuffle options dynamically for variety while keeping correct answer intact
    c.opts = [...c.opts].sort(() => Math.random() - 0.5);
  }
  return c;
}

/* ============================================================
   5. CANVAS SIZING & HIGH DPI
   ============================================================ */

function getDPI() { return window.devicePixelRatio || 1; }
function getCanvas(id) { return document.getElementById(id); }

function resizeMainCanvas() {
  const canvas = getCanvas('pizzaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const centerCol = el('gameCenterCol');
  let availW = 420;
  if (centerCol && centerCol.clientWidth > 0) {
    availW = centerCol.clientWidth - 20;
  } else {
    availW = Math.min(window.innerWidth - 40, 460);
  }

  // Size based on available column width without squishing due to viewport height
  const size = Math.max(CFG.MIN_PIZZA_PX, Math.min(CFG.MAX_PIZZA_PX, Math.round(availW)));
  const dpr = getDPI();

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  state.cx = size / 2;
  state.cy = size / 2;
  // Pizza outer radius leaves room for wooden board peel, handle and shadows without cropping
  state.r = (size / 2) * 0.74;
}

function resizeStaticCanvas(canvasId, isMatch = false) {
  const c = getCanvas(canvasId);
  if (!c) return null;
  const centerCol = el('gameCenterCol');
  let availW = 160;
  const divisor = isMatch ? 3 : 2;
  const padding = isMatch ? 48 : 36;
  if (centerCol && centerCol.clientWidth > 0) {
    availW = Math.floor((centerCol.clientWidth - padding) / divisor);
  } else {
    availW = Math.floor((window.innerWidth - padding) / divisor);
  }
  const maxCap = isMatch ? 160 : 210;
  const minCap = isMatch ? 110 : 140;
  const size = Math.max(minCap, Math.min(maxCap, availW));
  const dpr = getDPI();

  c.width = size * dpr;
  c.height = size * dpr;
  c.style.width = size + 'px';
  c.style.height = size + 'px';

  const ctx = c.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  return { canvas: c, cx: size / 2, cy: size / 2, r: (size / 2) * 0.74, ctx };
}

function resizeDualCanvas(canvasId) {
  return resizeStaticCanvas(canvasId, false);
}

/* ============================================================
   6. DELICIOUS CARTOON PIZZA RENDERING (BOARD, CRUST, CHEESE, TOPPINGS)
   ============================================================ */

function drawPizzaBase(ctxToUse, cx, cy, r, toppingsList = []) {
  // 1. Wooden Pizza Board (Peel) Underneath
  drawWoodenBoard(ctxToUse, cx, cy, r);

  // 2. Crust outer shadow onto the wooden board
  ctxToUse.save();
  ctxToUse.beginPath();
  ctxToUse.arc(cx, cy + r * 0.05, r * 1.02, 0, Math.PI * 2);
  ctxToUse.fillStyle = 'rgba(74, 30, 8, 0.45)';
  ctxToUse.filter = 'blur(6px)';
  ctxToUse.fill();
  ctxToUse.filter = 'none';
  ctxToUse.restore();

  // 3. Golden, Crispy Cartoon Crust with organic puffy edges
  drawCrispyCrust(ctxToUse, cx, cy, r);

  // 4. Bright Red Savory Tomato Sauce with Oregano Herbs
  drawTomatoSauce(ctxToUse, cx, cy, r);

  // 5. Glossy Melted Cheese with Toasted Spots and Shine
  drawMeltedCheese(ctxToUse, cx, cy, r);

  // 6. Detailed Gourmet Toppings (Pepperoni, Mushroom, Olive, Pepper, Basil)
  drawToppings(ctxToUse, cx, cy, r, toppingsList);
}

// Attractive Wooden Board / Peel (Crafted to fit 100% inside canvas without cropping)
function drawWoodenBoard(ctx, cx, cy, r) {
  ctx.save();
  const boardR = r * 1.14;

  // Board handle extending out at bottom-right (45 deg angle)
  const handleAngle = Math.PI * 0.25;
  const hx = cx + Math.cos(handleAngle) * (boardR + r * 0.16);
  const hy = cy + Math.sin(handleAngle) * (boardR + r * 0.16);

  ctx.strokeStyle = '#8C4E24';
  ctx.lineWidth = r * 0.20;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(handleAngle) * (boardR * 0.82), cy + Math.sin(handleAngle) * (boardR * 0.82));
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // Handle hole
  ctx.fillStyle = '#5A2E12';
  ctx.beginPath();
  ctx.arc(hx, hy, r * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // Round wooden peel base
  const boardGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.2, cx, cy, boardR);
  boardGrad.addColorStop(0.0, '#E0A96D');
  boardGrad.addColorStop(0.5, '#C68046');
  boardGrad.addColorStop(0.9, '#9E5B28');
  boardGrad.addColorStop(1.0, '#753D15');

  ctx.beginPath();
  ctx.arc(cx, cy, boardR, 0, Math.PI * 2);
  ctx.fillStyle = boardGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Wood grain rings
  ctx.strokeStyle = 'rgba(92, 44, 22, 0.18)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, boardR * 0.94, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, boardR * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Golden Crispy Crust with Bumps and Toasted Blisters
function drawCrispyCrust(ctx, cx, cy, r) {
  ctx.save();

  // Draw puffy organic crust boundary
  const bumps = 18;
  ctx.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    // Gentle radial variation for handcrafted woodfired pizza look
    const bumpR = r * (0.97 + Math.sin(i * 3.5) * 0.035);
    const x = cx + Math.cos(a) * bumpR;
    const y = cy + Math.sin(a) * bumpR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const crustGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.4, cx, cy, r);
  crustGrad.addColorStop(0.0, '#F5B041');
  crustGrad.addColorStop(0.4, '#EB984E');
  crustGrad.addColorStop(0.8, '#D35400');
  crustGrad.addColorStop(1.0, '#A04000');
  ctx.fillStyle = crustGrad;
  ctx.fill();

  // Crust edge bevel stroke
  ctx.strokeStyle = '#873600';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Crust blisters (toasted spots like woodfired oven!)
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 + 0.1;
    const bx = cx + Math.cos(a) * (r * 0.93);
    const by = cy + Math.sin(a) * (r * 0.93);

    ctx.beginPath();
    ctx.arc(bx, by, r * (0.025 + (i % 3) * 0.01), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(110, 44, 0, 0.48)';
    ctx.fill();

    // Flour highlight dusting
    ctx.beginPath();
    ctx.arc(bx - 1.5, by - 1.5, r * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();
  }

  ctx.restore();
}

// Savory Tomato Sauce with Oregano Flakes
function drawTomatoSauce(ctx, cx, cy, r) {
  ctx.save();
  const sauceR = r * CFG.R_SAUCE;

  const sauceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sauceR);
  sauceGrad.addColorStop(0.0, '#E74C3C');
  sauceGrad.addColorStop(0.7, '#C0392B');
  sauceGrad.addColorStop(1.0, '#922B21');

  ctx.beginPath();
  ctx.arc(cx, cy, sauceR, 0, Math.PI * 2);
  ctx.fillStyle = sauceGrad;
  ctx.fill();

  // Oregano herb flecks in sauce ring
  ctx.fillStyle = 'rgba(39, 110, 44, 0.7)';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + (i * 0.3);
    const dist = sauceR * (0.86 + (i % 4) * 0.035);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Glossy Melted Cheese with Organic Wavy Edges & Shines
function drawMeltedCheese(ctx, cx, cy, r) {
  ctx.save();
  const cheeseR = r * CFG.R_CHEESE;

  // Melted organic scalloped edge
  const lobes = 24;
  ctx.beginPath();
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const waveR = cheeseR * (0.97 + Math.sin(i * 4) * 0.03 + Math.cos(i * 2) * 0.02);
    const x = cx + Math.cos(a) * waveR;
    const y = cy + Math.sin(a) * waveR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const cheeseGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, 0, cx, cy, cheeseR);
  cheeseGrad.addColorStop(0.0, '#FFF9DE');
  cheeseGrad.addColorStop(0.4, '#FDEAA8');
  cheeseGrad.addColorStop(0.8, '#F9D753');
  cheeseGrad.addColorStop(1.0, '#F1B929');
  ctx.fillStyle = cheeseGrad;
  ctx.fill();

  // Toasted baked golden mozzarella blister patches
  ctx.fillStyle = 'rgba(211, 84, 0, 0.28)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const dist = cheeseR * (0.28 + (i % 3) * 0.22);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, r * 0.065, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glossy white melted cheese highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, cheeseR * 0.65, -0.6, 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, cheeseR * 0.45, Math.PI * 0.8, Math.PI * 1.15);
  ctx.stroke();

  ctx.restore();
}

// Generate Balanced Delicious Toppings
function generateToppings(r) {
  const toppings = [];
  const types = ['pepperoni', 'mushroom', 'olive', 'pepper', 'basil'];
  // Natural spread
  for (let i = 0; i < 20; i++) {
    const ring = 0.14 + (i / 20) * 0.64 + (Math.random() * 0.08);
    const angle = (i * 1.37) + Math.random() * 0.4;
    const type = types[i % types.length];
    const size = r * (
      type === 'pepperoni' ? 0.095 :
      type === 'mushroom' ? 0.075 :
      type === 'pepper' ? 0.065 :
      type === 'basil' ? 0.060 : 0.042
    );
    toppings.push({ type, angle, dist: ring * r * CFG.R_CHEESE, size, rot: Math.random() * Math.PI * 2 });
  }
  return toppings;
}

// Draw Rich Gourmet Cartoon Toppings
function drawToppings(ctx, cx, cy, r, toppingsList) {
  for (const t of toppingsList) {
    const tx = cx + Math.cos(t.angle) * t.dist;
    const ty = cy + Math.sin(t.angle) * t.dist;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(t.rot);

    // Drop shadow under topping
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;

    if (t.type === 'pepperoni') {
      // Base circle
      ctx.beginPath();
      ctx.arc(0, 0, t.size, 0, Math.PI * 2);
      const pepGrad = ctx.createRadialGradient(-t.size * 0.2, -t.size * 0.2, 0, 0, 0, t.size);
      pepGrad.addColorStop(0.0, '#E74C3C');
      pepGrad.addColorStop(0.7, '#C0392B');
      pepGrad.addColorStop(1.0, '#922B21');
      ctx.fillStyle = pepGrad;
      ctx.fill();

      // Cupped darker rim
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#78180E';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Savory seasoning specks
      ctx.fillStyle = '#641E16';
      ctx.beginPath();
      ctx.arc(-t.size * 0.35, -t.size * 0.3, t.size * 0.16, 0, Math.PI * 2);
      ctx.arc(t.size * 0.35, t.size * 0.15, t.size * 0.14, 0, Math.PI * 2);
      ctx.arc(t.size * 0.05, -t.size * 0.4, t.size * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Shiny grease gloss highlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(-t.size * 0.22, t.size * 0.25, t.size * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (t.type === 'mushroom') {
      // Mushroom cap
      ctx.beginPath();
      ctx.moveTo(-t.size, 0);
      ctx.bezierCurveTo(-t.size, -t.size * 1.3, t.size, -t.size * 1.3, t.size, 0);
      ctx.lineTo(t.size * 0.35, 0);
      ctx.lineTo(t.size * 0.35, t.size * 0.85);
      ctx.lineTo(-t.size * 0.35, t.size * 0.85);
      ctx.lineTo(-t.size * 0.35, 0);
      ctx.closePath();
      ctx.fillStyle = '#F8F4E8';
      ctx.fill();

      // Mushroom gills underside
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#BCAAA4';
      ctx.beginPath();
      ctx.arc(0, 0, t.size * 0.75, 0, Math.PI);
      ctx.fill();

      // Cap gloss highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-t.size * 0.3, -t.size * 0.45, t.size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (t.type === 'olive') {
      // Black Olive Ring
      ctx.beginPath();
      ctx.arc(0, 0, t.size, 0, Math.PI * 2);
      ctx.fillStyle = '#212529';
      ctx.fill();

      // Center hole showing melted cheese
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.arc(0, 0, t.size * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#F9D753';
      ctx.fill();

      // Shiny rim glint
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, t.size * 0.78, -1.2, 0.4);
      ctx.stroke();
    }
    else if (t.type === 'pepper') {
      // Green Capsicum (Bell Pepper) Crescent
      ctx.strokeStyle = '#27AE60';
      ctx.lineWidth = t.size * 0.46;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, t.size * 1.05, Math.PI * 1.15, Math.PI * 2.85);
      ctx.stroke();

      // Bright inner highlight strip
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#A9DFBF';
      ctx.lineWidth = t.size * 0.18;
      ctx.beginPath();
      ctx.arc(0, 0, t.size * 1.05, Math.PI * 1.3, Math.PI * 2.2);
      ctx.stroke();
    }
    else if (t.type === 'basil') {
      // Fresh Basil Leaf
      ctx.fillStyle = '#2ECC71';
      ctx.beginPath();
      ctx.ellipse(0, 0, t.size * 1.2, t.size * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf vein
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#1E8449';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-t.size * 0.9, 0);
      ctx.lineTo(t.size * 0.9, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/* ============================================================
   7. SLICE, GEOMETRY & ANGLE UTILITIES
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
  const scaleX = (cvs.width / getDPI()) / rect.width;
  const scaleY = (cvs.height / getDPI()) / rect.height;
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
   8. VISIBLE CUT LINES & CARTOON PIZZA CUTTER
   ============================================================ */

// Realistic 3D Slice Seam Cut Line
function drawCutLine(ctx, cx, cy, r, angle, alpha = 1.0) {
  const x2 = cx + Math.cos(angle) * (r * CFG.R_CRUST);
  const y2 = cy + Math.sin(angle) * (r * CFG.R_CRUST);

  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Cut groove shadow (deep slice separation)
  ctx.strokeStyle = 'rgba(74, 21, 5, 0.85)';
  ctx.lineWidth = Math.max(3.5, r * 0.024);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 2. Crust and cheese bevel highlight on one side of cut
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = Math.max(1.8, r * 0.012);
  ctx.shadowColor = 'rgba(255, 240, 180, 0.6)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 3. Center golden slice core
  ctx.strokeStyle = 'rgba(243, 156, 18, 0.5)';
  ctx.lineWidth = Math.max(1.0, r * 0.008);
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

// Draw Realistic Cartoon Pizza Cutter / Knife Following Pointer
function drawCartoonCutter(ctx, x, y, angle = 0, isCutting = false, wheelRot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Soft drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;

  // Ergonomic Red Cartoon Handle
  const handleGrad = ctx.createLinearGradient(-8, 25, 8, 25);
  handleGrad.addColorStop(0, '#E74C3C');
  handleGrad.addColorStop(0.3, '#FF7675');
  handleGrad.addColorStop(0.7, '#D63031');
  handleGrad.addColorStop(1, '#C0392B');

  ctx.fillStyle = handleGrad;
  ctx.beginPath();
  ctx.roundRect(-8, 25, 16, 42, [6, 6, 8, 8]);
  ctx.fill();

  // Handle grip bands
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.roundRect(-6, 32, 12, 4, 2);
  ctx.roundRect(-6, 42, 12, 4, 2);
  ctx.roundRect(-6, 52, 12, 4, 2);
  ctx.fill();

  // Silver metal neck / bracket
  ctx.shadowBlur = 4;
  const bracketGrad = ctx.createLinearGradient(-6, 8, 6, 25);
  bracketGrad.addColorStop(0, '#ECF0F1');
  bracketGrad.addColorStop(0.5, '#BDC3C7');
  bracketGrad.addColorStop(1, '#7F8C8D');
  ctx.fillStyle = bracketGrad;
  ctx.beginPath();
  ctx.moveTo(-5, 26);
  ctx.lineTo(5, 26);
  ctx.lineTo(6, 12);
  ctx.lineTo(2, 6);
  ctx.lineTo(-2, 6);
  ctx.lineTo(-6, 12);
  ctx.closePath();
  ctx.fill();

  // Stainless steel circular blade (cutter wheel)
  const bladeR = 24;
  ctx.save();
  ctx.rotate(wheelRot);

  // Wheel metal gradient
  const wheelGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, bladeR);
  wheelGrad.addColorStop(0, '#FFFFFF');
  wheelGrad.addColorStop(0.4, '#E2E8F0');
  wheelGrad.addColorStop(0.75, '#CBD5E1');
  wheelGrad.addColorStop(0.92, '#94A3B8');
  wheelGrad.addColorStop(1.0, '#64748B');

  ctx.fillStyle = wheelGrad;
  ctx.beginPath();
  ctx.arc(0, 0, bladeR, 0, Math.PI * 2);
  ctx.fill();

  // Sharp outer blade bevel edge
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Gleam reflections on rotating blade
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, bladeR * 0.75, -0.4, 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, bladeR * 0.75, Math.PI - 0.4, Math.PI + 0.4);
  ctx.stroke();

  // Center axle rivet
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-1.5, -1.5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // If currently cutting, draw action sparks!
  if (isCutting) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      const dist = bladeR + 6 + Math.random() * 8;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// Drag Cutting Line & Cutter Tool Preview
function drawDragPreview(ctx) {
  if (state.phase !== 'cutting') return;

  if (state.dragging && state.dragStart && state.dragCurrent) {
    const dragLen = dragLengthRatio(state.dragStart, state.dragCurrent);
    const angle = dragToAngle(state.dragStart, state.dragCurrent);

    // Glowing cutting slice trail
    const cutterDist = Math.min(dragLen, 0.98) * state.r;
    const ex = state.cx + Math.cos(angle) * cutterDist;
    const ey = state.cy + Math.sin(angle) * cutterDist;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(state.cx, state.cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(state.cx, state.cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();

    // Advance wheel rotation with dragging
    state.cutterWheelRot += 0.22;

    // Draw active cutting knife/cutter at current drag point
    drawCartoonCutter(ctx, ex, ey, angle + Math.PI / 2, true, state.cutterWheelRot);
  }
  else if (state.isPointerOver && state.pointerPos) {
    // Hovering cutter follows pointer
    drawCartoonCutter(ctx, state.pointerPos.x, state.pointerPos.y, 0, false, 0);
  }
}

// Shaded Slices with Glowing Melted Cheese & Stars
function drawWedge(ctx, cx, cy, r, wedge, fillStyle, isHighlight = false) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r * CFG.R_CRUST, wedge.startAngle, wedge.endAngle);
  ctx.closePath();

  ctx.fillStyle = fillStyle;
  ctx.fill();

  if (isHighlight) {
    // Glowing golden cheese outline
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Cute sparkle star on shaded slice
    const midAngle = (wedge.startAngle + wedge.endAngle) / 2;
    const starDist = r * 0.55;
    const sx = cx + Math.cos(midAngle) * starDist;
    const sy = cy + Math.sin(midAngle) * starDist;
    drawCuteSparkle(ctx, sx, sy, 7, 'rgba(255, 255, 255, 0.9)');
  }

  ctx.restore();
}

function drawCuteSparkle(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y);
  ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y);
  ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.fill();
  ctx.restore();
}

function drawShadedWedges(ctx) {
  for (const w of state.wedges) {
    if (w.shaded) drawWedge(ctx, state.cx, state.cy, state.r, w, CFG.SHADE_COLOR, true);
  }
  if (state.hoverWedgeIdx >= 0 && state.phase === 'shading') {
    const hw = state.wedges[state.hoverWedgeIdx];
    if (hw && !hw.shaded) drawWedge(ctx, state.cx, state.cy, state.r, hw, CFG.SHADE_HOVER_COLOR, false);
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

  // Initial reference cut at top (12 o'clock)
  drawCutLine(ctx, state.cx, state.cy, state.r, -Math.PI / 2);
  for (const angle of state.cutAngles) drawCutLine(ctx, state.cx, state.cy, state.r, angle);

  drawDragPreview(ctx);
}

function redrawStaticPizza(canvasId, frac) {
  const isMatch = canvasId.startsWith('matchCanvas');
  const p = resizeStaticCanvas(canvasId, isMatch);
  if (!p) return;
  const dpr = getDPI();
  const cssW = p.canvas.width / dpr;
  const cssH = p.canvas.height / dpr;
  p.ctx.clearRect(0, 0, cssW, cssH);
  const tops = generateToppings(p.r);
  drawPizzaBase(p.ctx, p.cx, p.cy, p.r, tops);

  const ideal = (Math.PI * 2) / frac.d;
  for (let i = 0; i < frac.d; i++) {
    const start = -Math.PI / 2 + (i * ideal);
    const end = start + ideal;
    drawCutLine(p.ctx, p.cx, p.cy, p.r, start);
    if (i < frac.n) {
      drawWedge(p.ctx, p.cx, p.cy, p.r, { startAngle: start, endAngle: end }, CFG.SHADE_COLOR, true);
    }
  }
}

/* ============================================================
   10. INPUT HANDLING (MOUSE & MOBILE TOUCH CUTTING/SHADING)
   ============================================================ */

function onPointerDown(e) {
  if (state.phase !== 'cutting' && state.phase !== 'shading') return;
  e.preventDefault();
  const cvs = e.currentTarget;
  const pos = eventToCanvas(e, cvs);

  if (state.phase === 'cutting') {
    // Snap starting point to center if touch is anywhere in the center region
    if (isNearCenter(pos.x, pos.y)) {
      state.dragging = true;
      state.dragStart = { x: state.cx, y: state.cy };
      state.dragCurrent = pos;
    } else {
      // Still allow dragging from anywhere inside pizza
      state.dragging = true;
      state.dragStart = { x: state.cx, y: state.cy };
      state.dragCurrent = pos;
    }
  } else if (state.phase === 'shading') {
    if (!insidePizza(pos.x, pos.y)) return;
    state.dragging = true;
    state.dragStart = pos;
    state.dragCurrent = pos;
  }
}

function onPointerMove(e) {
  if (state.phase !== 'cutting' && state.phase !== 'shading') return;
  e.preventDefault();
  const cvs = e.currentTarget;
  const pos = eventToCanvas(e, cvs);
  state.pointerPos = pos;
  state.isPointerOver = true;

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
  } else if (state.phase === 'cutting') {
    redrawMain();
  }
}

function onPointerUp(e) {
  if (state.phase !== 'cutting' && state.phase !== 'shading') return;
  e.preventDefault();
  const cvs = e.currentTarget;
  const pos = eventToCanvas(e, cvs);

  if (state.dragging && state.dragStart) {
    const dx = pos.x - state.dragStart.x, dy = pos.y - state.dragStart.y;
    const isTap = Math.sqrt(dx * dx + dy * dy) < 14;

    if (isTap && state.phase === 'shading') {
      const idx = wedgeIndexAt(pos.x, pos.y);
      if (idx >= 0) toggleShading(idx);
      finishDrag();
      return;
    }
  }

  if (state.dragging && state.phase === 'cutting' && state.dragStart) {
    tryAddCut(state.dragStart, pos);
  }

  finishDrag();
}

function finishDrag() {
  state.dragging = false;
  state.dragStart = null;
  state.dragCurrent = null;
  redrawMain();
}

function onPointerLeave(e) {
  if (state.dragging) finishDrag();
  state.isPointerOver = false;
  state.hoverWedgeIdx = -1;
  redrawMain();
}

function tryAddCut(start, end) {
  if (!state.challenge) return;
  if (state.cutAngles.length >= state.challenge.cuts) return;

  const ratio = dragLengthRatio(start, end);
  if (ratio < CFG.MIN_DRAG_RATIO) {
    flashInvalid();
    return;
  }

  const angle = dragToAngle(start, end);
  if (isDuplicateCut(angle)) {
    flashInvalid();
    return;
  }

  state.cutAngles.push(angle);
  state.wedges = computeWedges();
  state.wedges.forEach(w => w.shaded = false);

  SoundManager.playCut();
  spawnCrumbs(angle);

  // If all cuts completed:
  if (state.cutAngles.length === state.challenge.cuts) {
    if (state.challenge.type === 'slice') {
      checkAnswer();
    } else {
      state.phase = 'shading';
      const canvas = getCanvas('pizzaCanvas');
      if (canvas) canvas.className = 'shading-active';
      setMascotSpeech('Great cuts! Now tap to shade it! 🧀');
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
    if (c.type !== 'slice') correctShaded = (shadedCount === c.n);

    isCorrect = correctCount && correctShaded && correctEqual;

    if (!isCorrect) {
      if (!correctCount) eduMsg = `Need ${c.d} equal slices! 🔪`;
      else if (!correctEqual) eduMsg = 'Make all slices equal in size!';
      else eduMsg = `Shade exactly ${c.n} slices! 🧀`;
    } else {
      eduMsg = c.type === 'slice'
        ? `Amazing! ${c.d} delicious equal pieces!`
        : `Wonderful! ${c.n} out of ${c.d} slices are shaded!`;
    }
  } else if (['mc', 'equivalent', 'num_denom', 'complete_frac', 'word_problem', 'add', 'sub', 'mult', 'div', 'diff_denom'].includes(state.phase)) {
    isCorrect = (selectedAns === c.ans || selectedAns === `${c.n}/${c.d}`);
    if (c.type === 'mc') eduMsg = isCorrect ? `${c.n} parts out of ${c.d} are shaded.` : `Count the shaded parts carefully!`;
    else if (c.type === 'equivalent') eduMsg = isCorrect ? `Yes! ${c.n}/${c.d} and ${c.ans} show the same amount.` : `Try to find the same amount visually.`;
    else if (c.type === 'num_denom') eduMsg = isCorrect ? `Correct!` : `Remember: top is shaded, bottom is total pieces.`;
    else if (c.type === 'complete_frac') eduMsg = isCorrect ? `Perfect match!` : `Think about equivalent amounts.`;
    else if (c.type === 'word_problem') eduMsg = isCorrect ? `Correct! ${c.ans} of the pizza was eaten.` : `Read carefully!`;
    else eduMsg = isCorrect ? `Great job, Chef! 🎉` : `Think about it and try again!`;
  } else if (state.phase === 'compare') {
    isCorrect = (selectedAns === c.ans);
    eduMsg = isCorrect ? `Great job comparing!` : `Look at which pizza has more shaded cheese!`;
  } else if (state.phase === 'match') {
    isCorrect = (selectedAns === c.ansIdx);
    eduMsg = isCorrect ? `Yes! That pizza shows ${c.n}/${c.d}.` : `Look for ${c.n} shaded pieces out of ${c.d}!`;
  }

  if (isCorrect) {
    if (btnEl) btnEl.style.backgroundColor = '#22C55E';
    state.phase = 'checked';
    state.score += state.hintUsed ? 70 : 100;
    state.streak++;

    // Single shared achievement feedback phrase for BOTH screen display and spoken audio:
    // Requirements:
    // Good Job! → Voice says "Good Job!"
    // Great Job! → Voice says "Great Job!"
    // Brilliant! → Voice says "Brilliant!"
    // Excellent! → Voice says "Excellent!"
    // Amazing! → Voice says "Amazing!"
    // Wonderful! → Voice says "Wonderful!"
    let achievementPhrase = 'Good Job!';
    if (state.challengeNumber === CFG.CHALLENGES_PER_LEVEL) {
      achievementPhrase = 'Wonderful!';
    } else if (state.streak >= 4 || state.score >= 500) {
      achievementPhrase = 'Amazing!';
    } else if (state.streak === 3 || c.type === 'diff_denom' || c.type === 'div') {
      achievementPhrase = 'Excellent!';
    } else if (state.streak === 2) {
      achievementPhrase = 'Brilliant!';
    } else if (!state.hintUsed) {
      achievementPhrase = 'Great Job!';
    } else {
      achievementPhrase = 'Good Job!';
    }

    VoiceManager.speak(achievementPhrase);
    showFeedback(true, achievementPhrase, eduMsg);
    setMascotSpeech(achievementPhrase);
    bumpScore();
    launchConfetti();

    document.querySelectorAll('.mc-btn, .chalk-mc-btn, .match-pizza-side canvas').forEach(b => {
      b.disabled = true;
      b.style.pointerEvents = 'none';
      if (b !== btnEl) b.style.opacity = '0.5';
    });

    const cvs = getCanvas('pizzaCanvas');
    if (cvs && state.currentUIConfig?.layoutMode === 'layout-single-pizza') {
      cvs.classList.add('correct-flash');
      setTimeout(() => cvs.classList.remove('correct-flash'), CFG.FLASH_MS * 1.5);
    }

    // Immediately show Next Challenge button in bottom bar!
    const ab = el('actionButtons'); if (ab) ab.style.display = 'none';
    const nbc = el('nextButtonContainer');
    if (nbc) {
      nbc.classList.remove('hidden');
      try {
        nbc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {}
    }

    // Auto-hide feedback after 2.2 seconds if user hasn't clicked Next yet
    let timeoutId = setTimeout(() => {
      hideFeedback();
    }, 2200);
    state.feedbackTimeout = timeoutId;

  } else {
    if (btnEl) {
      btnEl.classList.add('wrong-shake');
      const origBg = btnEl.style.backgroundColor;
      btnEl.style.backgroundColor = '#E63946';
      setTimeout(() => {
        btnEl.classList.remove('wrong-shake');
        btnEl.style.backgroundColor = origBg;
      }, 500);
    }
    state.streak = 0;
    SoundManager.playError();
    showFeedback(false, eduMsg);
    setMascotSpeech("Let's try again, Chef! 😊");

    const cvs = getCanvas('pizzaCanvas');
    if (cvs && state.currentUIConfig?.layoutMode === 'layout-single-pizza') {
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
  state.cutAngles = [];
  state.wedges = [];
  state.dragging = false;
  state.dragStart = null;
  state.dragCurrent = null;
  state.pointerPos = null;
  state.isPointerOver = false;
  state.hoverWedgeIdx = -1;
  state.hintUsed = false;
  const hp = el('hintPopup'); if (hp) hp.classList.add('hidden');
  const nbc = el('nextButtonContainer'); if (nbc) nbc.classList.add('hidden');
  const ab = el('actionButtons'); if (ab) ab.style.display = 'flex';
  const chalkBox = el('chalkMCContainer'); if (chalkBox) chalkBox.innerHTML = '';
  const mc = el('multipleChoiceContainer'); if (mc) mc.innerHTML = '';
  hideFeedback();
}

function updateChallengePanel() {
  // Driven automatically by applyUIConfig!
}

function updateUI() {
  if (!state.challenge) return;
  const cfg = state.currentUIConfig;
  const c = state.challenge;
  const t = c.type;

  const isInteractivePizza = cfg && cfg.actionButtons ? cfg.actionButtons.show : (t === 'slice' || t === 'shade' || t === 'order');

  if (state.phase !== 'checked' && isInteractivePizza) {
    const cutsDone = state.cutAngles.length;
    const shadedCount = state.wedges.filter(w => w.shaded).length;

    el('progressPips').style.display = 'flex';
    el('pipRowCuts').style.display = (cfg ? (cfg.pips?.showCuts ? 'flex' : 'none') : (t === 'shade' ? 'none' : 'flex'));
    el('pipRowShading').style.display = (cfg ? (cfg.pips?.showShading ? 'flex' : 'none') : (t === 'slice' ? 'none' : 'flex'));

    const cutsOk = cutsDone === c.cuts;
    const shadingOk = (shadedCount === c.n);

    el('pipCuts').classList.toggle('done', cutsOk);
    el('pipShading').classList.toggle('done', shadingOk);
    el('pipCutsLabel').textContent = `${cutsDone} / ${c.cuts} cut${c.cuts !== 1 ? 's' : ''}`;
    el('pipShadingLabel').textContent = `${shadedCount} / ${c.n} shaded`;

    el('actionButtons').style.display = 'flex';
    if (t === 'slice') {
      el('btnCheck').disabled = (cutsDone < c.cuts);
      el('btnUndo').disabled = (cutsDone === 0);
    } else if (t === 'shade') {
      el('btnCheck').disabled = (shadedCount === 0);
      el('btnUndo').disabled = (shadedCount === 0);
    } else if (t === 'order') {
      if (state.phase === 'cutting') {
        el('btnCheck').disabled = true;
        el('btnUndo').disabled = (cutsDone === 0);
      } else {
        el('btnCheck').disabled = (shadedCount === 0);
        el('btnUndo').disabled = false;
      }
    }
  } else {
    const pips = el('progressPips');
    if (pips) pips.style.display = 'none';
    if (state.phase !== 'checked') {
      const ab = el('actionButtons');
      if (ab) ab.style.display = 'none';
    }
  }

  const hbc = el('hintButtonContainer');
  if (hbc) {
    if (state.phase !== 'checked') {
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

function setMascotSpeech(text, lockMs = 1800) {
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

// Chef Mascot on the Left Side
function renderMascotSidebar() {
  return `
    <div class="mascot-sidebar" id="mascotSidebar">
      <div class="mascot-bubble" id="mascotSpeech">Ciao! Let's slice! 🍕</div>
      <div class="mascot-small-wrap" id="gameMascot">
        <svg class="chef-svg" viewBox="0 0 160 210" width="130" height="165" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Hat -->
          <g class="chef-hat-group">
            <path d="M46 50 C36 50, 26 36, 40 22 C46 14, 60 10, 72 16 C80 6, 96 6, 104 15 C116 10, 130 18, 126 30 C135 38, 130 50, 116 52 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2.5"/>
            <path d="M48 50 L114 50 L110 64 L52 64 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
            <rect x="50" y="60" width="62" height="11" rx="3" fill="#E63946"/>
            <path d="M81 62 L82.5 65.5 L86 66 L83.5 68.5 L84 72 L81 70 L78 72 L78.5 68.5 L76 66 L79.5 65.5 Z" fill="#FFD93D"/>
          </g>
          <!-- Body -->
          <g class="chef-body-group">
            <path d="M46 138 L116 138 L124 196 C124 202, 118 206, 112 206 L50 206 C44 206, 38 202, 38 196 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2.5"/>
            <path d="M64 136 L98 136 L92 150 L81 160 L70 150 Z" fill="#E63946"/>
            <circle cx="81" cy="143" r="4.5" fill="#C0392B"/>
            <circle cx="68" cy="168" r="3.5" fill="#334155"/>
            <circle cx="94" cy="168" r="3.5" fill="#334155"/>
            <circle cx="68" cy="186" r="3.5" fill="#334155"/>
            <circle cx="94" cy="186" r="3.5" fill="#334155"/>
          </g>
          <!-- Head -->
          <g class="chef-head-group">
            <circle cx="48" cy="106" r="6" fill="#FBD38D"/>
            <circle cx="114" cy="106" r="6" fill="#FBD38D"/>
            <ellipse cx="81" cy="104" rx="35" ry="33" fill="#FEEBC8" stroke="#F6AD55" stroke-width="2"/>
            <!-- Cheeks -->
            <ellipse cx="60" cy="112" rx="7" ry="4" fill="#FEB2B2" opacity="0.85"/>
            <ellipse cx="102" cy="112" rx="7" ry="4" fill="#FEB2B2" opacity="0.85"/>
            <!-- Eyes -->
            <g class="chef-eyes">
              <ellipse cx="66" cy="100" rx="5" ry="7" fill="#1E293B"/>
              <ellipse cx="96" cy="100" rx="5" ry="7" fill="#1E293B"/>
              <circle cx="64" cy="98" r="2" fill="#FFFFFF"/>
              <circle cx="94" cy="98" r="2" fill="#FFFFFF"/>
            </g>
            <!-- Mustache -->
            <path d="M81 115 C73 109, 58 113, 56 120 C66 122, 75 118, 81 115 Z" fill="#78350F"/>
            <path d="M81 115 C89 109, 104 113, 106 120 C96 122, 87 118, 81 115 Z" fill="#78350F"/>
            <circle cx="81" cy="111" r="3" fill="#F6AD55"/>
            <!-- Smile -->
            <path d="M72 122 Q81 133 90 122 Z" fill="#991B1B"/>
          </g>
          <!-- Arms -->
          <g class="chef-arms-group">
            <path d="M44 146 Q30 152 22 138" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
            <circle cx="20" cy="134" r="7" fill="#FEEBC8"/>
            <path d="M118 146 Q132 152 138 139" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
            <circle cx="140" cy="135" r="7" fill="#FEEBC8"/>
            <path d="M148 124 L150 128 L154 130 L150 132 L148 136 L146 132 L142 130 L146 128 Z" fill="#FFD93D"/>
          </g>
        </svg>
      </div>
    </div>
  `;
}

function showFeedback(isCorrect, achievementPhrase = 'Good Job!', edu = '') {
  const overlay = el('feedbackOverlay');
  if (!overlay) return;
  overlay.classList.add('visible');

  if (isCorrect) {
    el('feedbackEmoji').textContent = '🌟';
    el('feedbackText').textContent = achievementPhrase; // Exactly matches spoken voice!
    el('feedbackEducational').textContent = edu;
    el('feedbackEducational').style.display = edu ? 'block' : 'none';
    el('feedbackStars').textContent = '⭐⭐⭐';
    el('feedbackStars').style.display = 'block';
  } else {
    el('feedbackEmoji').textContent = '😊';
    el('feedbackText').textContent = achievementPhrase || 'Almost there, Chef! Try again!';
    el('feedbackEducational').textContent = edu;
    el('feedbackEducational').style.display = edu ? 'block' : 'none';
    el('feedbackStars').style.display = 'none';
    setTimeout(() => { hideFeedback(); }, 1800);
  }
}

function hideFeedback() {
  const overlay = el('feedbackOverlay');
  if (overlay) overlay.classList.remove('visible');
  if (state.feedbackTimeout) {
    clearTimeout(state.feedbackTimeout);
    state.feedbackTimeout = null;
  }
  VoiceManager.stop();
}

function bumpScore() {
  const sv = el('scoreDisplay');
  sv.classList.remove('bump'); void sv.offsetWidth; sv.classList.add('bump');
  setTimeout(() => sv.classList.remove('bump'), 500);
}

function launchConfetti() {
  const container = el('confettiContainer');
  container.innerHTML = '';
  const colors = ['#FFD93D', '#E74C3C', '#22C55E', '#3B82F6', '#FF006E', '#8338EC', '#FF6B2B', '#FFFFFF'];
  for (let i = 0; i < CFG.CONFETTI_COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top = '-20px';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
    p.style.width = p.style.height = (7 + Math.random() * 10) + 'px';
    p.style.animationDuration = (0.9 + Math.random() * 1.1) + 's';
    p.style.animationDelay = (Math.random() * 0.4) + 's';
    container.appendChild(p);
  }
  setTimeout(() => { container.innerHTML = ''; }, 2200);
}

function spawnCrumbs(angle) {
  const { cx, cy, r } = state;
  const container = el('confettiContainer');
  const canvas = getCanvas('pizzaCanvas');
  if (!canvas) return;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const dist = r * (0.2 + Math.random() * 0.7);
    const px = cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 20;
    const py = cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 20;
    const rect = canvas.getBoundingClientRect();
    const dpr = getDPI();
    p.style.left = (rect.left + px * (rect.width / canvas.width * dpr)) + 'px';
    p.style.top = (rect.top + py * (rect.height / canvas.height * dpr)) + 'px';
    p.style.backgroundColor = ['#FFD93D', '#F59E0B', '#E74C3C', '#FFF'][Math.floor(Math.random() * 4)];
    p.style.width = p.style.height = (4 + Math.random() * 5) + 'px';
    p.style.animationDuration = '0.6s';
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
  onFirstUserGesture();
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

/* ============================================================
   GLOBAL DYNAMIC UI SYSTEM
   Every level & question displays ONLY elements required.
   ============================================================ */

function getUIConfig(c) {
  if (!c) return null;
  const t = c.type;

  switch (t) {
    case 'slice':
      return {
        type: 'slice',
        layoutMode: 'layout-single-pizza',
        pizza: {
          count: 1,
          mode: 'cutting', // whole pizza, player cuts with knife
          knifeCursor: true,
          cutsNeeded: c.cuts,
          d: c.d,
          n: 1
        },
        actionButtons: {
          show: true,
          undoLabel: '✂️ Undo Cut',
          checkLabel: '✔ Check Slice!'
        },
        pips: {
          show: true,
          showCuts: true,
          showShading: false,
          cutsTotal: c.cuts,
          shadingTotal: 0
        },
        recipeCard: {
          show: true,
          header: 'RECIPE CARD',
          showFraction: true,
          fraction: { n: 1, d: c.d },
          caption: 'PIECE SIZE',
          question: c.msg,
          showOptions: false,
          options: []
        },
        chalkboard: { show: false },
        mascotSpeech: "Use the pizza knife to cut equal slices! 🔪",
        hint: `To make ${c.d} equal pieces, make ${c.cuts} slice${c.cuts !== 1 ? 's' : ''} from the center outward!`
      };

    case 'shade':
      return {
        type: 'shade',
        layoutMode: 'layout-single-pizza',
        pizza: {
          count: 1,
          mode: 'shading', // pre-divided into d slices, player taps to shade
          knifeCursor: false,
          cutsNeeded: 0,
          d: c.d,
          n: c.n
        },
        actionButtons: {
          show: true,
          undoLabel: '🧀 Undo Shade',
          checkLabel: '✔ Check Shading!'
        },
        pips: {
          show: true,
          showCuts: false,
          showShading: true,
          cutsTotal: 0,
          shadingTotal: c.n
        },
        recipeCard: {
          show: true,
          header: 'CHEESE TOPPING',
          showFraction: true,
          fraction: { n: c.n, d: c.d },
          caption: 'TARGET',
          question: c.msg,
          showOptions: false,
          options: []
        },
        chalkboard: { show: false },
        mascotSpeech: "Tap the slices to add melted cheese! 🧀",
        hint: `Tap ${c.n} slice${c.n > 1 ? 's' : ''} out of the ${c.d} pieces to add cheese!`
      };

    case 'order':
      return {
        type: 'order',
        layoutMode: 'layout-single-pizza',
        pizza: {
          count: 1,
          mode: 'cutting', // cutting first, then shading
          knifeCursor: true,
          cutsNeeded: c.cuts,
          d: c.d,
          n: c.n
        },
        actionButtons: {
          show: true,
          undoLabel: '✂️ Undo',
          checkLabel: '✔ Check Order!'
        },
        pips: {
          show: true,
          showCuts: true,
          showShading: true,
          cutsTotal: c.cuts,
          shadingTotal: c.n
        },
        recipeCard: {
          show: true,
          header: 'CUSTOMER ORDER',
          showFraction: true,
          fraction: { n: c.n, d: c.d },
          caption: 'ORDER',
          question: c.msg,
          showOptions: false,
          options: []
        },
        chalkboard: { show: false },
        mascotSpeech: "Customer waiting! Cut and top the pizza! 👨🍳",
        hint: `First make ${c.cuts} cuts to make ${c.d} slices, then shade ${c.n} slice${c.n > 1 ? 's' : ''}!`
      };

    case 'mc':
      return {
        type: 'mc',
        layoutMode: 'layout-single-pizza',
        pizza: {
          count: 1,
          mode: 'visual',
          knifeCursor: false,
          d: c.d,
          n: c.n
        },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: {
          show: true,
          header: 'FIND FRACTION',
          showFraction: false, // DO NOT SPOIL THE ANSWER!
          question: c.msg,
          showOptions: true,
          options: c.opts
        },
        chalkboard: { show: false },
        mascotSpeech: "Count the shaded cheese slices! 🍕",
        hint: `Count how many slices have yellow cheese out of the total slices!`
      };

    case 'equivalent':
      return {
        type: 'equivalent',
        layoutMode: 'layout-single-pizza',
        pizza: {
          count: 1,
          mode: 'visual',
          knifeCursor: false,
          d: c.d,
          n: c.n
        },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: {
          show: true,
          header: 'EQUIVALENT',
          showFraction: true,
          fraction: { n: c.n, d: c.d },
          caption: 'BASE FRACTION',
          question: c.msg,
          showOptions: true,
          options: c.opts
        },
        chalkboard: { show: false },
        mascotSpeech: "Which fraction has the exact same amount? 🔗",
        hint: "Multiply or divide top and bottom by the same number to find an equal slice!"
      };

    case 'sub':
      return {
        type: 'sub',
        layoutMode: 'layout-single-pizza',
        pizza: {
          count: 1,
          mode: 'visual',
          knifeCursor: false,
          d: c.f1.d,
          n: c.f1.n
        },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: {
          show: true,
          header: 'SUBTRACTION',
          showFraction: false,
          question: c.msg,
          showOptions: true,
          options: c.opts
        },
        chalkboard: { show: false },
        mascotSpeech: "Subtract the eaten slices from the starting pizza! ➖",
        hint: "Keep the bottom number the same and subtract the top numbers!"
      };

    case 'compare':
      return {
        type: 'compare',
        layoutMode: 'layout-dual-pizza',
        pizza: {
          count: 2,
          mode: 'dual-static',
          f1: c.f1,
          labelA: 'Pizza A',
          f2: c.f2,
          labelB: 'Pizza B',
          operator: 'VS',
          knifeCursor: false
        },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: {
          show: true,
          header: 'COMPARE',
          showFraction: false,
          question: c.msg,
          showOptions: true,
          options: [
            { l: '🍕 Pizza A', v: 'A' },
            { l: '✨ Same', v: '=' },
            { l: '🍕 Pizza B', v: 'B' }
          ]
        },
        chalkboard: { show: false },
        mascotSpeech: "Which pizza has more melted cheese? ⚖️",
        hint: "Look closely at which pizza has a bigger portion of yellow cheese."
      };

    case 'add':
      return {
        type: 'add',
        layoutMode: 'layout-dual-pizza',
        pizza: {
          count: 2,
          mode: 'dual-static',
          f1: c.f1,
          labelA: `${c.f1.n}/${c.f1.d}`,
          f2: c.f2,
          labelB: `${c.f2.n}/${c.f2.d}`,
          operator: '+',
          knifeCursor: false
        },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: {
          show: true,
          header: 'ADDITION',
          showFraction: false,
          question: c.msg,
          showOptions: true,
          options: c.opts
        },
        chalkboard: { show: false },
        mascotSpeech: "Add the slices together! ➕",
        hint: `Denominators are the same (${c.f1.d}). Just add the top numbers: ${c.f1.n} + ${c.f2.n}!`
      };

    case 'match':
      return {
        type: 'match',
        layoutMode: 'layout-match-pizza',
        pizza: {
          count: 3,
          mode: 'match-static',
          candidates: c.pizzas,
          knifeCursor: false
        },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: {
          show: true,
          header: 'FRACTION MATCH',
          showFraction: true,
          fraction: { n: c.n, d: c.d },
          caption: 'TARGET',
          question: `Find the pizza that shows ${c.n}/${c.d}! Click on it! 🔍`,
          showOptions: false
        },
        chalkboard: { show: false },
        mascotSpeech: `Which pizza shows ${c.n}/${c.d}? Click it! 🔍`,
        hint: `Look for ${c.n} shaded slices out of ${c.d} total pieces!`
      };

    case 'num_denom':
      return {
        type: 'num_denom',
        layoutMode: 'layout-chalkboard',
        pizza: { count: 0 },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: { show: false },
        chalkboard: {
          show: true,
          icon: '📚',
          title: 'PARTS OF A FRACTION',
          equation: (c.n && c.d) ? `${c.n} / ${c.d}` : null,
          question: c.msg,
          options: c.opts
        },
        mascotSpeech: "Numerator or denominator? You got this! 📚",
        hint: "Numerator (top) = parts taken. Denominator (bottom) = total equal parts!"
      };

    case 'complete_frac':
      return {
        type: 'complete_frac',
        layoutMode: 'layout-chalkboard',
        pizza: { count: 0 },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: { show: false },
        chalkboard: {
          show: true,
          icon: '🔗',
          title: 'EQUIVALENT MATCH',
          equation: (c.f1) ? `${c.f1.n}/${c.f1.d} = ?` : null,
          question: c.msg,
          options: c.opts
        },
        mascotSpeech: "Find the matching equal fraction! 🔗",
        hint: "Think about simplifying or expanding the fraction by multiplying!"
      };

    case 'word_problem':
      return {
        type: 'word_problem',
        layoutMode: 'layout-chalkboard',
        pizza: { count: 0 },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: { show: false },
        chalkboard: {
          show: true,
          icon: '📖',
          title: 'CHEF STORY PROBLEM',
          equation: null,
          question: c.msg,
          options: c.opts
        },
        mascotSpeech: "Read the story carefully, Chef! 📖",
        hint: "Count total slices for the bottom, and slices eaten for the top!"
      };

    case 'mult':
      return {
        type: 'mult',
        layoutMode: 'layout-chalkboard',
        pizza: { count: 0 },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: { show: false },
        chalkboard: {
          show: true,
          icon: '✖️',
          title: 'FRACTION MULTIPLICATION',
          equation: `${c.f1.n}/${c.f1.d} × ${c.f2.n}/${c.f2.d}`,
          question: c.msg,
          options: c.opts
        },
        mascotSpeech: "Multiply top × top, and bottom × bottom! ✖️",
        hint: "Multiply the top numbers together, and multiply the bottom numbers together!"
      };

    case 'div':
      return {
        type: 'div',
        layoutMode: 'layout-chalkboard',
        pizza: { count: 0 },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: { show: false },
        chalkboard: {
          show: true,
          icon: '➗',
          title: 'FRACTION DIVISION',
          equation: `${c.f1.n}/${c.f1.d} ÷ ${c.f2.n}/${c.f2.d}`,
          question: c.msg,
          options: c.opts
        },
        mascotSpeech: "How many pieces fit inside? ➗",
        hint: "Think about how many slices of this size fit inside the whole!"
      };

    case 'diff_denom':
      return {
        type: 'diff_denom',
        layoutMode: 'layout-chalkboard',
        pizza: { count: 0 },
        actionButtons: { show: false },
        pips: { show: false },
        recipeCard: { show: false },
        chalkboard: {
          show: true,
          icon: '🔄',
          title: 'DIFFERENT DENOMINATORS',
          equation: `${c.f1.n}/${c.f1.d} ${c.op} ${c.f2.n}/${c.f2.d}`,
          question: c.msg,
          options: c.opts
        },
        mascotSpeech: "Find the common denominator first! 🔄",
        hint: "Find a common denominator so both fractions have matching bottom numbers!"
      };

    default:
      return null;
  }
}

function initPizzaCanvasEvents() {
  const canvas = getCanvas('pizzaCanvas');
  if (!canvas || canvas._eventsBound) return;
  canvas._eventsBound = true;
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerLeave);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp, { passive: false });
  canvas.addEventListener('touchcancel', onPointerLeave, { passive: false });
}

function applyUIConfig(cfg) {
  if (!cfg) return;

  const gameArea = el('gameArea');
  if (gameArea) {
    gameArea.className = 'game-main-layout ' + (cfg.layoutMode || 'layout-single-pizza');
  }

  // 1. LEFT SECTION (Mascot speech)
  setMascotSpeech(cfg.mascotSpeech);

  // 2. CENTER SECTION
  const pizzaWrapper = el('pizzaWrapper');
  const specialArea = el('specialGameArea');
  const dualPizza = el('dualPizzaContainer');
  const matchPizza = el('matchPizzaContainer');
  const mathVisual = el('mathVisualCard');
  const pizzaCanvas = getCanvas('pizzaCanvas');

  // Helper to strictly show/hide elements with both classList and inline style.display
  function setVisibility(elem, isVisible, displayType = 'flex') {
    if (!elem) return;
    if (isVisible) {
      elem.classList.remove('hidden');
      elem.style.display = displayType;
    } else {
      elem.classList.add('hidden');
      elem.style.display = 'none';
    }
  }

  // Reset ALL center containers to strict display: none
  setVisibility(pizzaWrapper, false);
  setVisibility(specialArea, false);
  setVisibility(dualPizza, false);
  setVisibility(matchPizza, false);
  setVisibility(mathVisual, false);

  if (cfg.layoutMode === 'layout-single-pizza') {
    // Exactly ONE pizza: Show main pizza wrapper, strictly hide Pizza A, Pizza B and special area
    setVisibility(pizzaWrapper, true, 'flex');
    setVisibility(specialArea, false);
    setVisibility(dualPizza, false);
    setVisibility(matchPizza, false);
    setVisibility(mathVisual, false);

    // Wipe any lingering pixels on dual canvases
    const cA = getCanvas('pizzaCanvasA');
    if (cA) { const ctxA = cA.getContext('2d'); if (ctxA) ctxA.clearRect(0, 0, cA.width, cA.height); }
    const cB = getCanvas('pizzaCanvasB');
    if (cB) { const ctxB = cB.getContext('2d'); if (ctxB) ctxB.clearRect(0, 0, cB.width, cB.height); }

    initPizzaCanvasEvents();
    resizeMainCanvas();

    const pz = cfg.pizza;
    if (pz.mode === 'cutting') {
      if (pizzaCanvas) pizzaCanvas.className = 'cutting-active';
      state.cutAngles = [];
      state.wedges = [];
      state.phase = 'cutting';
    } else if (pz.mode === 'shading') {
      if (pizzaCanvas) pizzaCanvas.className = 'shading-active';
      state.cutAngles = [];
      const ideal = (Math.PI * 2) / pz.d;
      for (let i = 1; i < pz.d; i++) {
        state.cutAngles.push(-Math.PI / 2 + (i * ideal));
      }
      state.wedges = computeWedges();
      state.wedges.forEach(w => w.shaded = false);
      state.phase = 'shading';
    } else if (pz.mode === 'visual') {
      if (pizzaCanvas) pizzaCanvas.className = 'visual-only';
      state.cutAngles = [];
      const ideal = (Math.PI * 2) / pz.d;
      for (let i = 1; i < pz.d; i++) {
        state.cutAngles.push(-Math.PI / 2 + (i * ideal));
      }
      state.wedges = computeWedges();
      for (let i = 0; i < pz.n; i++) {
        if (state.wedges[i]) state.wedges[i].shaded = true;
      }
      state.phase = cfg.type;
    }
    redrawMain();

  } else if (cfg.layoutMode === 'layout-dual-pizza') {
    // Comparison / Addition: Show Pizza A & B ONLY, strictly hide the single pizza canvas and wrapper
    setVisibility(pizzaWrapper, false);
    setVisibility(specialArea, true, 'flex');
    setVisibility(dualPizza, true, 'flex');
    setVisibility(matchPizza, false);
    setVisibility(mathVisual, false);

    // Clear single pizza canvas to avoid any phantom slices
    if (pizzaCanvas) {
      const ctx = pizzaCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, pizzaCanvas.width, pizzaCanvas.height);
    }

    state.phase = cfg.type;

    const opBadge = el('dualOperatorBadge');
    if (opBadge) opBadge.textContent = cfg.pizza.operator;
    const lblA = el('labelPizzaA');
    const lblB = el('labelPizzaB');
    if (lblA) lblA.textContent = cfg.pizza.labelA;
    if (lblB) lblB.textContent = cfg.pizza.labelB;

    redrawStaticPizza('pizzaCanvasA', cfg.pizza.f1);
    redrawStaticPizza('pizzaCanvasB', cfg.pizza.f2);

  } else if (cfg.layoutMode === 'layout-match-pizza') {
    // 3 Candidate Pizzas: Show match pizza container, strictly hide main pizza and dual pizza
    setVisibility(pizzaWrapper, false);
    setVisibility(specialArea, true, 'flex');
    setVisibility(matchPizza, true, 'flex');
    setVisibility(dualPizza, false);
    setVisibility(mathVisual, false);

    if (matchPizza) {
      matchPizza.innerHTML = '';
      state.phase = 'match';

      cfg.pizza.candidates.forEach((pFrac, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'match-pizza-side';
        const canv = document.createElement('canvas');
        canv.id = 'matchCanvas' + idx;
        wrapper.appendChild(canv);
        const label = document.createElement('div');
        label.className = 'pizza-label';
        label.textContent = `Pizza ${String.fromCharCode(65 + idx)}`;
        wrapper.appendChild(label);
        matchPizza.appendChild(wrapper);

        setTimeout(() => {
          redrawStaticPizza(canv.id, pFrac);
          canv.onclick = (e) => {
            SoundManager.playClick();
            handleOptionClick(idx, canv);
          };
        }, 0);
      });
    }

  } else if (cfg.layoutMode === 'layout-chalkboard') {
    // 0 Pizzas: Chalkboard mode, strictly hide main pizza, dual pizza and match pizza
    setVisibility(pizzaWrapper, false);
    setVisibility(specialArea, true, 'flex');
    setVisibility(mathVisual, true, 'flex');
    setVisibility(dualPizza, false);
    setVisibility(matchPizza, false);

    state.phase = cfg.type;

    const cIcon = el('chalkIcon');
    if (cIcon) cIcon.textContent = cfg.chalkboard.icon;
    const cTitle = el('chalkTitle');
    if (cTitle) cTitle.textContent = cfg.chalkboard.title;

    const eqWrap = el('chalkEquationWrap');
    const eqEl = el('chalkEquation');
    if (cfg.chalkboard.equation) {
      setVisibility(eqWrap, true, 'block');
      if (eqEl) eqEl.textContent = cfg.chalkboard.equation;
    } else {
      setVisibility(eqWrap, false);
    }

    const desc = el('mathVisualDesc');
    if (desc) desc.textContent = cfg.chalkboard.question;

    const mcBox = el('chalkMCContainer');
    if (mcBox) {
      mcBox.innerHTML = '';
      if (cfg.chalkboard.options && Array.isArray(cfg.chalkboard.options)) {
        cfg.chalkboard.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'chalk-mc-btn';
          btn.textContent = opt;
          btn.onclick = (e) => {
            SoundManager.playClick();
            handleOptionClick(opt, e.target);
          };
          mcBox.appendChild(btn);
        });
      }
    }
  }

  // 3. RIGHT SECTION (Recipe Card)
  const rightCol = el('gameRightCol');
  if (rightCol) {
    if (cfg.recipeCard.show) {
      setVisibility(rightCol, true, 'flex');
      const cardTitle = el('recipeCardTitle');
      if (cardTitle) cardTitle.textContent = cfg.recipeCard.header;

      const fracEl = el('fractionDisplay');
      if (fracEl) {
        if (cfg.recipeCard.showFraction && cfg.recipeCard.fraction) {
          setVisibility(fracEl, true, 'flex');
          el('fracNumerator').textContent = cfg.recipeCard.fraction.n;
          el('fracDenominator').textContent = cfg.recipeCard.fraction.d;
          const cap = el('fracCaption');
          if (cap) cap.textContent = cfg.recipeCard.caption || 'FRACTION';
        } else {
          setVisibility(fracEl, false);
        }
      }

      el('challengeText').textContent = cfg.recipeCard.question;

      const mcContainer = el('multipleChoiceContainer');
      if (mcContainer) {
        mcContainer.innerHTML = '';
        if (cfg.recipeCard.showOptions && cfg.recipeCard.options && cfg.recipeCard.options.length > 0) {
          setVisibility(mcContainer, true, 'flex');
          cfg.recipeCard.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'mc-btn';
            if (typeof opt === 'object') {
              btn.textContent = opt.l;
              btn.onclick = (e) => {
                SoundManager.playClick();
                handleOptionClick(opt.v, e.target);
              };
            } else {
              btn.textContent = opt;
              btn.onclick = (e) => {
                SoundManager.playClick();
                handleOptionClick(opt, e.target);
              };
            }
            mcContainer.appendChild(btn);
          });
        } else {
          setVisibility(mcContainer, false);
        }
      }
    } else {
      setVisibility(rightCol, false);
    }
  }

  // 4. BOTTOM SECTION (Action buttons: Undo & Check Slice)
  const ab = el('actionButtons');
  if (ab) {
    if (cfg.actionButtons.show) {
      setVisibility(ab, true, 'flex');
      const uBtn = el('btnUndo');
      const cBtn = el('btnCheck');
      if (uBtn) uBtn.innerHTML = `<span class="btn-emoji">${cfg.type === 'shade' ? '🧀' : '✂️'}</span> ${cfg.actionButtons.undoLabel}`;
      if (cBtn) cBtn.innerHTML = `<span class="btn-emoji">✔</span> ${cfg.actionButtons.checkLabel}`;
    } else {
      setVisibility(ab, false);
    }
  }

  const nbc = el('nextButtonContainer');
  if (nbc) nbc.classList.add('hidden');
}

function renderLevelUI() {
  if (state.currentUIConfig) {
    applyUIConfig(state.currentUIConfig);
  }
}

function startNewQuestion() {
  if (state.challengeNumber >= CFG.CHALLENGES_PER_LEVEL) {
    endLevel();
    return;
  }

  VoiceManager.stop();
  clearGameState();
  state.challengeNumber++;

  const subIdx = Math.max(0, Math.min(CFG.CHALLENGES_PER_LEVEL - 1, state.challengeNumber - 1));
  state.challenge = generateChallengeForLevel(state.currentLevel, subIdx);
  const c = state.challenge;
  if (!c || !c.msg) return;

  state.toppings = generateToppings(150);
  state.currentUIConfig = getUIConfig(c);
  applyUIConfig(state.currentUIConfig);
  updateUI();
}

function endLevel() {
  if (state.timerId) clearInterval(state.timerId);
  VoiceManager.stop();
  clearGameState();

  let starsEarned = 1;
  if (state.score >= 300) starsEarned = 3;
  else if (state.score >= 180) starsEarned = 2;

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
    const endPhrase = 'Amazing!';
    VoiceManager.speak(endPhrase);
    launchConfetti();
  } else {
    el('levelStarsDisplay').textContent = '⭐'.repeat(starsEarned);
    el('levelScoreDisplay').textContent = state.score;
    const lvlTitle = LEVELS[state.currentLevel - 1].title;
    const endPhrase = 'Wonderful!';
    el('levelCompleteSub').textContent = `Wonderful! Great job on ${lvlTitle.split(':')[0]}!`;
    switchScreen('levelCompleteScreen');
    VoiceManager.speak(endPhrase);
    launchConfetti();
  }
}

/* ============================================================
   14. EVENT LISTENERS
   ============================================================ */

el('btnStartGame').addEventListener('click', () => {
  onFirstUserGesture();
  SoundManager.playClick();
  switchScreen('levelMapScreen');
  initMap();
});
el('btnHowToPlay').addEventListener('click', () => {
  onFirstUserGesture();
  SoundManager.playClick();
  switchScreen('howToPlayScreen');
});
el('btnHowToBack').addEventListener('click', () => {
  SoundManager.playClick();
  switchScreen('startScreen');
});

el('btnBackToMap').addEventListener('click', () => {
  if (state.timerId) clearInterval(state.timerId);
  SoundManager.playClick();
  switchScreen('levelMapScreen');
  initMap();
});
el('btnBackToMapFromLevel').addEventListener('click', () => {
  SoundManager.playClick();
  switchScreen('levelMapScreen');
  initMap();
});
el('btnBackToMapFromEnd').addEventListener('click', () => {
  SoundManager.playClick();
  switchScreen('levelMapScreen');
  initMap();
});

el('btnNextLevel').addEventListener('click', () => {
  SoundManager.playClick();
  startGameLevel(state.currentLevel + 1);
});
el('btnPlayAgain').addEventListener('click', () => {
  sessionState.unlockedLevels = 1;
  sessionState.levelStars.fill(0);
  sessionState.totalScore = 0;
  SoundManager.playClick();
  switchScreen('levelMapScreen');
  initMap();
});

el('btnCheck').addEventListener('click', () => {
  SoundManager.playClick();
  checkAnswer();
});

el('btnReset').addEventListener('click', () => {
  SoundManager.playClick();
  startGameLevel(state.currentLevel);
});

// Undo support for cutting AND shading
el('btnUndo').addEventListener('click', () => {
  SoundManager.playUndo();
  if (state.phase === 'cutting') {
    if (state.cutAngles.length === 0) return;
    state.cutAngles.pop();
    state.wedges = state.cutAngles.length > 0 ? computeWedges() : [];
    state.wedges.forEach(w => w.shaded = false);
    setMascotSpeech('No worries, Chef! Slice again! 🔪');
  } else if (state.phase === 'shading') {
    // Unshade the last shaded wedge
    const shadedIdxs = [];
    state.wedges.forEach((w, i) => { if (w.shaded) shadedIdxs.push(i); });
    if (shadedIdxs.length > 0) {
      state.wedges[shadedIdxs[shadedIdxs.length - 1]].shaded = false;
      setMascotSpeech('Slice unshaded! 🧀');
    } else if (state.challenge.type !== 'shade' && state.cutAngles.length > 0) {
      // In levels where cutting led to shading (like Level 8)
      state.phase = 'cutting';
      const canvas = getCanvas('pizzaCanvas');
      if (canvas) canvas.className = 'cutting-active';
      state.cutAngles.pop();
      state.wedges = state.cutAngles.length > 0 ? computeWedges() : [];
      setMascotSpeech('Back to cutting! 🔪');
    }
  }
  updateUI();
  redrawMain();
});

el('btnHint').addEventListener('click', () => {
  SoundManager.playClick();
  state.hintUsed = true;
  const hp = el('hintPopup');
  const ht = el('hintText');
  let hintMsg = state.currentUIConfig?.hint || "Think about the recipe problem!";
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

/* ============================================================
   AUDIO CONTROLS (INDEPENDENT MUSIC & SFX TOGGLES)
   ============================================================ */

function updateAudioButtons() {
  const musicTxt = musicEnabled ? '🎵' : '🔇';
  const soundTxt = soundEnabled ? '🔊' : '🔇';

  ['btnMusicStart', 'btnMusicMap', 'btnMusicGame'].forEach(id => {
    const b = el(id);
    if (b) {
      b.textContent = musicTxt;
      b.classList.toggle('muted', !musicEnabled);
    }
  });

  ['btnSoundStart', 'btnSoundMap', 'btnSoundGame'].forEach(id => {
    const b = el(id);
    if (b) {
      b.textContent = soundTxt;
      b.classList.toggle('muted', !soundEnabled);
    }
  });
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pizza_music', musicEnabled ? 'true' : 'false');
    }
  } catch (e) {}
  BGM.updateVolume();
  updateAudioButtons();
  if (musicEnabled) {
    getAudioCtx();
    BGM.start();
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) {
    VoiceManager.stop();
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pizza_sfx', soundEnabled ? 'true' : 'false');
    }
  } catch (e) {}
  SoundManager.updateVolume();
  updateAudioButtons();
  if (soundEnabled) SoundManager.playClick();
}

['btnMusicStart', 'btnMusicMap', 'btnMusicGame'].forEach(id => {
  const b = el(id);
  if (b) b.addEventListener('click', toggleMusic);
});

['btnSoundStart', 'btnSoundMap', 'btnSoundGame'].forEach(id => {
  const b = el(id);
  if (b) b.addEventListener('click', toggleSound);
});

// Autoplay policy handler: start background music & speech on first user gesture
function onFirstUserGesture() {
  getAudioCtx();
  if (musicEnabled) {
    BGM.start();
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.getVoices(); } catch (e) {}
  }
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('pointerdown', onFirstUserGesture, { once: true });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!state.currentUIConfig) return;
    const mode = state.currentUIConfig.layoutMode;
    if (mode === 'layout-single-pizza') {
      resizeMainCanvas();
      redrawMain();
    } else if (mode === 'layout-dual-pizza') {
      if (state.challenge) {
        redrawStaticPizza('pizzaCanvasA', state.challenge.f1);
        redrawStaticPizza('pizzaCanvasB', state.challenge.f2);
      }
    } else if (mode === 'layout-match-pizza') {
      if (state.challenge && state.challenge.pizzas) {
        state.challenge.pizzas.forEach((pFrac, idx) => redrawStaticPizza('matchCanvas' + idx, pFrac));
      }
    }
  }, 120);
});

// Init
initPizzaCanvasEvents();
updateAudioButtons();
switchScreen('startScreen');
