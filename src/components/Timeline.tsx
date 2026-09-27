import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Volume2, 
  VolumeX, 
  Scissors, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Trash2,
  Copy,
  Layers,
  MousePointer,
  Magnet,
  Bookmark,
  Music,
  Film
} from 'lucide-react';
import { Clip, MediaItem, PremiereTool, Track, MediaType, Marker } from '../types/editor';
import { formatTimecode, snapTime } from '../utils/timecode';
import { generateWaveformFromDuration } from '../utils/waveform';

export interface SnapGuideInfo {
  time: number;
  label: string;
  type: 'playhead' | 'clip-edge' | 'in-point' | 'out-point' | 'start' | 'marker';
  targetClipName?: string;
  edgeType?: 'start' | 'end';
}

interface TimelineProps {
  currentTime: number;
  duration: number;
  tracks: Track[];
  clips: Clip[];
  mediaMap: Map<string, MediaItem>;
  activeTool: PremiereTool;
  zoom: number; // pixels per second (e.g. 50)
  selectedClipId: string | null;
  selectedClipIds?: string[];
  snapping: boolean;
  inPoint: number | null;
  outPoint: number | null;
  markers?: Marker[];
  onSeek: (time: number) => void;
  onSelectClip: (clipId: string | null, isMulti?: boolean) => void;
  onSelectMultipleClips?: (clipIds: string[]) => void;
  onUpdateClip: (clip: Clip) => void;
  onUpdateMultipleClips?: (clips: Clip[]) => void;
  onCommitClipChanges?: (clips: Clip[]) => void;
  onDeleteClip: (clipId: string) => void;
  onDeleteMultipleClips?: (clipIds: string[]) => void;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onAddTrack: (type: 'video' | 'audio') => void;
  onToggleTrackVisible: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onSetZoom: (zoom: number) => void;
  onFitTimeline: () => void;
  onClearTimeline?: () => void;
  onDropMedia?: (media: MediaItem, trackId: string, startTime: number) => void;
  onDropFiles?: (files: FileList, trackId: string, startTime: number) => void;
  onDropGenerator?: (generatorType: 'smpte-bars' | 'countdown', trackId: string, startTime: number) => void;
  onApplyEffectToClip?: (clipId: string, effectId: string) => void;
  onAddMarker?: (time?: number) => void;
  onEditMarker?: (marker: Marker) => void;
  onDeleteMarker?: (markerId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  duration,
  tracks,
  clips,
  mediaMap,
  activeTool,
  zoom,
  selectedClipId,
  selectedClipIds,
  snapping,
  inPoint,
  outPoint,
  markers = [],
  onSeek,
  onSelectClip,
  onSelectMultipleClips,
  onUpdateClip,
  onUpdateMultipleClips,
  onCommitClipChanges,
  onDeleteClip,
  onDeleteMultipleClips,
  onSplitClip,
  onAddTrack,
  onToggleTrackVisible,
  onToggleTrackLock,
  onToggleTrackMute,
  onSetZoom,
  onFitTimeline,
  onClearTimeline,
  onDropMedia,
  onDropFiles,
  onDropGenerator,
  onApplyEffectToClip,
  onAddMarker,
  onEditMarker,
  onDeleteMarker,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tracksContainerRef = useRef<HTMLDivElement | null>(null);

  // Normalize selected IDs
  const currentSelectedIds = useMemo(() => {
    if (selectedClipIds && selectedClipIds.length > 0) {
      return selectedClipIds;
    }
    return selectedClipId ? [selectedClipId] : [];
  }, [selectedClipIds, selectedClipId]);

  // Dragging states
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);
  const [trimmingClip, setTrimmingClip] = useState<{ id: string; side: 'left' | 'right'; startX: number; originalStart: number; originalDur: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ trackId: string; time: number } | null>(null);

  // Visual Snapping Guide Overlay State
  const [snapGuide, setSnapGuide] = useState<SnapGuideInfo | null>(null);

  // Multi-clip Dragging states
  const [isDraggingClips, setIsDraggingClips] = useState(false);
  const dragAnchorClipRef = useRef<Clip | null>(null);
  const dragStartXRef = useRef(0);
  const dragInitialStatesRef = useRef<Map<string, { startTime: number; duration: number; trackId: string; type: MediaType }>>(new Map());
  const activeDraggedClipsRef = useRef<Clip[]>([]);

