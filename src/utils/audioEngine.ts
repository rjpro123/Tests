/**
 * Web Audio Engine for Premiere Pro NLE simulation and real-time audio playback
 * Provides dual-channel stereo peak VU meters, track gains, and dynamic synth audio
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private isInitialized = false;

  // Synthesizer nodes for timeline audio preview
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private beatInterval: number | null = null;
  private isAudioPlaying = false;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;

      this.splitter = this.ctx.createChannelSplitter(2);
      this.analyserL = this.ctx.createAnalyser();
      this.analyserR = this.ctx.createAnalyser();

      this.analyserL.fftSize = 256;
      this.analyserR.fftSize = 256;
      this.analyserL.smoothingTimeConstant = 0.6;
      this.analyserR.smoothingTimeConstant = 0.6;

      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.splitter);
      this.splitter.connect(this.analyserL, 0);
      this.splitter.connect(this.analyserR, 1);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterDestination(): AudioNode | null {
    return this.masterGain;
  }

  public setMasterVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1.5, val)), this.ctx.currentTime);
    }
  }

  public startPlayback(hasAudioClips: boolean, timelineSpeed: number = 1) {
    this.init();
    if (!this.ctx || this.isAudioPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isAudioPlaying = true;

    // If sequence has audio tracks active, play ambient cinematic soundscape & rhythm
    if (hasAudioClips) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.01, now);
        this.ambientGain.gain.linearRampToValueAtTime(0.25, now + 0.1);

        this.ambientOsc1 = this.ctx.createOscillator();
        this.ambientOsc1.type = 'sawtooth';
        this.ambientOsc1.frequency.setValueAtTime(110 * timelineSpeed, now); // A2

        this.ambientOsc2 = this.ctx.createOscillator();
        this.ambientOsc2.type = 'sine';
        this.ambientOsc2.frequency.setValueAtTime(55 * timelineSpeed, now); // Sub bass A1

        // Lowpass filter for warm cinematic feel
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        this.ambientOsc1.connect(filter);
        this.ambientOsc2.connect(filter);
        filter.connect(this.ambientGain);
        this.ambientGain.connect(this.masterGain!);

        this.ambientOsc1.start();
        this.ambientOsc2.start();

        // Rhythmic pulsing cinematic beat
        this.beatInterval = window.setInterval(() => {
          if (!this.ctx || !this.isAudioPlaying) return;
          this.triggerKick();
        }, 1200 / Math.max(0.5, timelineSpeed));
      } catch (err) {
        console.warn('Audio synthesis note error:', err);
      }
    }
  }

  private triggerKick() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public setPlaybackSpeed(timelineSpeed: number) {
    if (!this.ctx || !this.isAudioPlaying) return;
    const absSpeed = Math.max(0.25, Math.min(4, Math.abs(timelineSpeed)));
    const now = this.ctx.currentTime;
    try {
      if (this.ambientOsc1) {
        this.ambientOsc1.frequency.setTargetAtTime(110 * absSpeed, now, 0.05);
      }
      if (this.ambientOsc2) {
        this.ambientOsc2.frequency.setTargetAtTime(55 * absSpeed, now, 0.05);
      }
      if (this.beatInterval) {
        clearInterval(this.beatInterval);
        this.beatInterval = window.setInterval(() => {
          if (!this.ctx || !this.isAudioPlaying) return;
          this.triggerKick();
        }, 1200 / absSpeed);
      }
    } catch (err) {
      console.warn('Error adjusting audio playback speed:', err);
    }
  }

  public stopPlayback() {
    this.isAudioPlaying = false;

    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }

    if (this.ambientGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        setTimeout(() => {
          try {
            this.ambientOsc1?.stop();
            this.ambientOsc2?.stop();
            this.ambientOsc1?.disconnect();
            this.ambientOsc2?.disconnect();
            this.ambientGain?.disconnect();
          } catch {}
          this.ambientOsc1 = null;
          this.ambientOsc2 = null;
          this.ambientGain = null;
        }, 60);
      } catch {
        this.ambientOsc1 = null;
        this.ambientOsc2 = null;
        this.ambientGain = null;
      }
    }
  }

  public getLevels(): { left: number; right: number; peakL: number; peakR: number } {
    if (!this.analyserL || !this.analyserR || !this.isAudioPlaying) {
      return { left: -60, right: -60, peakL: -60, peakR: -60 };
    }

    const bufferL = new Uint8Array(this.analyserL.frequencyBinCount);
    const bufferR = new Uint8Array(this.analyserR.frequencyBinCount);

    this.analyserL.getByteTimeDomainData(bufferL);
    this.analyserR.getByteTimeDomainData(bufferR);

    let sumL = 0;
    let sumR = 0;

    for (let i = 0; i < bufferL.length; i++) {
      const valL = (bufferL[i] - 128) / 128;
      const valR = (bufferR[i] - 128) / 128;
      sumL += valL * valL;
      sumR += valR * valR;
    }

    const rmsL = Math.sqrt(sumL / bufferL.length);
    const rmsR = Math.sqrt(sumR / bufferR.length);

    // Convert RMS to dB: 20 * log10(rms)
    const dbL = rmsL > 0.0001 ? Math.max(-60, Math.min(3, 20 * Math.log10(rmsL * 2.5))) : -60;
    const dbR = rmsR > 0.0001 ? Math.max(-60, Math.min(3, 20 * Math.log10(rmsR * 2.3))) : -60;

    return {
      left: Math.round(dbL * 10) / 10,
      right: Math.round(dbR * 10) / 10,
      peakL: Math.round(dbL * 10) / 10,
      peakR: Math.round(dbR * 10) / 10,
    };
  }
}

export const audioEngine = new AudioEngine();
