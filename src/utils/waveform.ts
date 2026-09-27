/**
 * Generates deterministic, realistic audio amplitude waveform data
 * calculated from the media's duration and clip trim parameters.
 */
export function generateWaveformFromDuration(
  clipDuration: number,
  mediaDuration: number = 30,
  trimStart: number = 0,
  sampleCount: number = 60,
  seedString: string = 'audio'
): number[] {
  const count = Math.max(12, Math.min(240, Math.floor(sampleCount)));
  const samples: number[] = [];

  // Simple string hash for deterministic variations per clip/track
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed = (seed * 31 + seedString.charCodeAt(i)) & 0xffffffff;
  }
  const basePhase = Math.abs(seed % 1000) / 100;

  const totalDur = Math.max(0.5, mediaDuration || clipDuration);
  const timeStep = clipDuration / count;

  for (let i = 0; i < count; i++) {
    const t = trimStart + i * timeStep;
    const progress = t / totalDur;

    // Layer multiple sinusoidal harmonics to mimic dialogue and musical rhythm
    const f1 = Math.sin(t * 3.4 + basePhase);
    const f2 = Math.cos(t * 7.8 + basePhase * 1.5);
    const f3 = Math.sin(t * 14.2 + basePhase * 2.1);
    
    // Rhythm / cadence pulse every ~0.5 to 1.2 seconds depending on duration
    const cadenceRate = totalDur > 20 ? 1.8 : 2.5;
    const cadence = Math.pow(Math.max(0, Math.sin(t * cadenceRate + basePhase)), 3) * 0.45;

    // Harmonic blend
    const rawVal = 0.28 + Math.abs(f1 * 0.35 + f2 * 0.2 + f3 * 0.12) + cadence;

    // Subtle pseudo-random micro-detail
    const noise = (Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
    const micro = (Math.abs(noise) - 0.5) * 0.15;

    // Natural attack/decay envelope near ends of entire media
    const edgeFade = Math.min(1, Math.min(progress, 1 - progress) * 12);

    const amplitude = Math.max(0.08, Math.min(0.96, (rawVal + micro) * edgeFade));
    samples.push(amplitude);
  }

  return samples;
}
