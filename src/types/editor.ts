export type MediaType = 'video' | 'audio' | 'image' | 'title' | 'generator' | 'adjustment-layer' | 'effects-layer';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number; // in seconds
  width?: number;
  height?: number;
  thumbnail: string;
  generatorType?: 'neon-city' | 'nature-drone' | 'studio-interview' | 'abstract-motion' | 'smpte-bars' | 'countdown' | 'ai-video';
  aiPrompt?: string;
  aiMotion?: string;
  aiStyle?: string;
  audioTrackName?: string;
  waveformData?: number[];
}

export type BlendMode = 'normal' | 'screen' | 'multiply' | 'overlay' | 'lighten' | 'darken';

export interface CropSettings {
  top: number; // percentage 0 to 100
  bottom: number; // percentage 0 to 100
  left: number; // percentage 0 to 100
  right: number; // percentage 0 to 100
}

export interface TransformSettings {
  positionX: number; // offset px from center
  positionY: number;
  scale: number; // 1 = 100%
  rotation: number; // degrees
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  crop?: CropSettings;
}

export interface LumetriSettings {
  exposure: number; // -100 to 100
  contrast: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  temperature: number; // -100 (cool) to 100 (warm)
  tint: number; // -100 (green) to 100 (magenta)
  saturation: number; // 0 to 200 (100 = normal)
  vignette: number; // 0 to 100
  filmGrain: number; // 0 to 100
  lutPreset: 'none' | 'teal-orange' | 'vintage-film' | 'cyberpunk' | 'monochrome' | 'warm-sunset';
}

export interface OpticalFlaresPlugin {
  enabled: boolean;
  preset: 'anamorphic-cyan' | 'warm-solar' | 'scifi-violet' | 'emerald-star' | 'golden-flare';
  intensity: number; // 0 to 3.0
  scale: number; // 0.2 to 3.0
  streakLength: number; // 0 to 3.0
  posX: number; // 0 to 1 (0.5 is center)
  posY: number; // 0 to 1
  color: string;
  shimmer: boolean;
}

export interface TrapcodeParticlesPlugin {
  enabled: boolean;
  type: 'floating-embers' | 'golden-stardust' | 'cyber-sparks' | 'cosmic-snow' | 'bokeh-orbs' | 'matrix-rain';
  count: number; // 10 to 300
  speed: number; // 0.2 to 3.0
  size: number; // 1 to 25 px
  color: string;
  direction: 'up' | 'down' | 'float' | 'radial' | 'swirl';
  glow: number; // 0 to 100
}

export interface DeepGlowPlugin {
  enabled: boolean;
  intensity: number; // 0 to 3.0
  radius: number; // 4 to 80 px
  threshold: number; // 0 to 90 %
  color: string;
  blendMode: 'screen' | 'lighter' | 'overlay';
}

export interface ChromaticAberrationPlugin {
  enabled: boolean;
  offset: number; // 0 to 30 px
  angle: number; // 0 to 360 deg
  mode: 'rgb-split' | 'radial-lens' | 'prism';
}

export interface VhsGlitchPlugin {
  enabled: boolean;
  scanlines: boolean;
  scanlineDensity: number; // 2 to 8
  tapeNoise: number; // 0 to 100%
  trackingJitter: number; // 0 to 40 px
  colorBleed: boolean;
  vcrTimestamp: boolean;
}

export interface WaveDisplacementPlugin {
  enabled: boolean;
  amplitude: number; // 0 to 40 px
  frequency: number; // 1 to 20
  speed: number; // 0.2 to 4.0
  warpType: 'sine-wave' | 'heat-shimmer' | 'turbulent-liquid';
}

export interface LightRaysPlugin {
  enabled: boolean;
  intensity: number; // 0 to 2.5
  rayLength: number; // 0.1 to 1.0
  originX: number; // 0 to 1
  originY: number; // 0 to 1
  color: string;
}

export interface HalftonePlugin {
  enabled: boolean;
  mode: 'halftone-dots' | 'pixel-mosaic' | 'ascii-retro';
  cellSize: number; // 4 to 32 px
  contrast: number; // 0 to 100%
}

export interface AEPlugins {
  opticalFlares: OpticalFlaresPlugin;
  trapcodeParticles: TrapcodeParticlesPlugin;
  deepGlow: DeepGlowPlugin;
  chromaticAberration: ChromaticAberrationPlugin;
  vhsGlitch: VhsGlitchPlugin;
  waveDisplacement: WaveDisplacementPlugin;
  lightRays: LightRaysPlugin;
  halftone: HalftonePlugin;
}

