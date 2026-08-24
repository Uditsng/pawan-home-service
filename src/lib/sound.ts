/**
 * PHS Custom Audio Alert & Repeating Ringer System
 * Plays public/service_alert.wav using rock-solid HTML5 Audio with Web Audio synth fallback.
 */

let activeAudio: HTMLAudioElement | null = null;
let synthTimer: ReturnType<typeof setInterval> | null = null;
let synthCtx: AudioContext | null = null;

/**
 * Play custom service_alert.wav (loops N times, default 3 loops)
 */
export function playJobAlertTone(loops: number = 3) {
  if (typeof window === "undefined") return;

  stopJobRinger();

  try {
    const audio = new Audio("/service_alert.wav");
    activeAudio = audio;
    audio.volume = 1.0;
    let currentLoop = 0;

    audio.addEventListener("ended", () => {
      currentLoop++;
      if (currentLoop < loops && activeAudio === audio) {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
      } else if (activeAudio === audio) {
        stopJobRinger();
      }
    });

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("[Sound] Audio element playback blocked, using fallback tone:", err);
        playSynthChime(loops);
      });
    }
  } catch (err) {
    console.warn("[Sound] Could not play /service_alert.wav:", err);
    playSynthChime(loops);
  }
}

/**
 * Start continuous job offer ringer with custom sound file (loops until accepted/declined)
 */
export function startJobRinger(maxDurationMs: number = 25000) {
  if (typeof window === "undefined") return;

  stopJobRinger();

  try {
    const audio = new Audio("/service_alert.wav");
    activeAudio = audio;
    audio.volume = 1.0;
    audio.loop = true;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("[Sound] Audio ringer blocked, using fallback ringer:", err);
        startSynthRinger();
      });
    }

    // Auto-timeout safeguard
    setTimeout(() => {
      if (activeAudio === audio) {
        stopJobRinger();
      }
    }, maxDurationMs);
  } catch (err) {
    console.warn("[Sound] Could not start ringer for /service_alert.wav:", err);
    startSynthRinger();
  }
}

/**
 * Stop active ringer/alarm immediately
 */
export function stopJobRinger() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = "";
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  stopSynthRinger();
}

// ─── Synth Fallback (Used only if audio file fails to load) ──────

function playSingleSynthNote(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const pattern = [
    { freq: 987.77, delay: 0.00, dur: 0.12 },
    { freq: 1318.51, delay: 0.08, dur: 0.12 },
    { freq: 1567.98, delay: 0.16, dur: 0.14 },
    { freq: 1975.53, delay: 0.26, dur: 0.28 },
  ];

  const baseTime = ctx.currentTime;
  pattern.forEach(({ freq, delay, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, baseTime + delay);

    const noteStart = baseTime + delay;
    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.95, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);

    osc.start(noteStart);
    osc.stop(noteStart + dur);
  });
}

function playSynthChime(loops: number = 3) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    synthCtx = ctx;

    let currentLoop = 0;
    playSingleSynthNote(ctx);
    currentLoop++;

    if (loops > 1) {
      const interval = setInterval(() => {
        if (currentLoop >= loops || ctx.state === "closed") {
          clearInterval(interval);
          setTimeout(() => {
            if (synthCtx === ctx) {
              void ctx.close();
              synthCtx = null;
            }
          }, 1000);
          return;
        }
        playSingleSynthNote(ctx);
        currentLoop++;
      }, 1100);
    }
  } catch (err) {
    console.warn("[Sound] Synth fallback error:", err);
  }
}

function startSynthRinger() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    synthCtx = ctx;

    playSingleSynthNote(ctx);

    synthTimer = setInterval(() => {
      if (!synthCtx || synthCtx.state === "closed") {
        stopSynthRinger();
        return;
      }
      playSingleSynthNote(synthCtx);
    }, 1100);
  } catch (err) {
    console.warn("[Sound] Synth ringer error:", err);
  }
}

function stopSynthRinger() {
  if (synthTimer) {
    clearInterval(synthTimer);
    synthTimer = null;
  }
  if (synthCtx) {
    try {
      void synthCtx.close();
    } catch {
      // ignore
    }
    synthCtx = null;
  }
}
