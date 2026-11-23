/**
 * Lightweight zero-dependency Web Audio ambience & tactile ornament foley.
 * Stays muted by default until the user enables sound (auto-resumes cleanly on gesture).
 */
export function createStudioAudio() {
  let ctx = null;
  let master = null;
  let enabled = false;
  let ambienceNodes = null;
  let melodyTimer = null;
  let currentWorld = 'room';

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    return ctx;
  }

  function startAmbience() {
    if (!ctx || !enabled) return;
    stopAmbience();

    // Soft filtered hearth crackle / winter wind bed (procedural noise buffer)
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.025 * white) / 1.025;
      // Occasional tiny warm fireplace crackle pop for indoor rooms
      const pop = (currentWorld !== 'market' && Math.random() < 0.00045) ? (Math.random() - 0.5) * 0.45 : 0;
      data[i] = last * 1.8 + pop;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = currentWorld === 'market' ? 'bandpass' : 'lowpass';
    filter.frequency.value = currentWorld === 'market' ? 620 : 380;
    filter.Q.value = currentWorld === 'market' ? 1.4 : 0.7;

    const ambGain = ctx.createGain();
    ambGain.gain.value = currentWorld === 'market' ? 0.055 : 0.085;

    noise.connect(filter);
    filter.connect(ambGain);
    ambGain.connect(master);
    noise.start();
    ambienceNodes = { noise, filter, ambGain };

    // Delicate winter music-box phrase (gentle pentatonic celesta notes)
    const notes = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 392.0];
    let step = 0;
    const playTick = () => {
      if (!enabled || !ctx || document.hidden) return;
      const freq = notes[step++ % notes.length];
      playTone(freq, 0.032, 1.8, 'sine');
      playTone(freq * 2, 0.008, 0.9, 'triangle');
      melodyTimer = setTimeout(playTick, step % 4 === 0 ? 1500 : 880);
    };
    melodyTimer = setTimeout(playTick, 700);
  }

  function stopAmbience() {
    if (melodyTimer) {
      clearTimeout(melodyTimer);
      melodyTimer = null;
    }
    if (ambienceNodes) {
      try { ambienceNodes.noise.stop(); } catch {}
      ambienceNodes = null;
    }
  }

  function playTone(freq, gainPeak, duration, wave = 'sine', delay = 0) {
    if (!ctx || !master || !enabled) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  return {
    isEnabled() {
      return enabled;
    },
    async toggle() {
      const c = ensureContext();
      if (!c) return false;
      enabled = !enabled;
      if (enabled) {
        if (c.state === 'suspended') await c.resume();
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.linearRampToValueAtTime(0.9, c.currentTime + 0.3);
        startAmbience();
        this.playLights();
      } else {
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.2);
        stopAmbience();
      }
      return enabled;
    },
    setWorld(worldKey) {
      if (currentWorld === worldKey) return;
      currentWorld = worldKey;
      if (enabled) startAmbience();
    },
    playPlace(category) {
      if (!enabled) return;
      const jitter = 0.96 + Math.random() * 0.08;
      if (category === 'topper') {
        playTone(659.25 * jitter, 0.08, 0.7, 'sine', 0);
        playTone(880.0 * jitter, 0.08, 0.8, 'sine', 0.07);
        playTone(1318.5 * jitter, 0.07, 1.1, 'triangle', 0.14);
      } else if (category === 'ball') {
        // Crystalline glass bauble chime
        playTone(1046.5 * jitter, 0.075, 0.55, 'sine', 0);
        playTone(2093.0 * jitter, 0.025, 0.35, 'triangle', 0.01);
      } else if (category === 'floor') {
        // Warm soft gift thump + ribbon chime
        playTone(196 * jitter, 0.09, 0.22, 'triangle', 0);
        playTone(587.33 * jitter, 0.04, 0.35, 'sine', 0.04);
      } else {
        playTone(784 * jitter, 0.065, 0.45, 'sine', 0);
        playTone(1174.6 * jitter, 0.03, 0.35, 'sine', 0.03);
      }
    },
    playLights() {
      if (!enabled) return;
      playTone(587.33, 0.055, 0.5, 'sine', 0);
      playTone(880.0, 0.055, 0.65, 'sine', 0.06);
      playTone(1174.66, 0.05, 0.85, 'triangle', 0.12);
    },
    playSoftClick() {
      if (!enabled) return;
      playTone(440, 0.045, 0.16, 'sine', 0);
    },
  };
}
