import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Clip, MediaItem, PremiereTool, Track, Marker, CineFlowProject } from './types/editor';
import { 
  INITIAL_CLIPS, 
  INITIAL_MEDIA_ITEMS, 
  INITIAL_TRACKS, 
  STOCK_IMAGES 
} from './utils/sampleMedia';
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
import { AIVideoGeneratorModal } from './components/AIVideoGeneratorModal';
import { MarkerModal } from './components/MarkerModal';
import { ProjectFileModal } from './components/ProjectFileModal';

export default function App() {
  // Project Identity & File Persistence State
  const [projectId, setProjectId] = useState<string>(() => `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>('CineFlow_Seq_01');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [isProjectFileModalOpen, setIsProjectFileModalOpen] = useState<boolean>(false);
  const [projectFileModalTab, setProjectFileModalTab] = useState<'save' | 'open' | 'new'>('save');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Sequence State (clean empty timeline by default)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [shuttleSpeed, setShuttleSpeed] = useState<number>(1);
  const [activeTool, setActiveTool] = useState<PremiereTool>('select');
  const [zoom, setZoom] = useState<number>(65);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>('media-nature');
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
  const [showInspector, setShowInspector] = useState<boolean>(false);

  // Google Drive Integration State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isDriveOpen, setIsDriveOpen] = useState<boolean>(false);

  // AI Video Creation Studio State
  const [isAIVideoOpen, setIsAIVideoOpen] = useState<boolean>(false);

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

  // Preload initial stock images
  useEffect(() => {
    Object.values(STOCK_IMAGES).forEach((url) => {
      preloadImage(url);
    });
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

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      audioEngine.stopPlayback();
      return;
    }

    const hasAudio = clips.some(
      (c) =>
        (c.type === 'audio' || c.mediaId.includes('audio')) &&
        currentTime >= c.startTime &&
        currentTime < c.startTime + c.duration
    );
    audioEngine.startPlayback(hasAudio, Math.abs(shuttleSpeed));

    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((prev) => {
        const next = prev + dt * shuttleSpeed;
        const endLimit = outPoint !== null ? outPoint : duration;
        const startLimit = inPoint !== null ? inPoint : 0;

        if (shuttleSpeed > 0 && next >= endLimit) {
          if (loop) {
            return startLimit;
          } else {
            setIsPlaying(false);
            setShuttleSpeed(1);
            return endLimit;
          }
        } else if (shuttleSpeed < 0 && next <= startLimit) {
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
  }, [isPlaying, shuttleSpeed, duration, loop, inPoint, outPoint, clips, currentTime]);

  // Master Volume update
  useEffect(() => {
    audioEngine.setMasterVolume(masterVolume);
  }, [masterVolume]);

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

  // Add Track
  const handleAddTrack = useCallback((type: 'video' | 'audio') => {
    setTracks((prev) => {
      const existing = prev.filter((t) => t.type === type);
      const count = existing.length + 1;
      const id = `${type[0]}${count}`;
      const name = `${type === 'video' ? 'V' : 'A'}${count}`;

      const newTrack: Track = {
        id,
        name,
        type,
        height: 48,
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

  // Track Toggles
  const handleToggleTrackVisible = useCallback((trackId: string) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t)));
  }, []);

  const handleToggleTrackLock = useCallback((trackId: string) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)));
  }, []);

  const handleToggleTrackMute = useCallback((trackId: string) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)));
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
  const handleImportFiles = useCallback((files: FileList) => {
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

    if (effectId === 'gaussian-blur') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, gaussianBlur: 14 } });
    } else if (effectId === 'glitch') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, glitch: !clip.effects.glitch } });
    } else if (effectId === 'black-and-white') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, blackAndWhite: true } });
    } else if (effectId === 'edge-glow') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, edgeGlow: true } });
    } else if (effectId === 'cross-dissolve') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'cross-dissolve', duration: 0.8 } });
    } else if (effectId === 'dip-to-black') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'dip-to-black', duration: 0.6 } });
    } else if (effectId === 'wipe-left') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'wipe-left', duration: 0.6 } });
    }
  }, [clips, handleUpdateClip]);

  // Apply Effect to selected clip from Project Bin
  const handleApplyEffectToSelected = useCallback((effectId: string) => {
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    if (effectId === 'gaussian-blur') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, gaussianBlur: 14 } });
    } else if (effectId === 'glitch') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, glitch: !clip.effects.glitch } });
    } else if (effectId === 'black-and-white') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, blackAndWhite: true } });
    } else if (effectId === 'edge-glow') {
      handleUpdateClip({ ...clip, effects: { ...clip.effects, edgeGlow: true } });
    } else if (effectId === 'cross-dissolve') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'cross-dissolve', duration: 0.8 } });
    } else if (effectId === 'dip-to-black') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'dip-to-black', duration: 0.6 } });
    } else if (effectId === 'wipe-left') {
      handleUpdateClip({ ...clip, transitionIn: { type: 'wipe-left', duration: 0.6 } });
    }
  }, [selectedClipId, clips, handleUpdateClip]);

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
    setTracks(project.tracks && project.tracks.length > 0 ? project.tracks : INITIAL_TRACKS);
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

    setHistory([{ clips: project.clips || [], tracks: project.tracks || INITIAL_TRACKS }]);
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

  const handleLoadDemoProject = useCallback(() => {
    setProjectId(`proj_${Date.now()}`);
    setProjectName('CineFlow_Demo_Trailer');
    setTracks(INITIAL_TRACKS);
    setClips(INITIAL_CLIPS);
    setMediaItems(INITIAL_MEDIA_ITEMS);
    setMarkers([
      { id: 'm1', time: 3.5, name: 'Scene 1 Cut', label: 'Scene 1 Cut', color: '#38bdf8' },
      { id: 'm2', time: 9.0, name: 'Audio Drop', label: 'Audio Drop', color: '#22c55e' },
      { id: 'm3', time: 14.2, name: 'Title In', label: 'Title In', color: '#f59e0b' },
    ]);
    setCurrentTime(0);
    setHistory([{ clips: INITIAL_CLIPS, tracks: INITIAL_TRACKS }]);
    setHistoryIndex(0);
    setIsUnsaved(true);
    setToastMessage('Loaded demo sequence');
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Restore active project from local browser storage on first visit
  useEffect(() => {
    const saved = loadActiveProjectFromLocalStorage();
    if (saved && saved.clips && saved.clips.length > 0) {
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

      // J - K - L SHUTTLE CONTROLS
      else if (e.code === 'KeyJ' && !e.ctrlKey && !e.metaKey) {
        if (!isPlaying) {
          setShuttleSpeed(-1);
          setIsPlaying(true);
        } else if (shuttleSpeed > 0) {
          setShuttleSpeed(-1);
        } else {
          setShuttleSpeed((prev) => (prev <= -4 ? -4 : prev * 2));
        }
      } else if (e.code === 'KeyK' && !e.ctrlKey && !e.metaKey) {
        setIsPlaying(false);
        setShuttleSpeed(1);
      } else if (e.code === 'KeyL' && !e.ctrlKey && !e.metaKey) {
        if (!isPlaying) {
          setShuttleSpeed(1);
          setIsPlaying(true);
        } else if (shuttleSpeed < 0) {
          setShuttleSpeed(1);
        } else {
          setShuttleSpeed((prev) => (prev >= 4 ? 4 : prev * 2));
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    <div className="flex flex-col h-screen w-screen bg-[#0b0b0e] text-neutral-200 overflow-hidden select-none font-sans">
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
        onOpenAIVideo={() => setIsAIVideoOpen(true)}
        currentUser={currentUser}
        onAddTitle={handleAddTitle}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Workstation Layout */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Upper Deck: Clean 3-Zone Space (Media Bin + Large Program Monitor + Inspector) */}
        <div className="h-[50%] flex min-h-0 border-b border-[#222226] overflow-hidden">
          {/* Left: Collapsible Media Bin */}
          {showMediaBin && (
            <div className="w-64 flex flex-col min-h-0 shrink-0 border-r border-[#222226]">
              <ProjectBin
                mediaItems={mediaItems}
                selectedMediaId={selectedMediaId}
                onSelectMedia={(m) => setSelectedMediaId(m.id)}
                onDoubleClickMedia={(m) => handleInsertMedia(m)}
                onImportFiles={handleImportFiles}
                onOpenDrive={() => setIsDriveOpen(true)}
                onOpenAIVideo={() => setIsAIVideoOpen(true)}
                onOpenShortcuts={() => setIsShortcutsOpen(true)}
                onAddGenerator={handleAddGenerator}
                onApplyEffectToSelected={handleApplyEffectToSelected}
              />
            </div>
          )}

          {/* Center: Hero Video Program Monitor taking all available space */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0d0d10]">
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
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onStepFrame={(dir) => handleStepFrame(dir)}
              onSetInPoint={() => setInPoint(currentTime)}
              onSetOutPoint={() => setOutPoint(currentTime)}
              onToggleLoop={() => setLoop(!loop)}
            />
          </div>

          {/* Right: Collapsible Inspector & Color Panel */}
          {showInspector && (
            <EffectControls
              selectedClip={selectedClip}
              onUpdateClip={handleUpdateClip}
              onClose={() => setShowInspector(false)}
            />
          )}
        </div>

        {/* Lower Deck: Simplified Tools + Timeline + Audio Meter */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Streamlined Tools Palette (Select, Cut, Ripple, Title, Zoom, Split) */}
          <TimelineToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onSplitAtPlayhead={() => handleSplitAtPlayhead(false)}
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
            onToggleTrackVisible={handleToggleTrackVisible}
            onToggleTrackLock={handleToggleTrackLock}
            onToggleTrackMute={handleToggleTrackMute}
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

      {/* AI Video Creation Studio Modal */}
      <AIVideoGeneratorModal
        isOpen={isAIVideoOpen}
        onClose={() => setIsAIVideoOpen(false)}
        onAddMediaToProject={(media, addToTimeline) => handleImportDriveMedia(media, addToTimeline)}
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
        onLoadDemoProject={handleLoadDemoProject}
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
