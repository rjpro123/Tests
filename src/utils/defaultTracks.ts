import { Track } from '../types/editor';

/**
 * Default clean sequence tracks for Riley Editor with support for Media, Effects, and Adjustment layers.
 */
export const INITIAL_TRACKS: Track[] = [
  { id: 'v3', name: 'V3', type: 'video', layerType: 'media', height: 56, muted: false, solo: false, locked: false, visible: true, volume: 1, pan: 0 },
  { id: 'v2', name: 'V2', type: 'video', layerType: 'media', height: 56, muted: false, solo: false, locked: false, visible: true, volume: 1, pan: 0 },
  { id: 'v1', name: 'V1', type: 'video', layerType: 'media', height: 58, muted: false, solo: false, locked: false, visible: true, volume: 1, pan: 0 },
  { id: 'a1', name: 'A1', type: 'audio', layerType: 'audio', height: 56, muted: false, solo: false, locked: false, visible: true, volume: 1, pan: 0 },
  { id: 'a2', name: 'A2', type: 'audio', layerType: 'audio', height: 56, muted: false, solo: false, locked: false, visible: true, volume: 0.85, pan: 0 },
  { id: 'a3', name: 'A3', type: 'audio', layerType: 'audio', height: 54, muted: false, solo: false, locked: false, visible: true, volume: 0.8, pan: 0 },
];