  // Marquee Selection Box State
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);
  const selectionBoxRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);
  const marqueeInitialSelection = useRef<string[]>([]);
  const isMarqueeAdditive = useRef<boolean>(false);

  // Helper to retrieve stationary snap targets with rich metadata
  const getStationarySnapTargets = useCallback((excludeClipIds: Set<string>) => {
    const targets: Array<{
      time: number;
      type: SnapGuideInfo['type'];
      label: string;
      targetClipName?: string;
      edgeType?: 'start' | 'end';
    }> = [
      { time: 0, type: 'start', label: 'ORIGIN 00:00:00:00' },
      { time: currentTime, type: 'playhead', label: `PLAYHEAD (${formatTimecode(currentTime, 30)})` },
    ];

    if (inPoint !== null) {
      targets.push({ time: inPoint, type: 'in-point', label: `IN POINT (${formatTimecode(inPoint, 30)})` });
    }
    if (outPoint !== null) {
      targets.push({ time: outPoint, type: 'out-point', label: `OUT POINT (${formatTimecode(outPoint, 30)})` });
    }

    if (markers && markers.length > 0) {
      for (const m of markers) {
        targets.push({
          time: m.time,
          type: 'marker',
          label: `MARKER: ${m.name || m.label || 'Marker'} (${formatTimecode(m.time, 30)})`,
          targetClipName: m.name || m.label,
        });
      }
    }

    for (const c of clips) {
      if (!excludeClipIds.has(c.id)) {
        targets.push({
          time: c.startTime,
          type: 'clip-edge',
          label: `${c.name} [START]`,
          targetClipName: c.name,
          edgeType: 'start',
        });
        targets.push({
          time: c.startTime + c.duration,
          type: 'clip-edge',
          label: `${c.name} [END]`,
          targetClipName: c.name,
          edgeType: 'end',
        });
      }
    }

    return targets;
  }, [currentTime, inPoint, outPoint, clips, markers]);

  // Handle ruler scrub
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsScrubbingRuler(true);
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
    let time = Math.max(0, x / zoom);
    
    if (snapping) {
      const snapTargets = getStationarySnapTargets(new Set());
      const snapThresholdSec = Math.max(0.12, 14 / zoom);
      let closestTarget = null;
      let minDiff = Infinity;
      for (const t of snapTargets) {
        const diff = Math.abs(time - t.time);
        if (diff <= snapThresholdSec && diff < minDiff) {
          minDiff = diff;
          closestTarget = t;
        }
      }
      if (closestTarget) {
        time = closestTarget.time;
        setSnapGuide(closestTarget);
      } else {
        setSnapGuide(null);
      }
    }
    onSeek(time);
  };

  // Marquee Box Selection on Empty Space MouseDown
  const handleTracksMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (activeTool === 'razor') return;

    // Check if clicked directly on a clip
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('[data-clip-id]')) {
      return;
    }

    if (!tracksContainerRef.current) return;
    const rect = tracksContainerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    const isAdditive = e.ctrlKey || e.metaKey || e.shiftKey;
    isMarqueeAdditive.current = isAdditive;
    marqueeInitialSelection.current = isAdditive ? [...currentSelectedIds] : [];

    const newBox = {
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      isDragging: false,
    };
    selectionBoxRef.current = newBox;
    setSelectionBox(newBox);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Ruler scrubbing
      if (isScrubbingRuler && scrollRef.current) {
        const rect = scrollRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
        let time = Math.max(0, x / zoom);

        if (snapping) {
          const snapTargets = getStationarySnapTargets(new Set());
          const snapThresholdSec = Math.max(0.12, 14 / zoom);
          let closestTarget = null;
          let minDiff = Infinity;
          for (const t of snapTargets) {
            const diff = Math.abs(time - t.time);
            if (diff <= snapThresholdSec && diff < minDiff) {
              minDiff = diff;
              closestTarget = t;
            }
          }
          if (closestTarget) {
            time = closestTarget.time;
            setSnapGuide(closestTarget);
          } else {
            setSnapGuide(null);
          }
        }
        onSeek(time);
      }

      // 2. Selection Box (Marquee)
      if (selectionBoxRef.current && tracksContainerRef.current) {
        const rect = tracksContainerRef.current.getBoundingClientRect();
        const curX = Math.max(0, e.clientX - rect.left);
        const curY = Math.max(0, e.clientY - rect.top);

        const dist = Math.hypot(curX - selectionBoxRef.current.startX, curY - selectionBoxRef.current.startY);
        const isDragging = selectionBoxRef.current.isDragging || dist > 4;

        const updatedBox = { ...selectionBoxRef.current, currentX: curX, currentY: curY, isDragging };
        selectionBoxRef.current = updatedBox;
        setSelectionBox(updatedBox);

        if (isDragging) {
          const boxLeft = Math.min(updatedBox.startX, curX);
          const boxRight = Math.max(updatedBox.startX, curX);
          const boxTop = Math.min(updatedBox.startY, curY);
          const boxBottom = Math.max(updatedBox.startY, curY);

          const boxStartTime = boxLeft / zoom;
          const boxEndTime = boxRight / zoom;

          let currentY = 0;
          const intersectingTrackIds = new Set<string>();
          for (const track of tracks) {
            const trackTop = currentY;
            const trackBottom = currentY + track.height;
            if (trackBottom >= boxTop && trackTop <= boxBottom) {
              intersectingTrackIds.add(track.id);
            }
            currentY += track.height;
          }

          const intersectingClipIds: string[] = [];
          for (const clip of clips) {
            if (intersectingTrackIds.has(clip.trackId)) {
              const clipStart = clip.startTime;
              const clipEnd = clip.startTime + clip.duration;
              if (clipStart < boxEndTime && clipEnd > boxStartTime) {
                intersectingClipIds.push(clip.id);
              }
            }
          }

          let newSelectedIds: string[];
          if (isMarqueeAdditive.current) {
            const combined = new Set([...marqueeInitialSelection.current, ...intersectingClipIds]);
            newSelectedIds = Array.from(combined);
          } else {
            newSelectedIds = intersectingClipIds;
          }

          onSelectMultipleClips?.(newSelectedIds);
        }
      }

      // 3. Dragging multiple selected clips simultaneously
      if (isDraggingClips && dragAnchorClipRef.current && scrollRef.current) {
        const dx = e.clientX - dragStartXRef.current;
        let dt = dx / zoom;

        // Find min startTime among all dragged clips to prevent moving earlier than 0
        let minStartTime = Infinity;
        activeDraggedClipsRef.current.forEach((c) => {
          const init = dragInitialStatesRef.current.get(c.id);
          if (init && init.startTime < minStartTime) {
            minStartTime = init.startTime;
          }
        });

        // Clamp dt so minStartTime + dt >= 0
        if (minStartTime + dt < 0) {
          dt = -minStartTime;
        }

        // Snapping using all dragged clips edges vs all stationary targets
        if (snapping) {
          const snapThresholdSec = Math.max(0.12, 14 / zoom);
          const draggedIds = new Set(activeDraggedClipsRef.current.map((c) => c.id));
          const snapTargets = getStationarySnapTargets(draggedIds);

          let bestSnap: {
            dtOffset: number;
            target: typeof snapTargets[0];
            snappedEdge: 'start' | 'end';
          } | null = null;
          let minSnapDiff = Infinity;

          for (const clip of activeDraggedClipsRef.current) {
            const init = dragInitialStatesRef.current.get(clip.id);
            if (!init) continue;

            const currentStart = init.startTime + dt;
            const currentEnd = init.startTime + clip.duration + dt;

            for (const target of snapTargets) {
              // Check clip leading edge (Start) snapping to target
              const diffStart = Math.abs(currentStart - target.time);
              if (diffStart <= snapThresholdSec && diffStart < minSnapDiff) {
                const candidateDt = target.time - init.startTime;
                if (minStartTime + candidateDt >= 0) {
                  minSnapDiff = diffStart;
                  bestSnap = {
                    dtOffset: candidateDt - dt,
                    target,
                    snappedEdge: 'start',
                  };
                }
              }

              // Check clip trailing edge (End) snapping to target
              const diffEnd = Math.abs(currentEnd - target.time);
              if (diffEnd <= snapThresholdSec && diffEnd < minSnapDiff) {
                const candidateDt = (target.time - clip.duration) - init.startTime;
                if (minStartTime + candidateDt >= 0) {
                  minSnapDiff = diffEnd;
                  bestSnap = {
                    dtOffset: candidateDt - dt,
                    target,
                    snappedEdge: 'end',
                  };
                }
              }
            }
          }

          if (bestSnap) {
            dt += bestSnap.dtOffset;
            setSnapGuide({
              time: bestSnap.target.time,
              label: bestSnap.target.label,
              type: bestSnap.target.type,
              targetClipName: bestSnap.target.targetClipName,
              edgeType: bestSnap.snappedEdge,
            });
          } else {
            setSnapGuide(null);
          }
        } else {
          setSnapGuide(null);
        }

        // Vertical track movement across tracks of same type
        let targetTrackDelta = 0;
        const anchorInit = dragInitialStatesRef.current.get(dragAnchorClipRef.current.id);
        const anchorTrack = tracks.find((t) => t.id === anchorInit?.trackId);
        const elUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        const trackRow = elUnderCursor?.closest('[data-track-id]') as HTMLElement | null;

        if (trackRow && anchorTrack) {
          const hoveredTrackId = trackRow.dataset.trackId;
          const targetTrack = tracks.find((t) => t.id === hoveredTrackId);
          if (targetTrack && targetTrack.type === anchorTrack.type) {
            const sameTypeTracks = tracks.filter((t) => t.type === anchorTrack.type);
            const anchorIdx = sameTypeTracks.findIndex((t) => t.id === anchorTrack.id);
            const targetIdx = sameTypeTracks.findIndex((t) => t.id === targetTrack.id);
            const candidateDelta = targetIdx - anchorIdx;

            const canShift = activeDraggedClipsRef.current.every((c) => {
              const init = dragInitialStatesRef.current.get(c.id);
              if (!init || init.type !== anchorTrack.type) return true;
              const curIdx = sameTypeTracks.findIndex((t) => t.id === init.trackId);
              const newIdx = curIdx + candidateDelta;
              if (newIdx < 0 || newIdx >= sameTypeTracks.length) return false;
              if (sameTypeTracks[newIdx].locked) return false;
              return true;
            });

            if (canShift) {
              targetTrackDelta = candidateDelta;
            }
          }
        }

        // Compute updated clip positions
        const updatedClips = activeDraggedClipsRef.current.map((c) => {
          const init = dragInitialStatesRef.current.get(c.id)!;
          let newTrackId = init.trackId;
          if (targetTrackDelta !== 0 && anchorTrack) {
            const sameTypeTracks = tracks.filter((t) => t.type === init.type);
            const curIdx = sameTypeTracks.findIndex((t) => t.id === init.trackId);
            const newIdx = curIdx + targetTrackDelta;
            if (newIdx >= 0 && newIdx < sameTypeTracks.length) {
              newTrackId = sameTypeTracks[newIdx].id;
            }
          }
          return {
            ...c,
            startTime: Math.max(0, init.startTime + dt),
            trackId: newTrackId,
          };
        });

        if (onUpdateMultipleClips) {
          onUpdateMultipleClips(updatedClips);
        } else {
          updatedClips.forEach((c) => onUpdateClip(c));
        }
      }

      // 4. Trimming In or Out point with Snapping
      if (trimmingClip) {
        const dx = e.clientX - trimmingClip.startX;
        const dt = dx / zoom;
        const clip = clips.find((c) => c.id === trimmingClip.id);
        if (clip) {
          const snapTargets = getStationarySnapTargets(new Set([clip.id]));
          const snapThresholdSec = Math.max(0.12, 14 / zoom);

          if (trimmingClip.side === 'right') {
            const rawEndTime = clip.startTime + trimmingClip.originalDur + dt;
            let finalDur = Math.max(0.2, trimmingClip.originalDur + dt);

            if (snapping) {
              let closestTarget = null;
              let minDiff = Infinity;
              for (const target of snapTargets) {
                const diff = Math.abs(rawEndTime - target.time);
                if (diff <= snapThresholdSec && diff < minDiff) {
                  minDiff = diff;
                  closestTarget = target;
                }
              }

              if (closestTarget) {
                finalDur = Math.max(0.2, closestTarget.time - clip.startTime);
                setSnapGuide({
                  time: closestTarget.time,
                  label: closestTarget.label,
                  type: closestTarget.type,
                  targetClipName: closestTarget.targetClipName,
                  edgeType: 'end',
                });
              } else {
                setSnapGuide(null);
              }
            } else {
              setSnapGuide(null);
            }

            onUpdateClip({ ...clip, duration: finalDur });
          } else {
            // Left edge trim
            const rawStartTime = trimmingClip.originalStart + dt;
            let finalStart = Math.max(0, rawStartTime);

            if (snapping) {
              let closestTarget = null;
              let minDiff = Infinity;
              for (const target of snapTargets) {
                const diff = Math.abs(rawStartTime - target.time);
                if (diff <= snapThresholdSec && diff < minDiff) {
                  minDiff = diff;
                  closestTarget = target;
                }
              }

              if (closestTarget) {
                finalStart = Math.max(0, closestTarget.time);
                setSnapGuide({
                  time: closestTarget.time,
                  label: closestTarget.label,
                  type: closestTarget.type,
                  targetClipName: closestTarget.targetClipName,
                  edgeType: 'start',
                });
              } else {
                setSnapGuide(null);
              }
            } else {
              setSnapGuide(null);
            }

            const durDiff = trimmingClip.originalStart - finalStart;
            const newDur = Math.max(0.2, trimmingClip.originalDur + durDiff);
            const newTrimStart = Math.max(0, clip.trimStart + (finalStart - trimmingClip.originalStart));
            onUpdateClip({ ...clip, startTime: finalStart, duration: newDur, trimStart: newTrimStart });
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbingRuler(false);
      setSnapGuide(null);

      if (selectionBoxRef.current) {
        if (!selectionBoxRef.current.isDragging) {
          if (!isMarqueeAdditive.current) {
            onSelectClip(null);
          }
          const clickedTime = Math.max(0, selectionBoxRef.current.startX / zoom);
          if (snapping) {
            const targets = getStationarySnapTargets(new Set());
            const snapThresholdSec = Math.max(0.12, 14 / zoom);
            const match = targets.find((t) => Math.abs(clickedTime - t.time) <= snapThresholdSec);
            onSeek(match ? match.time : clickedTime);
          } else {
            onSeek(clickedTime);
          }
        }
        selectionBoxRef.current = null;
        setSelectionBox(null);
      }

      if (isDraggingClips) {
        if (activeDraggedClipsRef.current.length > 0) {
          const draggedIds = new Set(activeDraggedClipsRef.current.map((c) => c.id));
          const finalClips = clips.filter((c) => draggedIds.has(c.id));
          onCommitClipChanges?.(finalClips);
        }
        setIsDraggingClips(false);
        dragAnchorClipRef.current = null;
        activeDraggedClipsRef.current = [];
      }

      setTrimmingClip(null);
    };

    if (isScrubbingRuler || isDraggingClips || trimmingClip || selectionBox !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isScrubbingRuler, isDraggingClips, trimmingClip, selectionBox, zoom, snapping, clips, tracks, getStationarySnapTargets, onSeek, onSelectClip, onSelectMultipleClips, onUpdateClip, onUpdateMultipleClips, onCommitClipChanges]);

  // Click on clip (Selection or Razor Cut)
  const handleClipClick = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    if (activeTool === 'razor') {
      if (!scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollRef.current.scrollLeft;
      const clickTime = clickX / zoom;
      if (clickTime > clip.startTime && clickTime < clip.startTime + clip.duration) {
        onSplitClip(clip.id, clickTime);
      }
    } else {
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        onSelectClip(clip.id, true);
      } else {
        if (!currentSelectedIds.includes(clip.id)) {
          onSelectClip(clip.id, false);
        }
      }
    }
  };

  // Begin dragging clip (or group of selected clips)
  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    if (activeTool === 'razor') return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    let targetSelectedIds: string[];

    if (isCtrlOrMeta || isShift) {
      onSelectClip(clip.id, true);
      if (currentSelectedIds.includes(clip.id)) {
        return;
      }
      targetSelectedIds = [...currentSelectedIds, clip.id];
    } else {
      if (currentSelectedIds.includes(clip.id)) {
        targetSelectedIds = currentSelectedIds;
      } else {
        onSelectClip(clip.id, false);
        targetSelectedIds = [clip.id];
      }
    }

    const clipsToDrag = clips.filter((c) => targetSelectedIds.includes(c.id));
    activeDraggedClipsRef.current = clipsToDrag;
    dragAnchorClipRef.current = clip;
    dragStartXRef.current = e.clientX;

    const initialMap = new Map<string, { startTime: number; duration: number; trackId: string; type: MediaType }>();
    clipsToDrag.forEach((c) => {
      initialMap.set(c.id, {
        startTime: c.startTime,
        duration: c.duration,
        trackId: c.trackId,
        type: c.type,
      });
    });
    dragInitialStatesRef.current = initialMap;
    setIsDraggingClips(true);
  };

  // Begin trimming
  const handleTrimMouseDown = (e: React.MouseEvent, clip: Clip, side: 'left' | 'right') => {
    e.stopPropagation();
    setTrimmingClip({
      id: clip.id,
      side,
      startX: e.clientX,
      originalStart: clip.startTime,
      originalDur: clip.duration,
    });
  };

  // Total timeline width in px
  const timelineWidth = Math.max(1600, duration * zoom + 400);

  // Ruler tick intervals based on zoom
  const tickIntervalSec = zoom > 120 ? 1 : zoom > 50 ? 2 : 5;
  const numTicks = Math.ceil((duration + 10) / tickIntervalSec);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-[#0d0d11] border border-[#222228] overflow-hidden select-none"
    >
      {/* Timeline Header Bar */}
      <div className="h-8 bg-[#131318] border-b border-[#222228] px-3 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-200">Timeline</span>
          <span className="text-neutral-600">•</span>
          <span className="text-[11px] text-neutral-400">Sequence 01</span>
          {activeTool === 'razor' && (
            <span className="text-rose-400 font-medium bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40 text-[10px] animate-pulse">
              Razor Cut Mode (C)
            </span>
          )}
        </div>

        {/* Zoom & Track Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#1b1b22] px-1.5 py-0.5 rounded-md border border-[#272732]">
            <button
              onClick={() => onSetZoom(Math.max(20, zoom - 15))}
              title="Zoom Out (-)"
              className="p-1 hover:text-white cursor-pointer transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-neutral-400 text-[10px] font-mono tabular-nums px-1">{zoom}px/s</span>
            <button
              onClick={() => onSetZoom(Math.min(250, zoom + 15))}
              title="Zoom In (+)"
              className="p-1 hover:text-white cursor-pointer transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onFitTimeline}
            title="Fit Entire Sequence (\)"
            className="flex items-center gap-1 px-2 py-1 bg-[#1b1b22] hover:bg-[#24242e] text-neutral-300 hover:text-white rounded-md border border-[#272732] cursor-pointer text-xs font-medium transition-colors"
          >
            <Maximize className="w-3 h-3" />
            <span>Fit</span>
          </button>

          <div className="h-4 w-[1px] bg-neutral-800" />

          {/* Add Track & Markers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddTrack('video')}
              title="Add Video Track"
              className="px-2 py-1 bg-[#16202c] hover:bg-[#1e2d3e] text-sky-400 border border-sky-500/30 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Video</span>
            </button>
            <button
              onClick={() => onAddTrack('audio')}
              title="Add Audio Track"
              className="px-2 py-1 bg-[#13241b] hover:bg-[#1a3327] text-emerald-400 border border-emerald-500/30 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Audio</span>
            </button>

            {onAddMarker && (
              <button
                onClick={() => onAddMarker(currentTime)}
                title="Add Marker at Current Playhead Time (M)"
                className="px-2 py-1 bg-[#1c221b] hover:bg-[#283227] text-emerald-300 border border-emerald-500/40 rounded-md cursor-pointer text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Bookmark className="w-3 h-3 text-emerald-400" />
                <span>Marker</span>
              </button>
            )}

            {onClearTimeline && clips.length > 0 && (
              <button
                onClick={onClearTimeline}
                title="Clear All Clips"
                className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/40 rounded-md cursor-pointer ml-1 text-xs font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Timeline Workspace (Track Headers on Left + Track Clips on Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Track Headers Column */}
        <div className="w-32 bg-[#101014] border-r border-[#222228] flex flex-col shrink-0 select-none z-10 text-xs">
          {/* Top ruler placeholder align */}
          <div className="h-6 bg-[#131318] border-b border-[#222228] px-2 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
            <span>TRACK</span>
            <span>CONTROLS</span>
          </div>

          {/* Track Header Rows */}
          <div className="flex-1 overflow-y-hidden">
            {tracks.map((track) => (
              <div
                key={track.id}
                style={{ height: `${track.height}px` }}
                className={`flex items-center justify-between px-2 border-b border-[#1c1c24] transition-colors ${
                  track.type === 'video' ? 'bg-[#121217]' : 'bg-[#0f1412]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
                      track.type === 'video'
                        ? 'text-sky-400 bg-sky-950/60 border border-sky-500/30'
                        : 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                    }`}
                  >
                    {track.name}
                  </span>
                </div>

                {/* Track Mute / Lock toggles */}
                <div className="flex items-center gap-1">
                  {track.type === 'video' ? (
                    <button
                      onClick={() => onToggleTrackVisible(track.id)}
                      title={track.visible ? 'Hide Video Track' : 'Show Video Track'}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        track.visible
                          ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          : 'text-amber-400 bg-amber-950/70'
                      }`}
                    >
                      {track.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleTrackMute(track.id)}
                      title={track.muted ? 'Unmute Audio Track' : 'Mute Audio Track'}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        track.muted
                          ? 'text-rose-400 bg-rose-950/70'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {/* Lock */}
                  <button
                    onClick={() => onToggleTrackLock(track.id)}
                    title={track.locked ? 'Unlock Track' : 'Lock Track'}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      track.locked
                        ? 'text-amber-400 bg-amber-950/70'
                        : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas & Ruler */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0a0a0d] select-none"
        >
          {/* Time Ruler */}
          <div
            onMouseDown={handleRulerMouseDown}
            style={{ width: `${timelineWidth}px` }}
            className="h-6 bg-[#121217] border-b border-[#222228] relative cursor-pointer select-none"
          >
            {/* Ticks and SMPTE Labels */}
            {Array.from({ length: numTicks }).map((_, i) => {
              const tickTime = i * tickIntervalSec;
              const leftPos = tickTime * zoom;
              return (
                <div
                  key={i}
                  style={{ left: `${leftPos}px` }}
                  className="absolute top-0 bottom-0 border-l border-neutral-800 pl-0.5 flex items-center"
                >
                  <span className="text-[9px] text-neutral-500 tabular-nums">
                    {formatTimecode(tickTime, 30)}
                  </span>
                </div>
              );
            })}

            {/* In / Out visual range highlight on ruler */}
            {inPoint !== null && outPoint !== null && (
              <div
                className="absolute top-0 bottom-0 bg-sky-500/20 border-l-2 border-r-2 border-sky-400"
                style={{
                  left: `${inPoint * zoom}px`,
                  width: `${(outPoint - inPoint) * zoom}px`,
                }}
              />
            )}

            {/* Sequence Markers on Ruler */}
            {markers.map((marker) => {
              const leftPos = marker.time * zoom;
              return (
                <div
                  key={marker.id}
                  style={{ left: `${leftPos}px` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(marker.time);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onEditMarker?.(marker);
                  }}
                  className="absolute top-0 bottom-0 z-40 group cursor-pointer"
                >
                  {/* Marker Pin Flag */}
                  <div
                    style={{ backgroundColor: marker.color || '#22c55e' }}
                    className="w-2.5 h-3 flex items-center justify-center -ml-1 shadow-md text-[6px] text-black font-bold group-hover:scale-125 transition-transform"
                  >
                    ◆
                  </div>

                  {/* Hover Marker Tooltip Card */}
                  <div className="hidden group-hover:flex absolute top-4 left-1/2 -translate-x-1/2 z-50 flex-col items-center pointer-events-auto">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[#111116]" />
                    <div className="bg-[#111116] border border-[#2e2e3e] p-1.5 shadow-2xl rounded-xs text-[9px] font-mono text-neutral-200 whitespace-nowrap space-y-0.5">
                      <div className="flex items-center gap-1 font-bold" style={{ color: marker.color || '#22c55e' }}>
                        <span>⚑</span>
                        <span>{marker.name || marker.label}</span>
                      </div>
                      <div className="text-[8px] text-neutral-400 font-mono">
                        {formatTimecode(marker.time, 30)}
                      </div>
                      {marker.comment && (
                        <div className="text-[8px] text-neutral-400 max-w-[130px] truncate">
                          {marker.comment}
                        </div>
                      )}
                      <div className="flex items-center gap-1 pt-1 border-t border-neutral-800 text-[8px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditMarker?.(marker);
                          }}
                          className="px-1 py-0.2 bg-[#20202c] hover:bg-[#2c2c3e] text-sky-300 rounded cursor-pointer"
                        >
                          Edit
                        </button>
                        {onDeleteMarker && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteMarker(marker.id);
                            }}
                            className="px-1 py-0.2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded cursor-pointer"
                          >
                            Del
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Snap Guide Flag on Ruler */}
            {snapGuide && (
              <div
                style={{ left: `${snapGuide.time * zoom}px` }}
                className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-50 pointer-events-none shadow-[0_0_10px_#22d3ee]"
              >
                <div className="absolute -top-0.5 -left-2 w-4 h-3 bg-cyan-400 flex items-center justify-center text-[8px] text-black font-bold shadow-md">
                  ▼
                </div>
              </div>
            )}
          </div>

          {/* Tracks and Clips Area */}
          <div
            ref={tracksContainerRef}
            onMouseDown={handleTracksMouseDown}
            style={{ width: `${timelineWidth}px` }}
            className="relative timeline-grid min-h-[300px]"
          >
            {/* Subtle Marker Track Reference Lines */}
            {markers.map((marker) => {
              const leftPos = marker.time * zoom;
              return (
                <div
                  key={`track-marker-line-${marker.id}`}
                  style={{
                    left: `${leftPos}px`,
                    borderColor: marker.color || '#22c55e',
                  }}
                  className="absolute top-0 bottom-0 w-0 border-l border-dashed opacity-25 pointer-events-none z-10"
                />
              );
            })}

            {/* Empty Timeline Prompt */}
            {clips.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 text-neutral-500 text-xs">
                <span className="bg-[#181822]/90 border border-neutral-800/80 px-4 py-2 rounded shadow-md text-neutral-400">
                  Timeline is empty · Double-click media in the Media Bin or Google Drive to begin editing
                </span>
              </div>
            )}

            {/* Visual Snapping Guide Overlay Line, Glow & Information Pill */}
            {snapGuide && (
              <div
                style={{ left: `${snapGuide.time * zoom}px` }}
                className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-40 pointer-events-none shadow-[0_0_14px_rgba(34,211,238,1)] animate-in fade-in duration-75"
              >
                {/* Top Floating Snap Tag / Badge */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#051c24] text-cyan-300 border border-cyan-400 text-[9px] font-mono font-bold shadow-xl rounded-xs">
                    <Magnet className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                    <span>SNAP: {snapGuide.label}</span>
                  </div>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-cyan-400" />
                </div>

                {/* Vertical Ambient Glow Column */}
                <div className="w-full h-full bg-cyan-400/20" />

                {/* Bottom Snap Arrow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-cyan-400" />
              </div>
            )}

            {/* Marquee Selection Box */}
            {selectionBox && selectionBox.isDragging && (
              <div
                style={{
                  left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                  top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                  width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                  height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
                }}
                className="absolute border border-sky-400 bg-sky-500/20 pointer-events-none z-40 rounded-xs shadow-sm backdrop-blur-xs"
              />
            )}
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);
              const isDropTarget = dropTarget?.trackId === track.id;

              return (
                <div
                  key={track.id}
                  data-track-id={track.id}
                  style={{ height: `${track.height}px` }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (!scrollRef.current) return;
                    const rect = scrollRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
                    let time = Math.max(0, x / zoom);

                    if (snapping) {
                      const targets = getStationarySnapTargets(new Set());
                      const snapThresholdSec = Math.max(0.12, 14 / zoom);
                      let closest = null;
                      let minDiff = Infinity;
                      for (const t of targets) {
                        const diff = Math.abs(time - t.time);
                        if (diff <= snapThresholdSec && diff < minDiff) {
                          minDiff = diff;
                          closest = t;
                        }
                      }
                      if (closest) {
                        time = closest.time;
                        setSnapGuide(closest);
                      } else {
                        setSnapGuide(null);
                      }
                    } else {
                      setSnapGuide(null);
                    }

                    setDropTarget({ trackId: track.id, time });
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) {
                      setDropTarget((prev) => (prev?.trackId === track.id ? null : prev));
                      setSnapGuide(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropTarget(null);
                    setSnapGuide(null);
                    if (!scrollRef.current) return;
                    const rect = scrollRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
                    let time = Math.max(0, x / zoom);

                    if (snapping) {
                      const targets = getStationarySnapTargets(new Set());
                      const snapThresholdSec = Math.max(0.12, 14 / zoom);
                      const closest = targets.find((t) => Math.abs(time - t.time) <= snapThresholdSec);
                      if (closest) time = closest.time;
                    }

                    // 1. Files dropped directly from desktop/OS
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      onDropFiles?.(e.dataTransfer.files, track.id, time);
                      return;
                    }

                    // 2. Dragged item from ProjectBin
                    const rawData = e.dataTransfer.getData('application/json');
                    if (rawData) {
                      try {
                        const parsed = JSON.parse(rawData);
                        if (parsed.type === 'effect') {
                          if (selectedClipId) {
                            onApplyEffectToClip?.(selectedClipId, parsed.id);
                          }
                          return;
                        }
                        if (parsed.type === 'generator') {
                          onDropGenerator?.(parsed.generatorType, track.id, time);
                          return;
                        }
                        onDropMedia?.(parsed as MediaItem, track.id, time);
                      } catch (err) {
                        console.error('Timeline drop parse error:', err);
                      }
                    }
                  }}
                  className={`border-b border-[#22222d] relative transition-colors ${
                    track.type === 'video' ? 'bg-[#16161c]' : 'bg-[#131318]'
                  } ${isDropTarget ? 'ring-1 ring-inset ring-sky-400/90 bg-sky-950/30' : ''}`}
                >
                  {/* Drop Ghost / Phantom Indicator */}
                  {isDropTarget && (
                    <div
                      style={{
                        left: `${dropTarget.time * zoom}px`,
                        width: `${Math.max(40, 5 * zoom)}px`,
                      }}
                      className="absolute top-1 bottom-1 rounded border-2 border-dashed border-sky-400 bg-sky-500/30 z-30 pointer-events-none flex items-center px-2.5 shadow-lg backdrop-blur-xs animate-pulse"
                    >
                      <span className="text-[10px] font-bold text-sky-200 truncate">
                        Drop at {formatTimecode(dropTarget.time, 30)}
                      </span>
                    </div>
                  )}

                  {/* Clips on this track */}
                  {trackClips.map((clip) => {
                    const isSelected = currentSelectedIds.includes(clip.id);
                    const isGroupSelected = currentSelectedIds.length > 1 && isSelected;
                    const media = mediaMap.get(clip.mediaId);
                    const left = clip.startTime * zoom;
                    const width = Math.max(12, clip.duration * zoom);

                    return (
                      <div
                        key={clip.id}
                        data-clip-id={clip.id}
                        onClick={(e) => handleClipClick(e, clip)}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                          const rawData = e.dataTransfer.getData('application/json');
                          if (rawData) {
                            try {
                              const parsed = JSON.parse(rawData);
                              if (parsed.type === 'effect') {
                                e.preventDefault();
                                e.stopPropagation();
                                onApplyEffectToClip?.(clip.id, parsed.id);
                                return;
                              }
                            } catch {}
                          }
                        }}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          backgroundColor: clip.colorTag || (clip.type === 'audio' ? '#065f46' : '#0284c7'),
                        }}
                        className={`absolute top-1 bottom-1 rounded-md border cursor-move flex items-center justify-between px-1.5 overflow-hidden select-none transition-shadow ${
                          isGroupSelected
                            ? 'border-sky-300 ring-2 ring-sky-300/80 shadow-md z-20 brightness-110'
                            : isSelected
                            ? 'border-white ring-2 ring-white/90 shadow-md z-20 brightness-105'
                            : 'border-black/30 hover:border-white/40 shadow-xs hover:brightness-105 z-10'
                        } ${activeTool === 'razor' ? 'cursor-crosshair' : ''}`}
                      >
                        {/* Left Trim Handle */}
                        <div
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, 'left')}
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/40 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center"
                        >
                          <div className="w-[2px] h-3 bg-white/70 rounded-full" />
                        </div>

                        {/* Audio Waveform visualization calculated directly from media duration */}
                        {(clip.type === 'audio' || track.type === 'audio') && (
                          <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none overflow-hidden opacity-65">
                            {/* Waveform Centerline */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-emerald-400/25 pointer-events-none" />
                            {generateWaveformFromDuration(
                              clip.duration,
                              media?.duration || clip.duration,
                              clip.trimStart || 0,
                              Math.max(16, Math.min(160, Math.floor(width / 3.2))),
                              clip.name + clip.mediaId
                            ).map((amp, idx) => (
                              <div
                                key={idx}
                                style={{ height: `${Math.max(12, amp * 84)}%` }}
                                className="w-[2px] bg-emerald-300 rounded-full shrink-0 shadow-xs"
                              />
                            ))}
                          </div>
                        )}

                        {/* Clip Label & Metadata */}
                        <div className="flex items-center gap-1.5 truncate pointer-events-none text-white z-10 text-xs">
                          <span className="p-0.5 rounded bg-black/40 text-neutral-300">
                            {clip.type === 'audio' || track.type === 'audio' ? (
                              <Music className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Film className="w-3 h-3 text-sky-400" />
                            )}
                          </span>
                          {activeTool === 'razor' && (
                            <span className="text-rose-300 font-bold bg-rose-950/70 px-1 rounded text-[10px]">CUT</span>
                          )}
                          <span className="font-medium text-[11px] truncate drop-shadow-xs">
                            {clip.name}
                          </span>
                          {clip.speed !== 1 && (
                            <span className="text-[9px] bg-black/50 px-1 py-0.2 rounded font-mono">
                              {clip.speed}x
                            </span>
                          )}
                        </div>

                        {/* Transition In Badge */}
                        {clip.transitionIn && clip.transitionIn.type !== 'none' && (
                          <div
                            style={{ width: `${clip.transitionIn.duration * zoom}px` }}
                            className="absolute left-0 top-0 bottom-0 bg-white/20 backdrop-blur-xs border-r border-white/50 pointer-events-none flex items-center justify-center text-[9px] text-white font-medium truncate"
                          >
                            ◀ {clip.transitionIn.type.slice(0, 4)}
                          </div>
                        )}

                        {/* Transition Out Badge */}
                        {clip.transitionOut && clip.transitionOut.type !== 'none' && (
                          <div
                            style={{ width: `${clip.transitionOut.duration * zoom}px` }}
                            className="absolute right-0 top-0 bottom-0 bg-white/20 backdrop-blur-xs border-l border-white/50 pointer-events-none flex items-center justify-center text-[9px] text-white font-medium truncate"
                          >
                            {clip.transitionOut.type.slice(0, 4)} ▶
                          </div>
                        )}

                        {/* Right Trim Handle */}
                        <div
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, 'right')}
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/40 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center"
                        >
                          <div className="w-[2px] h-3 bg-white/70 rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Draggable Red Playhead & Cursor Line */}
            <div
              style={{ left: `${currentTime * zoom}px` }}
              className="absolute top-0 bottom-0 w-[1px] bg-rose-500 z-30 pointer-events-none"
            >
              {/* Playhead Flag */}
              <div className="absolute -top-5 -left-2 w-4 h-5 bg-rose-500 flex items-center justify-center shadow-md cursor-pointer pointer-events-auto text-[9px] font-bold text-white">
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Clip(s) Quick Status Bar */}
      {currentSelectedIds.length > 0 && (
        <div className="h-5 bg-[#0c0c0e] border-t border-[#222226] px-2 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            {currentSelectedIds.length > 1 ? (
              <>
                <span className="text-sky-300 font-bold bg-sky-950/70 border border-sky-500/40 px-1 py-0.2 text-[9px]">
                  [{currentSelectedIds.length} CLIPS SELECTED]
                </span>
                <span className="text-neutral-500 text-[9px] hidden sm:inline">
                  &gt; Drag to move group · Shift/Ctrl+Click to toggle · Del to remove
                </span>
              </>
            ) : (
              <>
                <span className="text-neutral-500">SEL:</span>
                <span className="text-sky-400 font-bold">{clips.find((c) => c.id === currentSelectedIds[0])?.name}</span>
                <span className="text-neutral-600">|</span>
                <span>
                  IN: {formatTimecode(clips.find((c) => c.id === currentSelectedIds[0])?.startTime || 0, 30)}
                </span>
                <span className="text-neutral-600">|</span>
                <span>
                  DUR: {(clips.find((c) => c.id === currentSelectedIds[0])?.duration || 0).toFixed(2)}s
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (currentSelectedIds.length > 1 && onDeleteMultipleClips) {
                  onDeleteMultipleClips(currentSelectedIds);
                } else if (currentSelectedIds.length > 0) {
                  onDeleteClip(currentSelectedIds[0]);
                }
              }}
              title="Delete Selected Clip(s) (Delete / Backspace)"
              className="px-1.5 py-0.2 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 hover:text-white transition-colors cursor-pointer text-[9px] font-bold"
            >
              [DEL{currentSelectedIds.length > 1 ? ` (${currentSelectedIds.length})` : ''}]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
