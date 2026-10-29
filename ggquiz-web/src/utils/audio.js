let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playTone({ frequency, duration, type = "sine", volume = 0.08, when = 0 }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const startAt = ctx.currentTime + when;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export function playCorrectSound() {
  try {
    playTone({ frequency: 880, duration: 0.09, type: "sine", volume: 0.07 });
    playTone({ frequency: 1175, duration: 0.12, type: "triangle", volume: 0.06, when: 0.07 });
  } catch {
    // Ignore audio errors before user gesture / unsupported browsers
  }
}

export function playWrongSound() {
  try {
    playTone({ frequency: 180, duration: 0.18, type: "sawtooth", volume: 0.05 });
    playTone({ frequency: 120, duration: 0.14, type: "square", volume: 0.035, when: 0.04 });
  } catch {
    // Ignore audio errors before user gesture / unsupported browsers
  }
}

export function playVictorySound() {
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      playTone({
        frequency,
        duration: 0.16,
        type: index === notes.length - 1 ? "triangle" : "sine",
        volume: 0.06,
        when: index * 0.12,
      });
    });
  } catch {
    // Ignore audio errors before user gesture / unsupported browsers
  }
}
