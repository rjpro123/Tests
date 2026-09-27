/**
 * SMPTE Timecode formatting and arithmetic utilities
 */

export function formatTimecode(seconds: number, fps: number = 30): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  
  const totalFrames = Math.floor(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(seconds);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

export function parseTimecode(tc: string, fps: number = 30): number {
  const parts = tc.split(':').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  const [h, m, s, frames] = parts;
  return h * 3600 + m * 60 + s + frames / fps;
}

export function formatDurationSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}s`;
}

export function snapTime(time: number, snapPoints: number[], threshold: number = 0.15): number {
  for (const point of snapPoints) {
    if (Math.abs(time - point) <= threshold) {
      return point;
    }
  }
  return time;
}
