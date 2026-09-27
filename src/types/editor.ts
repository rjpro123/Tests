export type MediaType = 'video' | 'audio' | 'image' | 'title' | 'generator';

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

export interface TransformSettings {
  positionX: number; // offset px from center
  positionY: number;
  scale: number; // 1 = 100%
  rotation: number; // degrees
  opacity: number; // 0 to 1
  blendMode: BlendMode;
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
  titleSettings?: TitleSettings;
  audioSettings: AudioSettings;
  transitionIn: Transition;
  transitionOut: Transition;
  colorTag: string; // hex color for timeline clip box
}

export interface Track {
  id: string;
  name: string; // e.g. "V3", "V2", "V1", "A1", "A2", "A3"
  type: 'video' | 'audio';
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
