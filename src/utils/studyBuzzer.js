/**
 * Study Mode Buzzer & Device Vibration Utility
 * 
 * Provides:
 * - Web Audio API buzzer tone (pulsing alarm sound for ~5 seconds)
 * - Mobile device vibration via navigator.vibrate
 * - Clean stop & cancellation
 * - AudioContext gesture unlock
 */

let sharedAudioCtx = null;
let activeBuzzerTimeout = null;
let activeInterval = null;
let isCurrentlyBuzzing = false;
let activeGainNodes = [];

/**
 * Returns or creates the singleton AudioContext.
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

/**
 * Unlocks AudioContext on user interaction to comply with browser autoplay policies.
 */
export function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays a single buzzer pulse with harmonic tones for a rich alert sound.
 * @param {AudioContext} ctx 
 * @param {number} startTime 
 * @param {number} duration 
 */
function scheduleBuzzerPulse(ctx, startTime, duration = 0.25) {
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Two harmonic frequencies for a classic electronic buzzer tone
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(520, startTime); // E5

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(659.25, startTime); // E5 harmonic

    // Low-pass filter to smooth out harsh high frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, startTime);

    // Volume envelope (smooth attack and release to avoid clicks)
    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
    gainNode.gain.setValueAtTime(0.25, startTime + duration - 0.04);
    gainNode.gain.linearRampToValueAtTime(0.001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);

    activeGainNodes.push(gainNode);
  } catch (err) {
    console.warn('Audio buzzer pulse error:', err);
  }
}

/**
 * Plays a brief confirmation chime when the user turns sound on.
 */
export function playConfirmationChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);

    // Short tactile feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(60);
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Confirmation chime error:', err);
  }
}

/**
 * Buzzes the device for the given duration (default 5000ms / 5 seconds).
 * - Emits a series of audio buzzer beeps
 * - Vibrates the device motor via navigator.vibrate
 * 
 * @param {number} durationMs Total buzz duration in milliseconds (default: 5000)
 * @param {Function} [onEnd] Optional callback when buzz finishes
 * @returns {Function} Function to immediately stop buzzing
 */
export function playTimerBuzzer(durationMs = 5000, onEnd) {
  // Stop any currently running buzz
  stopTimerBuzzer();

  isCurrentlyBuzzing = true;
  unlockAudioContext();

  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Schedule buzzer pulses across the 5 seconds:
    // 250ms buzz, 150ms rest (pulse cycle = 400ms -> ~12 pulses in 5 seconds)
    const pulseDuration = 0.25;
    const pulseGap = 0.15;
    const cycle = pulseDuration + pulseGap;
    const totalCycles = Math.floor((durationMs / 1000) / cycle);

    for (let i = 0; i < totalCycles; i++) {
      scheduleBuzzerPulse(ctx, now + (i * cycle), pulseDuration);
    }
  }

  // Device vibration pattern for 5 seconds (~5000ms)
  // [pulse, pause, pulse, pause...]
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      const vibPattern = [
        300, 150, 300, 150, 300, 150, 300, 150, 
        300, 150, 300, 150, 300, 150, 300, 150, 
        300, 150, 300, 150, 300
      ];
      navigator.vibrate(vibPattern);
    } catch (_) {}
  }

  // Automatic cleanup after durationMs
  activeBuzzerTimeout = setTimeout(() => {
    stopTimerBuzzer();
    if (onEnd) onEnd();
  }, durationMs);

  return stopTimerBuzzer;
}

/**
 * Immediately stops the buzzer sound and cancels vibration.
 */
export function stopTimerBuzzer() {
  isCurrentlyBuzzing = false;

  if (activeBuzzerTimeout) {
    clearTimeout(activeBuzzerTimeout);
    activeBuzzerTimeout = null;
  }

  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  // Mute active gain nodes immediately
  for (const gain of activeGainNodes) {
    try {
      gain.gain.setValueAtTime(0, 0);
    } catch (_) {}
  }
  activeGainNodes = [];

  // Stop device vibration
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (_) {}
  }
}

/**
 * Returns whether the device is currently buzzing.
 */
export function getIsCurrentlyBuzzing() {
  return isCurrentlyBuzzing;
}
