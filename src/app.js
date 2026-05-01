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

// ── 전역 상태 ─────────────────────────────────────────────────────────────

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('main-canvas'));
const ctx    = canvas.getContext('2d');
const synth  = new SoundSynth();
const adTimer = new AdTimer(15_000);

let currentMode = null;
let currentName = '';
let userInteracted = false;

// 모드 전환 페이드 오버레이 (1.0 = 완전 검정, 0 = 투명)
let fadeAlpha = 0;

const loop = new AnimLoop((dt) => {
  currentMode?.update(dt);

  // 페이드인 오버레이 (모드 전환 시 부드러운 전환)
  if (fadeAlpha > 0) {
    fadeAlpha = Math.max(0, fadeAlpha - dt * 0.005); // ~200ms 페이드
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
});

// ── Canvas 리사이즈 ────────────────────────────────────────────────────────

function resize() {
  const bannerH = window.innerWidth <= 768 ? 50 : 90;
  const navH    = 60;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight - bannerH - navH;
  // 모드에 리사이즈 알림 (필요 시 재초기화)
  if (currentMode?.resize) currentMode.resize();
}

window.addEventListener('resize', resize, { passive: true });

// ── 모드 전환 ──────────────────────────────────────────────────────────────

function switchMode(name) {
  if (name === currentName) return;

  // 광고 인터스티셜
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
  fadeAlpha = 1.0; // 새 모드 진입 시 검정에서 페이드인

  // 버튼 활성 상태
  document.querySelectorAll('.mode-bar [data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === name);
  });
}

// ── 광고 인터스티셜 ────────────────────────────────────────────────────────

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

// 5분 체류 보너스 배너
setTimeout(() => {
  if (adTimer.canShowBonus()) {
    const bonus = document.getElementById('ad-bonus');
    if (bonus) bonus.hidden = false;
  }
}, 5 * 60 * 1000);

// ── 음향 토글 ──────────────────────────────────────────────────────────────

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

// ── 첫 인터랙션 감지 ────────────────────────────────────────────────────────

function onFirstInteraction() {
  if (userInteracted) return;
  userInteracted = true;
  synth.init();

  // 음향 유도 토스트 (아직 OFF인 경우)
  if (!soundEnabled) {
    showSoundToast();
  }
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

// ── 모드 버튼 이벤트 ────────────────────────────────────────────────────────

document.querySelectorAll('.mode-bar [data-mode]').forEach(btn => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

// 키보드 접근성 — Tab + Enter/Space로 모드 전환
document.addEventListener('keydown', (e) => {
  const modeKeys = { '1': 'fracture', '2': 'slime', '3': 'destroy', '4': 'ripple' };
  if (modeKeys[e.key]) switchMode(modeKeys[e.key]);
});

// ── 시작 ───────────────────────────────────────────────────────────────────

resize();
switchMode('ripple');
loop.start();
