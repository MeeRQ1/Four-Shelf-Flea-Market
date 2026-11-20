let audio;

export function playSound(action) {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return;
  try {
    audio ??= new Audio();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const melody = {
      choose: [440],
      buy: [330, 440],
      sell: [523, 659, 784],
      clear: [370, 277],
      close: [392, 330, 262],
      finish: [392, 523, 659, 784],
    }[action];
    for (const [step, pitch] of melody.entries()) {
      const start = audio.currentTime + step * 0.065;
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      tone.type = "triangle";
      tone.frequency.value = pitch;
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime(0.075, start + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.001, start + 0.10);
      tone.connect(volume).connect(audio.destination);
      tone.start(start);
      tone.stop(start + 0.105);
    }
  } catch {
    // Sound is optional in browsers that restrict audio.
  }
}
