export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

export function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Format with fractional seconds for sub-second ruler ticks (e.g. "0:01.5") */
export function formatTimePrecise(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const whole = Math.floor(secs);
  const frac = Math.round((secs - whole) * 10);
  return `${mins}:${String(whole).padStart(2, '0')}.${frac}`;
}
