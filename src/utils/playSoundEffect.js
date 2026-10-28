export function playSoundEffect() {
  if (localStorage.getItem("careerlink-sound-effects") === "false") return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => context.close();
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.18);
}
