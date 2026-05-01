/**
 * app.js — 진입점: 모드 전환 + 광고 타이밍 + 음향 토글
 */
import { FractureMode } from './modes/fracture.js';
import { SlimeMode }    from './modes/slime-mode.js';
import { DestroyMode }  from './modes/destroy.js';
import { RippleMode }   from './modes/ripple.js';
import { SoundSynth }   from './audio/synth.js';
import { AnimLoop }     from './utils/fps.js';
import { AdTimer, SoundPreference } from './ads/ad-timer.js';

const MODES = {
  fracture: FractureMode,
  slime:    SlimeMode,
  destroy:  DestroyMode,
  ripple:   RippleMode,
};

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('main-canvas'));
const ctx    = canvas.getContext('2d');
const synth  = new SoundSynth();
const adTimer = new AdTimer(15_000);

let currentMode = null;
let currentName = '';
let userInteracted = false;
let fadeAlpha = 0;

const loop = new AnimLoop((dt) => {
  currentMode?.update(dt);
  if (fadeAlpha > 0) {
    fadeAlpha = Math.max(0, fadeAlpha - dt * 0.005);
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
});

function resize() {
  const bannerH = window.innerWidth <= 768 ? 50 : 90;
  const navH    = 60;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight - bannerH - navH;
  if (currentMode?.resize) currentMode.resize();
}

window.addEventListener('resize', resize, { passive: true });

function switchMode(name) {
  if (name === currentName) return;
  if (userInteracted && adTimer.canShow()) {
    adTimer.markShown();
    showInterstitialAd(() => _doSwitch(name));
  } else {
    _doSwitch(name);
  }
}

function _doSwitch(name) {
  currentMode?.unmount();
  currentName = name;
  currentMode = new MODES[name](canvas, ctx, synth);
  currentMode.mount();
  fadeAlpha = 1.0;
  document.querySelectorAll('.mode-bar [data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === name);
  });
}

function showInterstitialAd(onClose) {
  const el   = document.getElementById('ad-inter');
  const skip = document.getElementById('ad-skip');
  if (!el) { onClose?.(); return; }
  el.hidden = false;
  el.removeAttribute('aria-hidden');
  const close = () => {
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    onClose?.();
  };
  const timer = setTimeout(close, 5000);
  skip.onclick = () => { clearTimeout(timer); close(); };
}

setTimeout(() => {
  if (adTimer.canShowBonus()) {
    const bonus = document.getElementById('ad-bonus');
    if (bonus) bonus.hidden = false;
  }
}, 5 * 60 * 1000);

const soundBtn = document.getElementById('sound-toggle');
let soundEnabled = SoundPreference.load();
synth._enabled = soundEnabled;

function updateSoundBtn() {
  if (soundBtn) soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
}

soundBtn?.addEventListener('click', () => {
  soundEnabled = synth.toggle();
  SoundPreference.save(soundEnabled);
  updateSoundBtn();
});

updateSoundBtn();

function onFirstInteraction() {
  if (userInteracted) return;
  userInteracted = true;
  synth.init();
  if (!soundEnabled) showSoundToast();
}

canvas.addEventListener('pointerdown', onFirstInteraction, { once: true });

function showSoundToast() {
  const toast = document.getElementById('sound-toast');
  if (!toast) return;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 3500);
  toast.addEventListener('click', () => {
    soundEnabled = synth.toggle();
    if (soundEnabled) { SoundPreference.save(true); updateSoundBtn(); }
    toast.hidden = true;
  }, { once: true });
}

document.querySelectorAll('.mode-bar [data-mode]').forEach(btn => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

document.addEventListener('keydown', (e) => {
  const modeKeys = { '1': 'ripple', '2': 'fracture', '3': 'slime', '4': 'destroy' };
  if (modeKeys[e.key]) switchMode(modeKeys[e.key]);
});

resize();
switchMode('ripple');
loop.start();