export const DEFAULT_AE_PLUGINS: AEPlugins = {
  opticalFlares: {
    enabled: false,
    preset: 'anamorphic-cyan',
    intensity: 1.2,
    scale: 1.0,
    streakLength: 1.5,
    posX: 0.5,
    posY: 0.35,
    color: '#00d2ff',
    shimmer: true,
  },
  trapcodeParticles: {
    enabled: false,
    type: 'golden-stardust',
    count: 80,
    speed: 1.0,
    size: 6,
    color: '#fbbf24',
    direction: 'float',
    glow: 75,
  },
  deepGlow: {
    enabled: false,
    intensity: 1.4,
    radius: 35,
    threshold: 25,
    color: '#38bdf8',
    blendMode: 'screen',
  },
  chromaticAberration: {
    enabled: false,
    offset: 12,
    angle: 45,
    mode: 'rgb-split',
  },
  vhsGlitch: {
    enabled: false,
    scanlines: true,
    scanlineDensity: 4,
    tapeNoise: 35,
    trackingJitter: 8,
    colorBleed: true,
    vcrTimestamp: true,
  },
  waveDisplacement: {
    enabled: false,
    amplitude: 12,
    frequency: 6,
    speed: 1.2,
    warpType: 'heat-shimmer',
  },
  lightRays: {
    enabled: false,
    intensity: 1.2,
    rayLength: 0.7,
    originX: 0.5,
    originY: 0.2,
    color: '#ffffff',
  },
  halftone: {
    enabled: false,
    mode: 'halftone-dots',
    cellSize: 10,
    contrast: 50,
  },
};

export interface ActiveEffects {
  gaussianBlur: number; // 0 to 50 px
  glitch: boolean;
  mirror: boolean;
  invert: boolean;
  blackAndWhite: boolean;
  edgeGlow: boolean;
}

export interface TitleSettings {
  text: string;
  subtext?: string;
  fontFamily: string;
  fontSize: number; // px
  color: string;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
  hasBackground: boolean;
  alignment: 'center' | 'left' | 'right';
  presetStyle: 'standard' | 'cinematic-title' | 'lower-third' | 'bold-subtitle' | 'cyber-glitch';
}

export interface AudioSettings {
  volume: number; // dB, -60 to +12 (0 is default unity gain)
  pan: number; // -1 (left) to 1 (right)
  mute: boolean;
}

export interface Transition {
  type: 'none' | 'fade' | 'cross-dissolve' | 'dip-to-black' | 'wipe-left' | 'wipe-right' | 'zoom-in';
  duration: number; // seconds
}

export interface Clip {
  id: string;
  trackId: string;
  mediaId: string;
  name: string;
  type: MediaType;
  startTime: number; // placement on timeline (seconds)
  duration: number; // duration on timeline (seconds)
  trimStart: number; // offset inside media (seconds)
  speed: number; // 0.25 to 4.0
  transform: TransformSettings;
  colorGrading: LumetriSettings;
  effects: ActiveEffects;
  plugins?: AEPlugins;
  titleSettings?: TitleSettings;
  audioSettings: AudioSettings;
  transitionIn: Transition;
  transitionOut: Transition;
  colorTag: string; // hex color for timeline clip box
}

export type TrackLayerType = 'media' | 'effects' | 'adjustment' | 'audio';

export interface Track {
  id: string;
  name: string; // e.g. "V3", "V2", "ADJ 1", "FX 1", "A1", "A2"
  type: 'video' | 'audio';
  layerType?: TrackLayerType;
  height: number;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  volume: number; // 0 to 1.5
  pan: number; // -1 to 1
}

export type PremiereTool = 
  | 'select'            // V
  | 'track-select'      // A
  | 'track-select-back' // Shift+A
  | 'ripple'            // B
  | 'rolling'           // N
  | 'rate-stretch'      // R
  | 'razor'             // C
  | 'slip'              // Y
  | 'slide'             // U
  | 'pen'               // P
  | 'hand'              // H
  | 'zoom'              // Z
  | 'type';             // T

export type WorkspaceMode = 'Editing' | 'Color' | 'Effects' | 'Audio' | 'Graphics' | 'Export';

export interface Marker {
  id: string;
  time: number;
  name: string;
  label?: string;
  comment?: string;
  color: string;
  duration?: number;
}

export interface ExportConfig {
  resolution: '1080p' | '4k' | '720p' | 'vertical-1080' | 'square-1080';
  fps: 24 | 30 | 60;
  format: 'webm' | 'mp4';
  quality: 'high' | 'medium' | 'ultra';
}

export interface CineFlowProject {
  version: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  fps: number;
  duration: number;
  currentTime: number;
  inPoint: number | null;
  outPoint: number | null;
  masterVolume: number;
  snapping: boolean;
  tracks: Track[];
  clips: Clip[];
  markers: Marker[];
  mediaItems: MediaItem[];
}

export interface SavedProjectSnapshot {
  id: string;
  name: string;
  updatedAt: string;
  clipCount: number;
  duration: number;
  trackCount: number;
}
