import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Clip, MediaItem, PremiereTool, Track, Marker, CineFlowProject, DEFAULT_AE_PLUGINS } from './types/editor';
import { INITIAL_TRACKS } from './utils/defaultTracks';
import { audioEngine } from './utils/audioEngine';
import { preloadImage } from './utils/compositor';
import { initDriveAuth } from './utils/googleDrive';
import { 
  saveProjectToLocalStorage, 
  loadActiveProjectFromLocalStorage, 
  parseProjectFile 
} from './utils/projectFileManager';
import { Check } from 'lucide-react';

// Components
import { HeaderBar } from './components/HeaderBar';
import { ProgramMonitor } from './components/ProgramMonitor';
import { ProjectBin } from './components/ProjectBin';
import { TimelineToolbar } from './components/TimelineToolbar';
import { Timeline } from './components/Timeline';
import { EffectControls } from './components/EffectControls';
import { AudioMeter } from './components/AudioMeter';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { MarkerModal } from './components/MarkerModal';
import { ProjectFileModal } from './components/ProjectFileModal';
import { AIAssistant } from './components/AIAssistant';
import { AudioMixer } from './components/AudioMixer';

export default function App() {
  // Project Identity & File Persistence State
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>('Riley_Seq_01');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [isProjectFileModalOpen, setIsProjectFileModalOpen] = useState<boolean>(false);
  const [projectFileModalTab, setProjectFileModalTab] = useState<'save' | 'open' | 'new'>('save');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Sequence State (clean empty timeline by default)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [shuttleSpeed, setShuttleSpeed] = useState<number>(1);
  const [activeTool, setActiveTool] = useState<PremiereTool>('select');
  const [zoom, setZoom] = useState<number>(65);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [snapping, setSnapping] = useState<boolean>(true);
  const [loop, setLoop] = useState<boolean>(false);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);

  // Markers State
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeMarkerToEdit, setActiveMarkerToEdit] = useState<Marker | null>(null);
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState<boolean>(false);

  // Simplified Panel Visibility States
  const [showMediaBin, setShowMediaBin] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [showAudioMixer, setShowAudioMixer] = useState<boolean>(true);
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(true);

  // Resizable Workspace Layout Splits
  const [verticalSplitPercent, setVerticalSplitPercent] = useState<number>(() => {
    const saved = localStorage.getItem('riley_vertical_split');
    const parsed = parseFloat(saved || '');
    return !isNaN(parsed) ? Math.min(80, Math.max(20, parsed)) : 50;
  });
  const [mediaBinWidth, setMediaBinWidth] = useState<number>(() => {
    const saved = localStorage.getItem('riley_mediabin_width');
    const parsed = parseFloat(saved || '');
    return !isNaN(parsed) ? Math.min(520, Math.max(160, parsed)) : 260;
  });
  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    const saved = localStorage.getItem('riley_inspector_width');
    const parsed = parseFloat(saved || '');
    return !isNaN(parsed) ? Math.min(600, Math.max(240, parsed)) : 320;
  });
  const [audioMixerWidth, setAudioMixerWidth] = useState<number>(() => {
    const saved = localStorage.getItem('riley_audiomixer_width');
    const parsed = parseFloat(saved || '');
    return !isNaN(parsed) ? Math.min(600, Math.max(180, parsed)) : 240;
  });

  const [isDraggingVerticalSplit, setIsDraggingVerticalSplit] = useState<boolean>(false);
  const [isDraggingMediaBin, setIsDraggingMediaBin] = useState<boolean>(false);
  const [isDraggingInspector, setIsDraggingInspector] = useState<boolean>(false);
  const [isDraggingAudioMixer, setIsDraggingAudioMixer] = useState<boolean>(false);

  const workstationRef = useRef<HTMLDivElement | null>(null);
  const upperDeckRef = useRef<HTMLDivElement | null>(null);

  // Global Pointer Listeners for Smooth Resizing
  useEffect(() => {
    if (!isDraggingVerticalSplit && !isDraggingMediaBin && !isDraggingInspector && !isDraggingAudioMixer) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVerticalSplit && workstationRef.current) {
        const rect = workstationRef.current.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const percent = Math.min(80, Math.max(20, (relativeY / rect.height) * 100));
        setVerticalSplitPercent(percent);
      }
      if (isDraggingMediaBin && upperDeckRef.current) {
        const rect = upperDeckRef.current.getBoundingClientRect();
        const newWidth = Math.min(520, Math.max(160, e.clientX - rect.left));
        setMediaBinWidth(newWidth);
      }
      if (isDraggingInspector && upperDeckRef.current) {
        const rect = upperDeckRef.current.getBoundingClientRect();
        const newWidth = Math.min(600, Math.max(240, rect.right - e.clientX));
        setInspectorWidth(newWidth);
      }
      if (isDraggingAudioMixer && upperDeckRef.current) {
        const rect = upperDeckRef.current.getBoundingClientRect();
        const offset = showMediaBin ? mediaBinWidth : 0;
        const newWidth = Math.min(600, Math.max(180, e.clientX - rect.left - offset));
        setAudioMixerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingVerticalSplit) {
        setIsDraggingVerticalSplit(false);
        localStorage.setItem('riley_vertical_split', String(verticalSplitPercent));
      }
      if (isDraggingMediaBin) {
        setIsDraggingMediaBin(false);
        localStorage.setItem('riley_mediabin_width', String(mediaBinWidth));
      }
      if (isDraggingInspector) {
        setIsDraggingInspector(false);
        localStorage.setItem('riley_inspector_width', String(inspectorWidth));
      }
      if (isDraggingAudioMixer) {
        setIsDraggingAudioMixer(false);
        localStorage.setItem('riley_audiomixer_width', String(audioMixerWidth));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDraggingVerticalSplit, 
    isDraggingMediaBin, 
    isDraggingInspector, 
    isDraggingAudioMixer,
    verticalSplitPercent, 
    mediaBinWidth, 
    inspectorWidth,
    audioMixerWidth,
    showMediaBin
  ]);

  // Google Drive Integration State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isDriveOpen, setIsDriveOpen] = useState<boolean>(false);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<{ clips: Clip[]; tracks: Track[] }[]>([
    { clips: [], tracks: INITIAL_TRACKS },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Initialize Google Drive Auth listener
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setCurrentUser(user);
        setDriveToken(token);
      },
      () => {
        setCurrentUser(null);
        setDriveToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Compute dynamic total duration based on furthest clip
  const duration = useMemo(() => {
    let maxTime = 18.0;
    for (const c of clips) {
      maxTime = Math.max(maxTime, c.startTime + c.duration);
    }
    return Math.max(20, Math.ceil(maxTime + 2));
  }, [clips]);

  // Media items fast map
  const mediaMap = useMemo(() => {
    const map = new Map<string, MediaItem>();
    mediaItems.forEach((m) => map.set(m.id, m));
    return map;
  }, [mediaItems]);

  const selectedClip = useMemo(() => {
    return clips.find((c) => c.id === selectedClipId) || null;
  }, [clips, selectedClipId]);

  // When user selects a clip, open Inspector smoothly and manage single/multi-selection
  const handleSelectClip = useCallback((clipId: string | null, isMulti = false) => {
    if (!clipId) {
      setSelectedClipId(null);
      setSelectedClipIds([]);
      return;
    }

    if (isMulti) {
      setSelectedClipIds((prev) => {
        if (prev.includes(clipId)) {
          const next = prev.filter((id) => id !== clipId);
          setSelectedClipId(next.length > 0 ? next[next.length - 1] : null);
          return next;
        } else {
          const next = [...prev, clipId];
          setSelectedClipId(clipId);
          return next;
        }
      });
    } else {
      setSelectedClipId(clipId);
      setSelectedClipIds([clipId]);
      setShowInspector(true);
    }
  }, []);

  const handleSelectMultipleClips = useCallback((clipIds: string[]) => {
    setSelectedClipIds(clipIds);
    if (clipIds.length > 0) {
      setSelectedClipId(clipIds[clipIds.length - 1]);
    } else {
      setSelectedClipId(null);
    }
  }, []);

  // Push state to undo/redo history
  const pushHistory = useCallback(
    (newClips: Clip[], newTracks: Track[] = tracks) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { clips: newClips, tracks: newTracks }];
      });
      setHistoryIndex((prev) => prev + 1);
      setIsUnsaved(true);
    },
    [historyIndex, tracks]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setClips(target.clips);
      setTracks(target.tracks);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setClips(target.clips);
      setTracks(target.tracks);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Synchronization Refs for 60fps Playback Loop & J-K-L Shuttle
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const shuttleSpeedRef = useRef(shuttleSpeed);
  shuttleSpeedRef.current = shuttleSpeed;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const isKPressedRef = useRef(false);

  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  const calculateAudibleGain = useCallback((targetTime: number) => {
    const activeClips = clipsRef.current.filter(
      (c) =>
        (c.type === 'audio' || c.mediaId.includes('audio') || c.type === 'video') &&
        targetTime >= c.startTime &&
        targetTime < c.startTime + c.duration
    );
    if (activeClips.length === 0) return { hasAudio: false, gain: 0 };

    const currentTracks = tracksRef.current;
    const hasSolo = currentTracks.some((t) => t.solo);
    let totalGain = 0;
    let count = 0;

    activeClips.forEach((c) => {
      const trk = currentTracks.find((t) => t.id === c.trackId);
      if (!trk) return;
      if (hasSolo && !trk.solo) return;
      if (trk.muted) return;
      const vol = typeof trk.volume === 'number' ? trk.volume : 1;
      if (vol > 0.001) {
        totalGain += vol;
        count++;
      }
    });

    const avg = count > 0 ? totalGain / count : 0;
    return {
      hasAudio: count > 0 && avg > 0.005,
      gain: avg,
    };
  }, []);

  // Playback Loop (smooth 60fps, decoupled from currentTime re-renders)
  useEffect(() => {
    if (!isPlaying) {
      audioEngine.stopPlayback();
      return;
    }

    const { hasAudio, gain } = calculateAudibleGain(currentTimeRef.current);
    audioEngine.startPlayback(hasAudio, Math.abs(shuttleSpeedRef.current), gain);

    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const speed = shuttleSpeedRef.current;

      setCurrentTime((prev) => {
        const next = prev + dt * speed;
        const endLimit = outPoint !== null ? outPoint : duration;
        const startLimit = inPoint !== null ? inPoint : 0;

        if (speed > 0 && next >= endLimit) {
          if (loop) {
            return startLimit;
          } else {
            setIsPlaying(false);
            setShuttleSpeed(1);
            return endLimit;
          }
        } else if (speed < 0 && next <= startLimit) {
          if (loop) {
            return endLimit;
          } else {
            setIsPlaying(false);
            setShuttleSpeed(1);
            return startLimit;
          }
        }
        return Math.max(0, Math.min(duration, next));
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      audioEngine.stopPlayback();
    };
  }, [isPlaying, duration, loop, inPoint, outPoint, calculateAudibleGain]);

  // Adjust audio gain dynamically when track volume or mute/solo changes
  useEffect(() => {
    if (isPlaying) {
      const { gain } = calculateAudibleGain(currentTimeRef.current);
      audioEngine.setTrackGainMultiplier(gain);
    }
  }, [tracks, isPlaying, calculateAudibleGain]);

  // Adjust audio pitch & rhythm dynamically when shuttle speed changes
  useEffect(() => {
    if (isPlaying) {
      audioEngine.setPlaybackSpeed(Math.abs(shuttleSpeed));
    }
  }, [shuttleSpeed, isPlaying]);

  // Master Volume update
  useEffect(() => {
    audioEngine.setMasterVolume(masterVolume);
  }, [masterVolume]);

  // J-K-L Variable Speed Shuttle Handlers (1x -> 2x -> 4x and -1x -> -2x -> -4x)
  const handleShuttleForward = useCallback(() => {
    setIsPlaying(true);
    setShuttleSpeed((prev) => {
      // If paused or stopped, start forward at 1x
      if (!isPlayingRef.current) {
        return 1;
      }
      // If playing reverse, step down reverse or flip forward
      if (prev <= -4) return -2;
      if (prev <= -2) return -1;
      if (prev < 0) return 1;
      // If playing forward, increment speed: 1x -> 2x -> 4x
      if (prev < 1) return 1;
      if (prev < 2) return 2;
      return 4; // cap at 4x
    });
  }, []);

  const handleShuttleReverse = useCallback(() => {
    setIsPlaying(true);
    setShuttleSpeed((prev) => {
      // If paused or stopped, start reverse at -1x
      if (!isPlayingRef.current) {
        return -1;
      }
      // If playing forward, step down forward or flip reverse
      if (prev >= 4) return 2;
      if (prev >= 2) return 1;
      if (prev > 0) return -1;
      // If playing reverse, increment reverse speed: -1x -> -2x -> -4x
      if (prev > -1) return -1;
      if (prev > -2) return -2;
      return -4; // cap at -4x
    });
  }, []);

  const handleShuttleStop = useCallback(() => {
    setIsPlaying(false);
    setShuttleSpeed(1);
  }, []);

  // Transport Handlers
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) setShuttleSpeed(1);
      return !prev;
    });
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(duration, time)));
  }, [duration]);

  const handleStepFrame = useCallback((frames: number) => {
    const frameTime = 1 / 30;
    setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + frames * frameTime)));
  }, [duration]);

  // Jump to Next / Previous Edit Point (Up/Down Arrow)
  const allEditPoints = useMemo(() => {
    const pts = new Set<number>([0, duration]);
    clips.forEach((c) => {
      pts.add(Math.round(c.startTime * 1000) / 1000);
      pts.add(Math.round((c.startTime + c.duration) * 1000) / 1000);
    });
    return Array.from(pts).sort((a, b) => a - b);
  }, [clips, duration]);

  const handleJumpEditPoint = useCallback((direction: -1 | 1) => {
    const threshold = 0.05;
    if (direction < 0) {
      const prevPoints = allEditPoints.filter((p) => p < currentTime - threshold);
      if (prevPoints.length > 0) {
        setCurrentTime(prevPoints[prevPoints.length - 1]);
      } else {
        setCurrentTime(0);
      }
    } else {
      const nextPoints = allEditPoints.filter((p) => p > currentTime + threshold);
      if (nextPoints.length > 0) {
        setCurrentTime(nextPoints[0]);
      } else {
        setCurrentTime(duration);
      }
    }
  }, [allEditPoints, currentTime, duration]);

  // Clip Modifications
  const handleUpdateClip = useCallback((updatedClip: Clip) => {
    setClips((prev) => prev.map((c) => (c.id === updatedClip.id ? updatedClip : c)));
  }, []);

  const handleUpdateMultipleClips = useCallback((updatedClips: Clip[]) => {
    setClips((prev) => {
      const map = new Map(updatedClips.map((c) => [c.id, c]));
      return prev.map((c) => map.get(c.id) || c);
    });
  }, []);

  const handleCommitClipChanges = useCallback((committedClips: Clip[]) => {
    setClips((prev) => {
      const map = new Map(committedClips.map((c) => [c.id, c]));
      const next = prev.map((c) => map.get(c.id) || c);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const handleDeleteClip = useCallback((clipId: string) => {
    setClips((prev) => {
      const next = prev.filter((c) => c.id !== clipId);
      pushHistory(next);
      return next;
    });
    setSelectedClipIds((prev) => prev.filter((id) => id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [selectedClipId, pushHistory]);

  const handleDeleteMultipleClips = useCallback((clipIds: string[]) => {
    const idSet = new Set(clipIds);
    setClips((prev) => {
      const next = prev.filter((c) => !idSet.has(c.id));
      pushHistory(next);
      return next;
    });
    setSelectedClipIds([]);
    setSelectedClipId(null);
  }, [pushHistory]);

  // Clear All Clips from Timeline
  const handleClearTimeline = useCallback(() => {
    setClips([]);
    setSelectedClipId(null);
    setSelectedClipIds([]);
    pushHistory([]);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [pushHistory]);

  // Ripple Delete (Shift+Delete / ')
  const handleRippleDelete = useCallback((clipId: string) => {
    setClips((prev) => {
      const targetClip = prev.find((c) => c.id === clipId);
      if (!targetClip) return prev;

      const gapDuration = targetClip.duration;
      const targetTrackId = targetClip.trackId;
      const targetStartTime = targetClip.startTime;

      const next = prev
        .filter((c) => c.id !== clipId)
        .map((c) => {
          if (c.trackId === targetTrackId && c.startTime > targetStartTime) {
            return {
              ...c,
              startTime: Math.max(0, c.startTime - gapDuration),
            };
          }
          return c;
        });

      pushHistory(next);
      return next;
    });
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [selectedClipId, pushHistory]);

  // Split Clip (Razor Tool / Ctrl+K)
  const handleSplitClip = useCallback((clipId: string, splitTime: number) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === clipId);
      if (!clip) return prev;

      if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
        return prev;
      }

      const firstDur = splitTime - clip.startTime;
      const secondDur = clip.duration - firstDur;

      const firstClip: Clip = {
        ...clip,
        duration: firstDur,
      };

      const secondClip: Clip = {
        ...clip,
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `${clip.name} (Part 2)`,
        startTime: splitTime,
        duration: secondDur,
        trimStart: clip.trimStart + firstDur * clip.speed,
      };

      const next = prev.map((c) => (c.id === clipId ? firstClip : c)).concat(secondClip);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  // Split at current playhead (Ctrl+K)
  const handleSplitAtPlayhead = useCallback((allTracks: boolean = false) => {
    if (allTracks) {
      clips.forEach((c) => {
        if (currentTime > c.startTime && currentTime < c.startTime + c.duration) {
          handleSplitClip(c.id, currentTime);
        }
      });
    } else {
      const active = clips.find(
        (c) =>
          (selectedClipId ? c.id === selectedClipId : true) &&
          currentTime > c.startTime &&
          currentTime < c.startTime + c.duration
      );
      if (active) {
        handleSplitClip(active.id, currentTime);
      }
    }
  }, [clips, selectedClipId, currentTime, handleSplitClip]);

  // Apply default transition (Ctrl+D)
  const handleApplyDefaultTransition = useCallback(() => {
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    handleUpdateClip({
      ...clip,
      transitionIn: { type: 'cross-dissolve', duration: 0.8 },
      transitionOut: { type: 'cross-dissolve', duration: 0.8 },
    });
  }, [selectedClipId, clips, handleUpdateClip]);

  // Select clip under playhead (D)
  const handleSelectClipAtPlayhead = useCallback(() => {
    const candidates = clips.filter(
      (c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration
    );
    if (candidates.length > 0) {
      handleSelectClip(candidates[candidates.length - 1].id);
    }
  }, [clips, currentTime, handleSelectClip]);

  // Add Track (Supports Media, Adjustment, Effects, and Audio layer roles)
  const handleAddTrack = useCallback((type: 'video' | 'audio', layerType?: import('./types/editor').TrackLayerType) => {
    setTracks((prev) => {
      const resolvedLayerType = layerType || (type === 'audio' ? 'audio' : 'media');
      const existing = prev.filter((t) => t.type === type);
      const count = existing.length + 1;
      const id = `${type === 'video' ? (resolvedLayerType === 'adjustment' ? 'adj' : resolvedLayerType === 'effects' ? 'fx' : 'v') : 'a'}${count}_${Date.now().toString().slice(-4)}`;
      const name = resolvedLayerType === 'adjustment' 
        ? `ADJ ${count}` 
        : resolvedLayerType === 'effects' 
        ? `FX ${count}` 
        : `${type === 'video' ? 'V' : 'A'}${count}`;

      const newTrack: Track = {
        id,
        name,
        type,
        layerType: resolvedLayerType,
        height: 52,
        muted: false,
        solo: false,
        locked: false,
        visible: true,
        volume: 1,
        pan: 0,
      };

      const next = type === 'video' ? [newTrack, ...prev] : [...prev, newTrack];
      pushHistory(clips, next);
      return next;
    });
  }, [clips, pushHistory]);

  // Change Track Layer Type (Toggle between Media, Adjustment, Effects)
  const handleChangeTrackLayerType = useCallback((trackId: string, layerType: import('./types/editor').TrackLayerType) => {
    setTracks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== trackId) return t;
        const count = t.name.replace(/\D/g, '') || '1';
        const newName = layerType === 'adjustment' 
          ? `ADJ ${count}` 
          : layerType === 'effects' 
          ? `FX ${count}` 
          : `V${count}`;
        return {
          ...t,
          layerType,
          name: newName,
        };
      });
      pushHistory(clips, next);
      return next;
    });
  }, [clips, pushHistory]);

  // Non-Destructive Adjustment Layer Creator
  const handleAddAdjustmentLayer = useCallback((targetTrackId?: string, time?: number) => {
    const startTime = time !== undefined ? time : currentTime;
    const dur = 6.0;

    // Target track: preferred track or top video/adjustment track
    let trackId = targetTrackId;
    if (!trackId) {
      const adjTrack = tracks.find((t) => t.type === 'video' && t.layerType === 'adjustment');
      if (adjTrack) {
        trackId = adjTrack.id;
      } else {
        const topVideo = tracks.find((t) => t.type === 'video');
        trackId = topVideo ? topVideo.id : 'v3';
      }
    }

    const count = clips.filter((c) => c.type === 'adjustment-layer').length + 1;
    const newClip: Clip = {
      id: `clip-adj-${Date.now()}`,
      trackId,
      mediaId: `media-adj-${Date.now()}`,
      name: `Adjustment Layer ${count}`,
      type: 'adjustment-layer',
      startTime: Math.max(0, startTime),
      duration: dur,
      trimStart: 0,
      speed: 1.0,
      colorTag: '#581c87',
      transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      colorGrading: { exposure: 0, contrast: 15, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 110, vignette: 15, filmGrain: 0, lutPreset: 'none' },
      effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
      plugins: DEFAULT_AE_PLUGINS,
      audioSettings: { volume: 0, pan: 0, mute: false },
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 },
    };

    setClips((prev) => {
      const next = [...prev, newClip];
      pushHistory(next);
      return next;
    });

    handleSelectClip(newClip.id);
    setShowInspector(true);
  }, [currentTime, tracks, clips, pushHistory, handleSelectClip]);

  // Procedural Effects Layer Creator
  const handleAddEffectsLayer = useCallback((targetTrackId?: string, time?: number) => {
    const startTime = time !== undefined ? time : currentTime;
    const dur = 6.0;

    let trackId = targetTrackId;
    if (!trackId) {
      const fxTrack = tracks.find((t) => t.type === 'video' && t.layerType === 'effects');
      if (fxTrack) {
        trackId = fxTrack.id;
      } else {
        const topVideo = tracks.find((t) => t.type === 'video');
        trackId = topVideo ? topVideo.id : 'v3';
      }
    }

    const count = clips.filter((c) => c.type === 'effects-layer').length + 1;
    const newClip: Clip = {
      id: `clip-fx-${Date.now()}`,
      trackId,
      mediaId: `media-fx-${Date.now()}`,
      name: `FX Layer ${count}`,
      type: 'effects-layer',
      startTime: Math.max(0, startTime),
      duration: dur,
      trimStart: 0,
      speed: 1.0,
      colorTag: '#831843',
      transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'screen' },
      colorGrading: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' },
      effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
      plugins: {
        ...DEFAULT_AE_PLUGINS,
        trapcodeParticles: { ...DEFAULT_AE_PLUGINS.trapcodeParticles, enabled: true },
      },
      audioSettings: { volume: 0, pan: 0, mute: false },
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 },
    };

    setClips((prev) => {
      const next = [...prev, newClip];
      pushHistory(next);
      return next;
    });

    handleSelectClip(newClip.id);
    setShowInspector(true);
  }, [currentTime, tracks, clips, pushHistory, handleSelectClip]);

  // Track Toggles & Volume Gain Handlers
  const handleToggleTrackVisible = useCallback((trackId: string) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t)));
    setIsUnsaved(true);
  }, []);

  const handleToggleTrackLock = useCallback((trackId: string) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)));
    setIsUnsaved(true);
  }, []);

  const handleToggleTrackMute = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const newMuted = !t.muted;
        return {
          ...t,
          muted: newMuted,
          volume: newMuted ? t.volume : (t.volume === 0 ? 1 : t.volume),
        };
      })
    );
    setIsUnsaved(true);
  }, []);

  const handleToggleTrackSolo = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t))
    );
    setIsUnsaved(true);
  }, []);

  const handleUpdateTrackVolume = useCallback((trackId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(1.5, volume));
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const shouldUnmute = t.muted && clamped > 0;
        return {
          ...t,
          volume: clamped,
          muted: shouldUnmute ? false : (clamped === 0 ? true : t.muted),
        };
      })
    );
    setIsUnsaved(true);
  }, []);

  const handleUpdateTrackPan = useCallback((trackId: string, pan: number) => {
    const clamped = Math.max(-1, Math.min(1, pan));
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, pan: clamped } : t))
    );
    setIsUnsaved(true);
  }, []);

  const handleUpdateTrackEQ = useCallback((trackId: string, eq: { low: number; mid: number; high: number }) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, eqSettings: eq } : t))
    );
    setIsUnsaved(true);
  }, []);

  // Fit Timeline to view (\)
  const handleFitTimeline = useCallback(() => {
    const targetZoom = Math.max(25, Math.min(180, Math.floor(900 / duration)));
    setZoom(targetZoom);
  }, [duration]);

  // Insert from media into timeline
  const handleInsertMedia = useCallback((media: MediaItem) => {
    const dur = media.duration || 5;
    const targetTrack = media.type === 'audio' ? 'a1' : 'v1';

    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      trackId: targetTrack,
      mediaId: media.id,
      name: media.name,
      type: media.type,
      startTime: currentTime,
      duration: dur,
      trimStart: 0,
      speed: 1.0,
      colorTag: media.type === 'audio' ? '#059669' : '#0284c7',
      transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      colorGrading: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' },
      effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
      audioSettings: { volume: 0, pan: 0, mute: false },
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 },
    };

    setClips((prev) => {
      const next = [...prev, newClip];
      pushHistory(next);
      return next;
    });

    setCurrentTime((t) => t + dur);
    handleSelectClip(newClip.id);
  }, [currentTime, pushHistory, handleSelectClip]);

  // Add Title graphic (T)
  const handleAddTitle = useCallback(() => {
    const newTitleClip: Clip = {
      id: `clip-title-${Date.now()}`,
      trackId: 'v3',
      mediaId: `title-${Date.now()}`,
      name: 'TITLE: Lower Third',
      type: 'title',
      startTime: currentTime,
      duration: 4.0,
      trimStart: 0,
      speed: 1.0,
      colorTag: '#d97706',
      transform: { positionX: 0, positionY: 220, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      colorGrading: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' },
      effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
      titleSettings: {
        text: 'CINEMATIC HEADLINE',
        subtext: 'Secondary subtitle or speaker credit',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 26,
        color: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        hasBackground: true,
        alignment: 'left',
        presetStyle: 'lower-third',
      },
      audioSettings: { volume: 0, pan: 0, mute: false },
      transitionIn: { type: 'wipe-left', duration: 0.5 },
      transitionOut: { type: 'fade', duration: 0.5 },
    };

    setClips((prev) => {
      const next = [...prev, newTitleClip];
      pushHistory(next);
      return next;
    });
    handleSelectClip(newTitleClip.id);
  }, [currentTime, pushHistory, handleSelectClip]);

  // Add Generator (SMPTE Bars or Countdown)
  const handleAddGenerator = useCallback((type: 'smpte-bars' | 'countdown') => {
    const isSmpte = type === 'smpte-bars';
    const mediaItem: MediaItem = {
      id: `gen-${type}-${Date.now()}`,
      name: isSmpte ? 'SMPTE_Color_Bars_Test.mov' : 'Universal_Countdown_5s.mov',
      type: 'generator',
      url: '',
      duration: isSmpte ? 8.0 : 5.0,
      width: 1920,
      height: 1080,
      thumbnail: '',
      generatorType: type,
    };

    setMediaItems((prev) => [mediaItem, ...prev]);

    const newClip: Clip = {
      id: `clip-gen-${Date.now()}`,
      trackId: 'v1',
      mediaId: mediaItem.id,
      name: mediaItem.name,
      type: 'generator',
      startTime: currentTime,
      duration: mediaItem.duration,
      trimStart: 0,
      speed: 1.0,
      colorTag: isSmpte ? '#6366f1' : '#f59e0b',
      transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      colorGrading: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' },
      effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
      audioSettings: { volume: 0, pan: 0, mute: false },
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 },
    };

    setClips((prev) => {
      const next = [...prev, newClip];
      pushHistory(next);
      return next;
    });
    handleSelectClip(newClip.id);
  }, [currentTime, pushHistory, handleSelectClip]);

  // Import User Local Files
  const handleImportFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImg = file.type.startsWith('image');

      const newItem: MediaItem = {
        id: `user-media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        url,
        duration: isImg ? 6.0 : 15.0,
        thumbnail: isImg ? url : '',
      };

      if (isVideo || isAudio) {
        const probeEl = document.createElement(isVideo ? 'video' : 'audio');
        probeEl.src = url;
        probeEl.onloadedmetadata = () => {
          newItem.duration = probeEl.duration || 10;
          if (isVideo) {
            newItem.width = (probeEl as HTMLVideoElement).videoWidth || 1920;
            newItem.height = (probeEl as HTMLVideoElement).videoHeight || 1080;
          }
          setMediaItems((prev) => [newItem, ...prev]);
        };
      } else {
        setMediaItems((prev) => [newItem, ...prev]);
      }
    });
  }, []);

  // Import Media from Google Drive
  const handleImportDriveMedia = useCallback((media: MediaItem, addToTimeline: boolean = false) => {
    setMediaItems((prev) => [media, ...prev]);
    setSelectedMediaId(media.id);

    if (addToTimeline) {
      handleInsertMedia(media);
    }
  }, [handleInsertMedia]);

  // Drop Media directly from Project Bin onto specific Timeline Track & Time
  const handleDropMediaOnTimeline = useCallback((media: MediaItem, trackId: string, startTime: number) => {
    setMediaItems((prev) => {
      if (prev.some((m) => m.id === media.id)) return prev;
      return [media, ...prev];
    });

    const dur = Math.max(0.5, media.duration || 5);
    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      trackId,
      mediaId: media.id,
      name: media.name,
      type: media.type,
      startTime: Math.max(0, startTime),
      duration: dur,
      trimStart: 0,
      speed: 1.0,
      colorTag: media.type === 'audio' ? '#059669' : media.type === 'generator' ? '#6366f1' : '#0284c7',
      transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      colorGrading: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' },
      effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
      audioSettings: { volume: 0, pan: 0, mute: false },
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 },
    };

    setClips((prev) => {
      const next = [...prev, newClip];
      pushHistory(next);
      return next;
    });

    handleSelectClip(newClip.id);
  }, [pushHistory, handleSelectClip]);

  // Drop Local Files directly onto Timeline
  const handleDropFilesOnTimeline = useCallback((files: FileList, trackId: string, startTime: number) => {
    let offsetTime = startTime;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImg = file.type.startsWith('image');

      const newItem: MediaItem = {
        id: `user-media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        url,
        duration: isImg ? 6.0 : 15.0,
        thumbnail: isImg ? url : '',
      };

      setMediaItems((prev) => [newItem, ...prev]);

      const currentStart = offsetTime;
      const dur = newItem.duration;
      offsetTime += dur;

      const newClip: Clip = {
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        trackId: isAudio && !trackId.startsWith('a') ? 'a1' : trackId,
        mediaId: newItem.id,
        name: newItem.name,
        type: newItem.type,
        startTime: Math.max(0, currentStart),
        duration: dur,
        trimStart: 0,
        speed: 1.0,
        colorTag: isAudio ? '#059669' : '#0284c7',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
        colorGrading: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' },
        effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
        audioSettings: { volume: 0, pan: 0, mute: false },
        transitionIn: { type: 'none', duration: 0.5 },
        transitionOut: { type: 'none', duration: 0.5 },
      };

      setClips((prev) => {
        const next = [...prev, newClip];
        pushHistory(next);
        return next;
      });
      handleSelectClip(newClip.id);
    });
  }, [pushHistory, handleSelectClip]);

  // Drop Generator directly onto Timeline
  const handleDropGeneratorOnTimeline = useCallback((type: 'smpte-bars' | 'countdown', trackId: string, startTime: number) => {
    const isSmpte = type === 'smpte-bars';
    const mediaItem: MediaItem = {
      id: `gen-${type}-${Date.now()}`,
      name: isSmpte ? 'SMPTE_Color_Bars_Test.mov' : 'Universal_Countdown_5s.mov',
      type: 'generator',
      url: '',
      duration: isSmpte ? 8.0 : 5.0,
      width: 1920,
      height: 1080,
      thumbnail: '',
      generatorType: type,
    };

    setMediaItems((prev) => [mediaItem, ...prev]);

    const newClip: Clip = {
      id: `clip-gen-${Date.now()}`,
      trackId,
      mediaId: mediaItem.id,
      name: mediaItem.name,
      type: 'generator',
      startTime: Math.max(0, startTime),
      duration: mediaItem.duration,
      trimStart: 0,
      speed: 1.0,
      colorTag: isSmpte ? '#6366f1' : '#f59e0b',
      transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      colorGrading: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' },
      effects: { gaussianBlur: 0, glitch: false, mirror: false, invert: false, blackAndWhite: false, edgeGlow: false },
      audioSettings: { volume: 0, pan: 0, mute: false },
      transitionIn: { type: 'none', duration: 0.5 },
      transitionOut: { type: 'none', duration: 0.5 },
    };

    setClips((prev) => {
      const next = [...prev, newClip];
      pushHistory(next);
      return next;
    });
    handleSelectClip(newClip.id);
  }, [pushHistory, handleSelectClip]);

  // Apply Effect to specific Clip (e.g. when dragged onto it)
  const handleApplyEffectToClip = useCallback((clipId: string, effectId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const currentPlugins = clip.plugins || DEFAULT_AE_PLUGINS;

    if (effectId === 'ae-optical-flares') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          opticalFlares: { ...currentPlugins.opticalFlares, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'ae-trapcode-particles') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          trapcodeParticles: { ...currentPlugins.trapcodeParticles, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'ae-deep-glow') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          deepGlow: { ...currentPlugins.deepGlow, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'ae-chromatic-aberration') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          chromaticAberration: { ...currentPlugins.chromaticAberration, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'ae-vhs-glitch') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          vhsGlitch: { ...currentPlugins.vhsGlitch, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'ae-wave-displacement') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          waveDisplacement: { ...currentPlugins.waveDisplacement, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'ae-light-rays') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          lightRays: { ...currentPlugins.lightRays, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'ae-halftone') {
      handleUpdateClip({
        ...clip,
        plugins: {
          ...currentPlugins,
          halftone: { ...currentPlugins.halftone, enabled: true },
        },
      });
      setShowInspector(true);
    } else if (effectId === 'lut-teal-orange') {
      handleUpdateClip({
        ...clip,
        colorGrading: { ...clip.colorGrading, exposure: 5, contrast: 20, temperature: 10, tint: -5, saturation: 120, vignette: 25, lutPreset: 'teal-orange' },
      });
      setShowInspector(true);
    } else if (effectId === 'lut-cyberpunk') {
      handleUpdateClip({
        ...clip,
        colorGrading: { ...clip.colorGrading, exposure: 10, contrast: 30, temperature: -25, tint: 25, saturation: 140, vignette: 35, lutPreset: 'cyberpunk' },
      });
      setShowInspector(true);
    } else if (effectId === 'lut-vintage-film') {
      handleUpdateClip({
        ...clip,
        colorGrading: { ...clip.colorGrading, exposure: -5, contrast: -10, temperature: 15, tint: 8, saturation: 85, filmGrain: 25, vignette: 30, lutPreset: 'vintage-film' },
      });
      setShowInspector(true);
    } else if (effectId === 'lut-monochrome') {
      handleUpdateClip({
        ...clip,
        colorGrading: { ...clip.colorGrading, exposure: 0, contrast: 40, saturation: 0, filmGrain: 20, vignette: 40, lutPreset: 'monochrome' },
      });
      setShowInspector(true);
    } else if (effectId === 'lut-warm-sunset') {
      handleUpdateClip({
        ...clip,
        colorGrading: { ...clip.colorGrading, exposure: 8, contrast: 15, temperature: 30, tint: 10, saturation: 125, vignette: 20, lutPreset: 'warm-sunset' },
      });
      setShowInspector(true);
    } else if (effectId === 'gaussian-blur') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, gaussianBlur: 14 } });
      setShowInspector(true);
    } else if (effectId === 'glitch') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, glitch: !clip.effects.glitch } });
      setShowInspector(true);
    } else if (effectId === 'black-and-white') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, blackAndWhite: true } });
      setShowInspector(true);
    } else if (effectId === 'edge-glow') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, edgeGlow: true } });
      setShowInspector(true);
    } else if (effectId === 'cross-dissolve') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'cross-dissolve', duration: 0.8 } });
    } else if (effectId === 'dip-to-black') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'dip-to-black', duration: 0.6 } });
    } else if (effectId === 'wipe-left') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'wipe-left', duration: 0.6 } });
    }
  }, [clips, handleUpdateClip]);

  // Apply Effect to selected clip from Project Bin or Top Right Menu
  const handleApplyEffectToSelected = useCallback((effectId: string) => {
    let targetId = selectedClipId;

    if (!targetId) {
      // Find clip under playhead
      const underPlayhead = clips.filter((c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration);
      if (underPlayhead.length > 0) {
        targetId = underPlayhead[underPlayhead.length - 1].id;
        handleSelectClip(targetId);
      } else if (clips.length > 0) {
        targetId = clips[0].id;
        handleSelectClip(targetId);
      }
    }

    if (!targetId) return;
    handleApplyEffectToClip(targetId, effectId);
  }, [selectedClipId, clips, currentTime, handleSelectClip, handleApplyEffectToClip]);

  // Marker Management Handlers (M / Shift+M / Navigation / Snapping)
  const handleAddMarker = useCallback((time?: number) => {
    const targetTime = time !== undefined ? time : currentTime;
    const existing = markers.find((m) => Math.abs(m.time - targetTime) < 0.15);
    if (existing) {
      setActiveMarkerToEdit(existing);
      setIsMarkerModalOpen(true);
      return;
    }

    const newMarker: Marker = {
      id: `marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: targetTime,
      name: `Marker ${markers.length + 1}`,
      label: `Marker ${markers.length + 1}`,
      color: '#22c55e',
    };
    setMarkers((prev) => [...prev, newMarker].sort((a, b) => a.time - b.time));
  }, [currentTime, markers]);

  const handleEditMarker = useCallback((marker: Marker) => {
    setActiveMarkerToEdit(marker);
    setIsMarkerModalOpen(true);
  }, []);

  const handleSaveMarker = useCallback((updatedMarker: Marker) => {
    setMarkers((prev) => {
      const exists = prev.some((m) => m.id === updatedMarker.id);
      if (exists) {
        return prev.map((m) => (m.id === updatedMarker.id ? updatedMarker : m)).sort((a, b) => a.time - b.time);
      } else {
        return [...prev, updatedMarker].sort((a, b) => a.time - b.time);
      }
    });
  }, []);

  const handleDeleteMarker = useCallback((markerId: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
  }, []);

  const handleJumpNextMarker = useCallback(() => {
    if (markers.length === 0) return;
    const next = markers.find((m) => m.time > currentTime + 0.05);
    if (next) {
      setCurrentTime(next.time);
    } else if (markers.length > 0) {
      setCurrentTime(markers[0].time);
    }
  }, [markers, currentTime]);

  const handleJumpPrevMarker = useCallback(() => {
    if (markers.length === 0) return;
    const prevList = [...markers].sort((a, b) => b.time - a.time);
    const prev = prevList.find((m) => m.time < currentTime - 0.05);
    if (prev) {
      setCurrentTime(prev.time);
    } else if (markers.length > 0) {
      setCurrentTime(markers[markers.length - 1].time);
    }
  }, [markers, currentTime]);

  // Project File Save & Load State Handlers
  const getCurrentProjectObject = useCallback((): CineFlowProject => {
    return {
      version: '1.0.0',
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fps: 30,
      duration,
      currentTime,
      inPoint,
      outPoint,
      masterVolume,
      snapping,
      tracks,
      clips,
      markers,
      mediaItems,
    };
  }, [
    projectId,
    projectName,
    duration,
    currentTime,
    inPoint,
    outPoint,
    masterVolume,
    snapping,
    tracks,
    clips,
    markers,
    mediaItems,
  ]);

  const handleQuickSave = useCallback(() => {
    const proj = getCurrentProjectObject();
    saveProjectToLocalStorage(proj);
    setLastSavedAt(new Date().toISOString());
    setIsUnsaved(false);
    setToastMessage(`Project saved to browser: ${projectName}`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [getCurrentProjectObject, projectName]);

  const handleLoadProject = useCallback((project: CineFlowProject) => {
    setProjectId(project.id || `proj_${Date.now()}`);
    setProjectName(project.name || 'Imported Project');
    
    // Sanitize loaded tracks to prevent missing properties (like volume or pan) from older saved schemas
    const sanitizedTracks = (project.tracks && project.tracks.length > 0 ? project.tracks : INITIAL_TRACKS).map((t) => {
      const template = INITIAL_TRACKS.find((it) => it.id === t.id) || {
        volume: 1,
        pan: 0,
        muted: false,
        solo: false,
        locked: false,
        visible: true,
      };
      return {
        ...template,
        ...t,
        volume: typeof t.volume === 'number' && !isNaN(t.volume) ? t.volume : (typeof template.volume === 'number' ? template.volume : 1),
        pan: typeof t.pan === 'number' && !isNaN(t.pan) ? t.pan : (typeof template.pan === 'number' ? template.pan : 0),
        muted: t.muted !== undefined ? t.muted : (template.muted !== undefined ? template.muted : false),
        solo: t.solo !== undefined ? t.solo : (template.solo !== undefined ? template.solo : false),
        locked: t.locked !== undefined ? t.locked : (template.locked !== undefined ? template.locked : false),
        visible: t.visible !== undefined ? t.visible : (template.visible !== undefined ? template.visible : true),
      };
    });

    setTracks(sanitizedTracks);
    setClips(project.clips || []);
    if (project.markers) setMarkers(project.markers);
    if (project.mediaItems && project.mediaItems.length > 0) {
      setMediaItems((prev) => {
        const map = new Map<string, MediaItem>();
        prev.forEach((m) => map.set(m.id, m));
        project.mediaItems.forEach((m) => map.set(m.id, m));
        return Array.from(map.values());
      });
    }
    setCurrentTime(project.currentTime || 0);
    setInPoint(typeof project.inPoint === 'number' ? project.inPoint : null);
    setOutPoint(typeof project.outPoint === 'number' ? project.outPoint : null);
    if (typeof project.masterVolume === 'number') setMasterVolume(project.masterVolume);
    if (project.snapping !== undefined) setSnapping(project.snapping);

    setHistory([{ clips: project.clips || [], tracks: sanitizedTracks }]);
    setHistoryIndex(0);
    setLastSavedAt(project.updatedAt || new Date().toISOString());
    setIsUnsaved(false);
    setToastMessage(`Loaded project: "${project.name}"`);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleNewProject = useCallback(() => {
    setProjectId(`proj_${Date.now()}`);
    setProjectName('Untitled_Sequence');
    setTracks(INITIAL_TRACKS);
    setClips([]);
    setMarkers([]);
    setCurrentTime(0);
    setInPoint(null);
    setOutPoint(null);
    setHistory([{ clips: [], tracks: INITIAL_TRACKS }]);
    setHistoryIndex(0);
    setIsUnsaved(false);
    setToastMessage('Created new blank sequence');
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Restore active project from local browser storage on first visit (ignoring old template demo projects)
  useEffect(() => {
    const saved = loadActiveProjectFromLocalStorage();
    if (saved && saved.clips && saved.clips.length > 0) {
      const isTemplateProject = 
        saved.name === 'CineFlow_Demo_Trailer' || 
        saved.clips.some((c) => c.mediaId?.startsWith('media-nature') || c.mediaId?.startsWith('media-neon'));
      if (isTemplateProject) {
        try {
          localStorage.removeItem('cineflow_active_project');
        } catch {
          // ignore
        }
        return;
      }
      handleLoadProject(saved);
    }
  }, [handleLoadProject]);

  // Periodic Auto-Save every 60s if project has unsaved edits
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (isUnsaved) {
        const proj = getCurrentProjectObject();
        saveProjectToLocalStorage(proj);
        setLastSavedAt(new Date().toISOString());
        setIsUnsaved(false);
      }
    }, 60000);

    return () => clearInterval(autoSaveInterval);
  }, [isUnsaved, getCurrentProjectObject]);

  // Allow dragging and dropping a .cineflow or .json project file directly onto window
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };

    const handleWindowDrop = async (e: DragEvent) => {
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.cineflow') || (file.name.endsWith('.json') && !file.type.includes('image'))) {
        e.preventDefault();
        try {
          const project = await parseProjectFile(file);
          handleLoadProject(project);
        } catch {
          // not a valid project, let other file handlers take it
        }
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [handleLoadProject]);

  // Adobe Premiere Pro Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // SPACE: Play / Stop
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }

      // PREMIERE TOOLS
      else if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('select');
      } else if (e.code === 'KeyA' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        setActiveTool('track-select');
      } else if (e.code === 'KeyA' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setActiveTool('track-select-back');
      } else if (e.code === 'KeyB' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('ripple');
      } else if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('razor');
      } else if (e.code === 'KeyZ' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('zoom');
      } else if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('type');
        handleAddTitle();
      }

      // J - K - L VARIABLE SPEED SHUTTLE CONTROLS (-4x to 4x)
      else if (e.code === 'KeyK' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        isKPressedRef.current = true;
        handleShuttleStop();
      } else if (e.code === 'KeyL' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (isKPressedRef.current) {
          // K + L held or tapped: step 1 frame forward or slow scrub
          if (e.repeat) {
            setIsPlaying(true);
            setShuttleSpeed(0.5);
          } else {
            handleStepFrame(1);
          }
        } else {
          handleShuttleForward();
        }
      } else if (e.code === 'KeyJ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (isKPressedRef.current) {
          // K + J held or tapped: step 1 frame backward or slow scrub
          if (e.repeat) {
            setIsPlaying(true);
            setShuttleSpeed(-0.5);
          } else {
            handleStepFrame(-1);
          }
        } else {
          handleShuttleReverse();
        }
      }

      // FRAME STEPPING & EDIT POINTS
      else if (e.code === 'ArrowLeft' && !e.shiftKey) {
        e.preventDefault();
        handleStepFrame(-1);
      } else if (e.code === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault();
        handleStepFrame(1);
      } else if (e.code === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        handleStepFrame(-5);
      } else if (e.code === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        handleStepFrame(5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleJumpEditPoint(-1);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleJumpEditPoint(1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        setCurrentTime(duration);
      }

      // IN / OUT POINTS
      else if (e.code === 'KeyI' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setInPoint(currentTime);
      } else if (e.code === 'KeyO' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setOutPoint(currentTime);
      } else if (e.code === 'KeyX' && (e.altKey || e.metaKey)) {
        setInPoint(null);
        setOutPoint(null);
      } else if (e.code === 'KeyI' && e.shiftKey) {
        setCurrentTime(inPoint ?? 0);
      } else if (e.code === 'KeyO' && e.shiftKey) {
        setCurrentTime(outPoint ?? duration);
      }

      // D: Select Clip at Playhead
      else if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey) {
        handleSelectClipAtPlayhead();
      }

      // RIPPLE DELETE (Shift + Delete or ')
      else if (
        (e.code === 'Delete' && e.shiftKey) ||
        (e.code === 'Backspace' && e.shiftKey) ||
        e.code === 'Quote'
      ) {
        if (selectedClipId) {
          e.preventDefault();
          handleRippleDelete(selectedClipId);
        }
      }

      // STANDARD DELETE / BACKSPACE
      else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipIds.length > 1) {
          e.preventDefault();
          handleDeleteMultipleClips(selectedClipIds);
        } else if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      }

      // CTRL/CMD + A: Select All Clips
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault();
        handleSelectMultipleClips(clips.map((c) => c.id));
      }

      // ESCAPE: Clear Selection
      else if (e.code === 'Escape') {
        handleSelectClip(null);
      }

      // CTRL/CMD + D: Apply Default Transition
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        handleApplyDefaultTransition();
      }

      // BACKSLASH (\): Fit Sequence
      else if (e.code === 'Backslash') {
        handleFitTimeline();
      }

      // ZOOM TIMELINE: = AND -
      else if (e.code === 'Equal') {
        setZoom((z) => Math.min(250, z + 15));
      } else if (e.code === 'Minus') {
        setZoom((z) => Math.max(20, z - 15));
      }

      // S: Toggle Snapping
      else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        setSnapping((prev) => !prev);
      }

      // CTRL/CMD + S: Save Project
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS' && !e.shiftKey) {
        e.preventDefault();
        handleQuickSave();
      }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        setProjectFileModalTab('save');
        setIsProjectFileModalOpen(true);
      }

      // CTRL/CMD + O: Open Project File
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyO') {
        e.preventDefault();
        setProjectFileModalTab('open');
        setIsProjectFileModalOpen(true);
      }

      // CTRL/CMD + Z: Undo
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // CTRL/CMD + Y / SHIFT+Z: Redo
      else if (
        ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
      ) {
        e.preventDefault();
        handleRedo();
      }

      // CTRL/CMD + K: Split at Playhead
      else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK' && !e.shiftKey) {
        e.preventDefault();
        handleSplitAtPlayhead(false);
      }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyK') {
        e.preventDefault();
        handleSplitAtPlayhead(true);
      }

      // M / SHIFT+M / CTRL+M: Markers & Export
      else if (e.code === 'KeyM') {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          // CTRL/CMD + M: Export Media
          e.preventDefault();
          setIsExportOpen(true);
        } else if (((e.ctrlKey || e.metaKey) && e.shiftKey) || (e.altKey && e.shiftKey)) {
          // CTRL+SHIFT+M / ALT+SHIFT+M: Jump to Previous Marker
          e.preventDefault();
          handleJumpPrevMarker();
        } else if (e.shiftKey) {
          // SHIFT+M: Jump to Next Marker
          e.preventDefault();
          handleJumpNextMarker();
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          // M: Add Marker at Playhead
          e.preventDefault();
          handleAddMarker(currentTime);
        }
      }

      // ?: Help / Shortcuts / F1 / Ctrl+/
      else if (
        e.key === '?' || 
        e.code === 'F1' || 
        ((e.ctrlKey || e.metaKey) && e.code === 'Slash')
      ) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyK') {
        isKPressedRef.current = false;
        if (Math.abs(shuttleSpeedRef.current) === 0.5) {
          handleShuttleStop();
        }
      } else if (e.code === 'KeyJ' || e.code === 'KeyL') {
        if (Math.abs(shuttleSpeedRef.current) === 0.5) {
          handleShuttleStop();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleTogglePlay,
    handleStepFrame,
    handleJumpEditPoint,
    handleDeleteClip,
    handleRippleDelete,
    handleApplyDefaultTransition,
    handleSelectClipAtPlayhead,
    handleFitTimeline,
    handleUndo,
    handleRedo,
    handleSplitAtPlayhead,
    handleAddTitle,
    handleAddMarker,
    handleJumpNextMarker,
    handleJumpPrevMarker,
    handleQuickSave,
    handleShuttleForward,
    handleShuttleReverse,
    handleShuttleStop,
    currentTime,
    duration,
    selectedClipId,
    isPlaying,
    shuttleSpeed,
    inPoint,
    outPoint,
    clips,
    markers,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070a14] text-neutral-200 overflow-hidden select-none font-sans">
      {/* Clean Top Header Bar */}
      <HeaderBar
        projectName={projectName}
        onUpdateProjectName={setProjectName}
        onQuickSave={handleQuickSave}
        onOpenProjectFileModal={(tab = 'save') => {
          setProjectFileModalTab(tab);
          setIsProjectFileModalOpen(true);
        }}
        lastSavedAt={lastSavedAt}
        isUnsaved={isUnsaved}
        showInspector={showInspector}
        onToggleInspector={() => setShowInspector(!showInspector)}
        showMediaBin={showMediaBin}
        onToggleMediaBin={() => setShowMediaBin(!showMediaBin)}
        showAudioMixer={showAudioMixer}
        onToggleAudioMixer={() => setShowAudioMixer(!showAudioMixer)}
        showAIAssistant={showAIAssistant}
        onToggleAIAssistant={() => setShowAIAssistant(!showAIAssistant)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        snapping={snapping}
        onToggleSnapping={() => setSnapping(!snapping)}
        onImportClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'video/*,audio/*,image/*';
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) handleImportFiles(files);
          };
          input.click();
        }}
        onOpenDrive={() => setIsDriveOpen(true)}
        currentUser={currentUser}
        onAddTitle={handleAddTitle}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        selectedClip={selectedClip}
        onApplyEffect={handleApplyEffectToSelected}
      />

      {/* Main Workstation Layout */}
      <div 
        ref={workstationRef}
        className={`flex-1 flex flex-col min-h-0 overflow-hidden relative select-none ${
          isDraggingVerticalSplit ? 'cursor-row-resize' : isDraggingMediaBin || isDraggingInspector || isDraggingAudioMixer ? 'cursor-col-resize' : ''
        }`}
      >
        {/* Upper Deck: Clean 3-Zone Space (Media Bin + Large Program Monitor + Inspector) */}
        <div 
          ref={upperDeckRef}
          style={{ height: `${verticalSplitPercent}%` }} 
          className="flex min-h-0 border-b border-[#1b254a] overflow-hidden relative shrink-0"
        >
          {/* Left: Collapsible & Resizable Media Bin */}
          {showMediaBin && (
            <>
              <div 
                style={{ width: `${mediaBinWidth}px` }} 
                className="flex flex-col min-h-0 shrink-0 overflow-hidden"
              >
                <ProjectBin
                  mediaItems={mediaItems}
                  selectedMediaId={selectedMediaId}
                  onSelectMedia={(m) => setSelectedMediaId(m.id)}
                  onDoubleClickMedia={(m) => handleInsertMedia(m)}
                  onImportFiles={handleImportFiles}
                  onOpenDrive={() => setIsDriveOpen(true)}
                  onOpenShortcuts={() => setIsShortcutsOpen(true)}
                  onAddGenerator={handleAddGenerator}
                  onAddAdjustmentLayer={() => handleAddAdjustmentLayer()}
                  onAddEffectsLayer={() => handleAddEffectsLayer()}
                  onApplyEffectToSelected={handleApplyEffectToSelected}
                />
              </div>

              {/* Left Resizer Handle */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDraggingMediaBin(true);
                }}
                onDoubleClick={() => {
                  setMediaBinWidth(260);
                  localStorage.setItem('riley_mediabin_width', '260');
                }}
                className="w-1.5 hover:w-2 bg-[#121935] hover:bg-sky-500 active:bg-sky-400 border-x border-[#1b254a] hover:border-sky-400 cursor-col-resize shrink-0 transition-all z-20 group relative flex items-center justify-center"
                title="Drag to resize Project Bin (Double-click to reset)"
              >
                <div className="w-0.5 h-6 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
              </div>
            </>
          )}

          {/* Left-Center: Collapsible & Resizable Audio Mixer */}
          {showAudioMixer && (
            <>
              <div 
                style={{ width: `${audioMixerWidth}px` }} 
                className="flex flex-col min-h-0 shrink-0 overflow-hidden"
              >
                <AudioMixer
                  tracks={tracks}
                  onToggleMute={handleToggleTrackMute}
                  onToggleSolo={handleToggleTrackSolo}
                  onUpdateVolume={handleUpdateTrackVolume}
                  onUpdatePan={handleUpdateTrackPan}
                  onUpdateEQ={handleUpdateTrackEQ}
                  masterVolume={masterVolume}
                  onUpdateMasterVolume={setMasterVolume}
                  isPlaying={isPlaying}
                />
              </div>

              {/* Audio Mixer Resizer Handle */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDraggingAudioMixer(true);
                }}
                onDoubleClick={() => {
                  setAudioMixerWidth(240);
                  localStorage.setItem('riley_audiomixer_width', '240');
                }}
                className="w-1.5 hover:w-2 bg-[#121935] hover:bg-emerald-500 active:bg-emerald-400 border-x border-[#1b254a] hover:border-emerald-400 cursor-col-resize shrink-0 transition-all z-20 group relative flex items-center justify-center"
                title="Drag to resize Audio Mixer (Double-click to reset)"
              >
                <div className="w-0.5 h-6 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
              </div>
            </>
          )}

          {/* Center: Hero Video Program Monitor taking all available space */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0d0d10] overflow-hidden">
            <ProgramMonitor
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              tracks={tracks}
              clips={clips}
              mediaMap={mediaMap}
              fps={30}
              inPoint={inPoint}
              outPoint={outPoint}
              loop={loop}
              shuttleSpeed={shuttleSpeed}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onStepFrame={(dir) => handleStepFrame(dir)}
              onSetInPoint={() => setInPoint(currentTime)}
              onSetOutPoint={() => setOutPoint(currentTime)}
              onToggleLoop={() => setLoop(!loop)}
              onShuttleForward={handleShuttleForward}
              onShuttleReverse={handleShuttleReverse}
              onShuttleStop={handleShuttleStop}
              onImportFiles={handleImportFiles}
            />
          </div>

          {/* Right: Collapsible & Resizable Inspector & Color Panel */}
          {showInspector && (
            <>
              {/* Right Resizer Handle */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDraggingInspector(true);
                }}
                onDoubleClick={() => {
                  setInspectorWidth(320);
                  localStorage.setItem('riley_inspector_width', '320');
                }}
                className="w-1.5 hover:w-2 bg-[#121935] hover:bg-purple-500 active:bg-purple-400 border-x border-[#1b254a] hover:border-purple-400 cursor-col-resize shrink-0 transition-all z-20 group relative flex items-center justify-center"
                title="Drag to resize Inspector (Double-click to reset)"
              >
                <div className="w-0.5 h-6 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
              </div>

              <div 
                style={{ width: `${inspectorWidth}px` }} 
                className="flex flex-col min-h-0 shrink-0 overflow-hidden"
              >
                <EffectControls
                  selectedClip={selectedClip}
                  onUpdateClip={handleUpdateClip}
                  onClose={() => setShowInspector(false)}
                />
              </div>
            </>
          )}

          {/* AI Assistant Chatbot Sidebar */}
          <AIAssistant
            isOpen={showAIAssistant}
            onClose={() => setShowAIAssistant(false)}
            currentTime={currentTime}
            duration={duration}
            tracks={tracks}
            clips={clips}
            selectedClip={selectedClip}
            selectedClipIds={selectedClipIds}
            onAddAdjustmentLayer={(trackId, time) => handleAddAdjustmentLayer(trackId, time)}
            onAddEffectsLayer={(trackId, time) => handleAddEffectsLayer(trackId, time)}
            onAddTitle={handleAddTitle}
            onAddGenerator={handleAddGenerator}
            onAddTrack={handleAddTrack}
            onSplitAtPlayhead={() => handleSplitAtPlayhead(false)}
            onSplitClip={handleSplitClip}
            onDeleteClip={handleDeleteClip}
            onUpdateClip={(clipId, updates) => {
              const target = clips.find((c) => c.id === clipId);
              if (target) {
                handleUpdateClip({ ...target, ...updates });
              }
            }}
            onApplyEffectToSelected={handleApplyEffectToSelected}
            onToggleTrackMute={handleToggleTrackMute}
            onToggleTrackLock={handleToggleTrackLock}
            onToggleTrackVisible={handleToggleTrackVisible}
            onSeek={handleSeek}
            onTogglePlay={handleTogglePlay}
          />
        </div>

        {/* Horizontal Layout Resizer between Viewer & Timeline */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingVerticalSplit(true);
          }}
          onDoubleClick={() => {
            setVerticalSplitPercent(50);
            localStorage.setItem('riley_vertical_split', '50');
          }}
          className="h-2 hover:h-2.5 bg-[#0f1631] hover:bg-sky-600 active:bg-sky-500 border-y border-[#1b254a] hover:border-sky-400 cursor-row-resize shrink-0 transition-all z-30 group relative flex items-center justify-center select-none shadow-xs"
          title={`Drag up/down to adjust Viewer (${Math.round(verticalSplitPercent)}%) and Timeline (${Math.round(100 - verticalSplitPercent)}%). Double-click to reset (50/50).`}
        >
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#172248] group-hover:bg-sky-950 border border-[#213063] group-hover:border-sky-400 shadow-xs transition-all">
            <div className="w-6 h-0.5 bg-slate-400 group-hover:bg-sky-200 rounded-full" />
            <span className="text-[9px] text-slate-400 group-hover:text-sky-200 font-mono font-medium whitespace-nowrap">
              Viewer {Math.round(verticalSplitPercent)}% • Timeline {Math.round(100 - verticalSplitPercent)}%
            </span>
            <div className="w-6 h-0.5 bg-slate-400 group-hover:bg-sky-200 rounded-full" />
          </div>
        </div>

        {/* Lower Deck: Simplified Tools + Timeline + Audio Meter */}
        <div 
          style={{ height: `${100 - verticalSplitPercent}%` }} 
          className="flex min-h-0 overflow-hidden"
        >
          {/* Streamlined Tools Palette (Select, Cut, Ripple, Title, Zoom, Split, Adjustment, Effects) */}
          <TimelineToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onSplitAtPlayhead={() => handleSplitAtPlayhead(false)}
            onAddAdjustmentLayer={() => handleAddAdjustmentLayer()}
            onAddEffectsLayer={() => handleAddEffectsLayer()}
          />

          {/* Premiere Multi-Track Timeline */}
          <Timeline
            currentTime={currentTime}
            duration={duration}
            tracks={tracks}
            clips={clips}
            mediaMap={mediaMap}
            activeTool={activeTool}
            zoom={zoom}
            selectedClipId={selectedClipId}
            selectedClipIds={selectedClipIds}
            snapping={snapping}
            inPoint={inPoint}
            outPoint={outPoint}
            markers={markers}
            onSeek={handleSeek}
            onSelectClip={handleSelectClip}
            onSelectMultipleClips={handleSelectMultipleClips}
            onUpdateClip={handleUpdateClip}
            onUpdateMultipleClips={handleUpdateMultipleClips}
            onCommitClipChanges={handleCommitClipChanges}
            onDeleteClip={handleDeleteClip}
            onDeleteMultipleClips={handleDeleteMultipleClips}
            onSplitClip={handleSplitClip}
            onAddTrack={handleAddTrack}
            onChangeTrackLayerType={handleChangeTrackLayerType}
            onAddAdjustmentLayer={handleAddAdjustmentLayer}
            onAddEffectsLayer={handleAddEffectsLayer}
            onToggleTrackVisible={handleToggleTrackVisible}
            onToggleTrackLock={handleToggleTrackLock}
            onToggleTrackMute={handleToggleTrackMute}
            onToggleTrackSolo={handleToggleTrackSolo}
            onUpdateTrackVolume={handleUpdateTrackVolume}
            onSetZoom={setZoom}
            onFitTimeline={handleFitTimeline}
            onClearTimeline={handleClearTimeline}
            onDropMedia={handleDropMediaOnTimeline}
            onDropFiles={handleDropFilesOnTimeline}
            onDropGenerator={handleDropGeneratorOnTimeline}
            onApplyEffectToClip={handleApplyEffectToClip}
            onAddMarker={handleAddMarker}
            onEditMarker={handleEditMarker}
            onDeleteMarker={handleDeleteMarker}
          />

          {/* Vertical Stereo Decibel VU Meter */}
          <AudioMeter
            isPlaying={isPlaying}
            masterVolume={masterVolume}
            onMasterVolumeChange={setMasterVolume}
          />
        </div>
      </div>

      {/* Google Drive Footage Browser Modal */}
      <GoogleDriveModal
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        currentUser={currentUser}
        accessToken={driveToken}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setDriveToken(token);
        }}
        onAuthSignOut={() => {
          setCurrentUser(null);
          setDriveToken(null);
        }}
        onImportMedia={handleImportDriveMedia}
      />

      {/* Export Sequence Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        duration={duration}
        tracks={tracks}
        clips={clips}
        mediaMap={mediaMap}
        currentTime={currentTime}
        inPoint={inPoint}
        outPoint={outPoint}
      />

      {/* Timestamped Marker System Modal */}
      <MarkerModal
        isOpen={isMarkerModalOpen}
        marker={activeMarkerToEdit}
        currentTime={currentTime}
        onClose={() => setIsMarkerModalOpen(false)}
        onSave={handleSaveMarker}
        onDelete={handleDeleteMarker}
        onSeek={handleSeek}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Project File Save & Open Modal */}
      <ProjectFileModal
        isOpen={isProjectFileModalOpen}
        onClose={() => setIsProjectFileModalOpen(false)}
        currentProject={getCurrentProjectObject()}
        onUpdateProjectName={setProjectName}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
        lastSavedAt={lastSavedAt}
        onSaveCurrentProject={handleQuickSave}
      />

      {/* Floating Save / Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161622] border border-sky-500/50 text-white px-3.5 py-2 rounded-lg shadow-2xl flex items-center gap-2 text-xs animate-fadeIn backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
