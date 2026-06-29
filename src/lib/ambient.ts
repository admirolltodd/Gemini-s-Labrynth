/**
 * Procedural grimdark ambient music engine.
 *
 * Synthesizes a dark, evolving drone entirely in code via the Web Audio API.
 * No audio files are bundled — this is generated tone, so there is zero APK
 * size cost and zero licensing/copyright concern (it is not a recording).
 *
 * Signal chain:
 *   drone oscillators -> droneGain -> swellGain (LFO-modulated) -> lowpass
 *     -> masterGain (user volume) -> destination
 * Occasional distant "bell" tones are scheduled through their own path for
 * atmosphere.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let swellGain: GainNode | null = null;
let oscillators: OscillatorNode[] = [];
let lfo: OscillatorNode | null = null;
let bellTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let currentVolume = 0.4;

// A1 root, a perfect fifth (E2), the octave (A2), and a low sub for weight.
const DRONE_VOICES: { freq: number; type: OscillatorType; gain: number; detune: number }[] = [
  { freq: 41.2, type: "sine", gain: 0.55, detune: 0 },   // E1 sub
  { freq: 55.0, type: "sine", gain: 0.5, detune: -4 },   // A1 root
  { freq: 82.4, type: "triangle", gain: 0.24, detune: 5 }, // E2 fifth
  { freq: 110.0, type: "triangle", gain: 0.16, detune: -6 }, // A2 octave
];

// Dissonant-but-grand intervals for the distant tolling bell.
const BELL_NOTES = [220.0, 261.6, 277.2, 329.6, 174.6];

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function scheduleBell() {
  if (!running || !ctx || !masterGain) return;
  // Random distant toll every 14–34 seconds.
  const delay = 14000 + Math.random() * 20000;
  bellTimer = setTimeout(() => {
    if (!running || !ctx || !masterGain) return;
    try {
      const note = BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)];
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = note;
      const g = ctx.createGain();
      // Soft, slow swell so it reads as "distant", never a jump-scare.
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.06, now + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 6);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 6.2);
    } catch {
      /* non-critical */
    }
    scheduleBell();
  }, delay);
}

export function isAmbientRunning(): boolean {
  return running;
}

export function startAmbient(volume = 0.4) {
  if (running) {
    setAmbientVolume(volume);
    return;
  }
  const context = ensureContext();
  if (!context) return;

  try {
    currentVolume = volume;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
      // If still blocked by autoplay policy, resume on the next user gesture.
      const resumeOnGesture = () => {
        context.resume().catch(() => {});
        window.removeEventListener("pointerdown", resumeOnGesture);
        window.removeEventListener("keydown", resumeOnGesture);
      };
      window.addEventListener("pointerdown", resumeOnGesture, { once: true });
      window.addEventListener("keydown", resumeOnGesture, { once: true });
    }

    masterGain = context.createGain();
    masterGain.gain.value = 0.0001;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.6;

    swellGain = context.createGain();
    swellGain.gain.value = 0.85;

    const droneGain = context.createGain();
    droneGain.gain.value = 0.5;

    // Build the drone voices.
    oscillators = [];
    for (const v of DRONE_VOICES) {
      const osc = context.createOscillator();
      osc.type = v.type;
      osc.frequency.value = v.freq;
      osc.detune.value = v.detune;
      const g = context.createGain();
      g.gain.value = v.gain;
      osc.connect(g);
      g.connect(droneGain);
      osc.start();
      oscillators.push(osc);
    }

    // Slow breathing swell (~22s cycle) modulating the swell gain.
    lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.045;
    const lfoDepth = context.createGain();
    lfoDepth.gain.value = 0.13;
    lfo.connect(lfoDepth);
    lfoDepth.connect(swellGain.gain);
    lfo.start();

    // Wire the chain.
    droneGain.connect(swellGain);
    swellGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(context.destination);

    // Fade in.
    const now = context.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(currentVolume, now + 4);

    running = true;
    scheduleBell();
  } catch (e) {
    console.error("Ambient start error:", e);
  }
}

export function setAmbientVolume(volume: number) {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (!running || !ctx || !masterGain) return;
  const now = ctx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
  masterGain.gain.linearRampToValueAtTime(Math.max(0.0001, currentVolume), now + 0.4);
}

export function stopAmbient() {
  if (!running) return;
  running = false;
  if (bellTimer) {
    clearTimeout(bellTimer);
    bellTimer = null;
  }
  const context = ctx;
  const gain = masterGain;
  const oscs = oscillators;
  const localLfo = lfo;
  oscillators = [];
  lfo = null;
  masterGain = null;
  swellGain = null;

  if (!context || !gain) return;
  try {
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 2);
    // Stop sources after the fade completes.
    setTimeout(() => {
      try {
        oscs.forEach((o) => o.stop());
        localLfo?.stop();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
    }, 2100);
  } catch {
    /* non-critical */
  }
}
