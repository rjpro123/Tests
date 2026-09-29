import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize2, 
  Minimize2,
  Grid, 
  Repeat, 
  ChevronRight, 
  ChevronLeft, 
  Film, 
  Bookmark, 
  Upload, 
  Move, 
  RotateCw, 
  Crop, 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  X,
  Layers
} from 'lucide-react';
import { Clip, MediaItem, Track } from '../types/editor';
import { formatTimecode } from '../utils/timecode';
import { renderTimelineFrame } from '../utils/compositor';

interface ProgramMonitorProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  tracks: Track[];
  clips: Clip[];
  mediaMap: Map<string, MediaItem>;
  fps?: number;
  inPoint: number | null;
  outPoint: number | null;
  loop: boolean;
  shuttleSpeed?: number;
  selectedClip?: Clip | null;
  onUpdateClip?: (clip: Clip) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (direction: -1 | 1) => void;
  onSetInPoint: () => void;
  onSetOutPoint: () => void;
  onToggleLoop: () => void;
  onShuttleForward?: () => void;
  onShuttleReverse?: () => void;
  onShuttleStop?: () => void;
  onImportFiles?: (files: FileList | File[]) => void;
}

export const ProgramMonitor: React.FC<ProgramMonitorProps> = ({
  currentTime,
  duration,
  isPlaying,
  tracks,
  clips,
  mediaMap,
  fps = 30,
  inPoint,
  outPoint,
  loop,
  shuttleSpeed = 1,
  selectedClip,
  onUpdateClip,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onSetInPoint,
  onSetOutPoint,
  onToggleLoop,
  onShuttleForward,
  onShuttleReverse,
  onShuttleStop,
  onImportFiles,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const [showSafeMargins, setShowSafeMargins] = useState(false);
  const [showTransformOverlay, setShowTransformOverlay] = useState(true);
  const [zoomMode, setZoomMode] = useState<'fit' | '100%' | '50%'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const monitorDragCounterRef = useRef(0);

  // Interaction State for Canvas Handles Dragging
  const [activeHandle, setActiveHandle] = useState<{
    type: 'move' | 'scale' | 'rotate' | 'crop-top' | 'crop-bottom' | 'crop-left' | 'crop-right';
    corner?: 'tl' | 'tr' | 'bl' | 'br';
    startX: number;
    startY: number;
    origPosX: number;
    origPosY: number;
    origScale: number;
    origRotation: number;
    origCrop: { top: number; bottom: number; left: number; right: number };
    centerX: number;
    centerY: number;
  } | null>(null);

  // Measure canvas display bounds
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 960, height: 540 });

  const updateCanvasDimensions = useCallback(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, []);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions, zoomMode, isFullscreen]);

  // Render canvas whenever currentTime, tracks, clips, or media updates
  useEffect(() => {
    if (!canvasRef.current) return;
    renderTimelineFrame({
      canvas: canvasRef.current,
      currentTime,
      tracks,
      clips,
      mediaMap,
      showSafeMargins,
      renderWidth: 1920,
      renderHeight: 1080,
    });
    updateCanvasDimensions();
  }, [currentTime, tracks, clips, mediaMap, showSafeMargins, updateCanvasDimensions]);

  // Sync fullscreen state if user exits via Esc key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(updateCanvasDimensions, 50);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [updateCanvasDimensions]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Determine if active selected clip is visual & active
  const isVisualClip = selectedClip && selectedClip.type !== 'audio';
  const isClipInView = selectedClip && (currentTime >= selectedClip.startTime - 0.01 && currentTime <= selectedClip.startTime + selectedClip.duration + 0.01);

  // Global Mouse Move & Up Listeners for Canvas Transform Handles
  useEffect(() => {
    if (!activeHandle || !selectedClip || !onUpdateClip || !canvasRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const displayW = canvasDimensions.width || 960;
      const displayH = canvasDimensions.height || 540;
      const scaleX = 1920 / displayW;
      const scaleY = 1080 / displayH;

      if (activeHandle.type === 'move') {
        const dx = (e.clientX - activeHandle.startX) * scaleX;
        const dy = (e.clientY - activeHandle.startY) * scaleY;
        const newPosX = Math.round(activeHandle.origPosX + dx);
        const newPosY = Math.round(activeHandle.origPosY + dy);

        onUpdateClip({
          ...selectedClip,
          transform: {
            ...selectedClip.transform,
            positionX: newPosX,
            positionY: newPosY,
          },
        });
      } else if (activeHandle.type === 'scale') {
        const currentDist = Math.hypot(e.clientX - activeHandle.centerX, e.clientY - activeHandle.centerY);
        const startDist = Math.hypot(activeHandle.startX - activeHandle.centerX, activeHandle.startY - activeHandle.centerY);
        if (startDist > 0) {
          const factor = currentDist / startDist;
          const newScale = Math.max(0.1, Math.min(3.0, Math.round(activeHandle.origScale * factor * 100) / 100));
          onUpdateClip({
            ...selectedClip,
            transform: {
              ...selectedClip.transform,
              scale: newScale,
            },
          });
        }
      } else if (activeHandle.type === 'rotate') {
        const angleRad = Math.atan2(e.clientY - activeHandle.centerY, e.clientX - activeHandle.centerX);
        let angleDeg = Math.round(((angleRad * 180) / Math.PI) + 90);
        if (angleDeg > 180) angleDeg -= 360;
        if (angleDeg < -180) angleDeg += 360;
        
        // Snap to 15 degrees if Shift is held
        if (e.shiftKey) {
          angleDeg = Math.round(angleDeg / 15) * 15;
        }

        onUpdateClip({
          ...selectedClip,
          transform: {
            ...selectedClip.transform,
            rotation: angleDeg,
          },
        });
      } else if (activeHandle.type.startsWith('crop-')) {
        const crop = { ...activeHandle.origCrop };
        const dxPercent = ((e.clientX - activeHandle.startX) / displayW) * 100;
        const dyPercent = ((e.clientY - activeHandle.startY) / displayH) * 100;

        if (activeHandle.type === 'crop-left') {
          crop.left = Math.max(0, Math.min(48, Math.round(activeHandle.origCrop.left + dxPercent)));
        } else if (activeHandle.type === 'crop-right') {
          crop.right = Math.max(0, Math.min(48, Math.round(activeHandle.origCrop.right - dxPercent)));
        } else if (activeHandle.type === 'crop-top') {
          crop.top = Math.max(0, Math.min(48, Math.round(activeHandle.origCrop.top + dyPercent)));
        } else if (activeHandle.type === 'crop-bottom') {
          crop.bottom = Math.max(0, Math.min(48, Math.round(activeHandle.origCrop.bottom - dyPercent)));
        }

        onUpdateClip({
          ...selectedClip,
          transform: {
            ...selectedClip.transform,
            crop,
          },
        });
      }
    };

    const handleMouseUp = () => {
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle, selectedClip, onUpdateClip, canvasDimensions]);

  // Handle mousedown on interactive components
  const startDragHandle = (
    e: React.MouseEvent,
    type: 'move' | 'scale' | 'rotate' | 'crop-top' | 'crop-bottom' | 'crop-left' | 'crop-right',
    corner?: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedClip || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 + (selectedClip.transform.positionX * (rect.width / 1920));
    const centerY = rect.top + rect.height / 2 + (selectedClip.transform.positionY * (rect.height / 1080));

    setActiveHandle({
      type,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      origPosX: selectedClip.transform.positionX || 0,
      origPosY: selectedClip.transform.positionY || 0,
      origScale: selectedClip.transform.scale || 1,
      origRotation: selectedClip.transform.rotation || 0,
      origCrop: selectedClip.transform.crop || { top: 0, bottom: 0, left: 0, right: 0 },
      centerX,
      centerY,
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-[#0d1226] border border-[#1b254a] overflow-hidden select-none"
    >
      {/* Modern Header Bar */}
      <div className="h-8 bg-[#131b36] border-b border-[#1b254a] px-3 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-200">Program Monitor</span>
          <span className="text-neutral-600">•</span>
          <span className="text-[11px] text-neutral-400 bg-[#1b254a] px-2 py-0.5 rounded-full font-mono border border-sky-500/20">
            1920×1080 @ {fps}fps
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom / Scale Selector */}
          <select
            value={zoomMode}
            onChange={(e) => setZoomMode(e.target.value as 'fit' | '100%' | '50%')}
            className="bg-[#1b254a] text-neutral-300 text-xs px-2 py-1 rounded-md border border-[#28376e] outline-none cursor-pointer"
          >
            <option value="fit">Fit View</option>
            <option value="100%">100% Scale</option>
            <option value="50%">50% Scale</option>
          </select>

          {/* Safe Margins Toggle */}
          <button
            onClick={() => setShowSafeMargins(!showSafeMargins)}
            title="Toggle Broadcast Safe Title & Action Margins"
            className={`p-1.5 rounded-md border transition-all cursor-pointer ${
              showSafeMargins
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-400'
                : 'bg-[#1b1b22] border-[#272732] text-neutral-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Interactive Transform Handles Overlay Toggle */}
          <button
            onClick={() => setShowTransformOverlay(!showTransformOverlay)}
            title={showTransformOverlay ? 'Transform Handles ON (Move, Scale, Rotate, Crop)' : 'Transform Handles OFF'}
            className={`p-1.5 rounded-md border transition-all cursor-pointer ${
              showTransformOverlay && isVisualClip
                ? 'bg-sky-950/80 border-sky-400 text-sky-300 shadow-sm'
                : 'bg-[#1b1b22] border-[#272732] text-neutral-400 hover:text-white'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (`)"
            className="p-1.5 rounded-md bg-[#1b1b22] border border-[#272732] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport Canvas */}
      <div 
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            monitorDragCounterRef.current++;
            setIsDraggingOver(true);
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isDraggingOver) setIsDraggingOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            monitorDragCounterRef.current--;
            if (monitorDragCounterRef.current <= 0) {
              monitorDragCounterRef.current = 0;
              setIsDraggingOver(false);
            }
          }
        }}
        onDrop={(e) => {
          monitorDragCounterRef.current = 0;
          setIsDraggingOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            onImportFiles?.(e.dataTransfer.files);
          }
        }}
        className={`flex-1 relative flex items-center justify-center bg-black overflow-hidden p-2 transition-colors ${
          isDraggingOver ? 'bg-[#060b1c]' : ''
        }`}
      >
        {/* Subtle Dashed Border Overlay when dragging files over canvas */}
        {isDraggingOver && (
          <div className="absolute inset-3 z-30 flex flex-col items-center justify-center bg-[#07132e]/90 backdrop-blur-xs border-2 border-dashed border-sky-400 rounded-xl pointer-events-none animate-fadeIn transition-all p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400/60 flex items-center justify-center text-sky-300 mb-2">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <span className="text-white text-sm font-semibold tracking-wide">
              Drop Video, Audio, or Images Here
            </span>
            <span className="text-sky-300/80 text-xs mt-1">
              Directly loads assets into the project & preview monitor
            </span>
          </div>
        )}

        <div
          className={`relative transition-all ${
            zoomMode === 'fit' ? 'w-full h-full max-h-full flex items-center justify-center' : ''
          }`}
        >
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className={`aspect-video object-contain bg-black rounded shadow-2xl ${
              zoomMode === 'fit'
                ? 'max-h-full max-w-full'
                : zoomMode === '100%'
                ? 'w-[960px] h-[540px]'
                : 'w-[480px] h-[270px]'
            }`}
          />

          {/* Interactive Canvas Transform Handles & Overlay Controls */}
          {showTransformOverlay && isVisualClip && selectedClip && (
            <div
              className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-visible"
              style={{
                width: `${canvasDimensions.width}px`,
                height: `${canvasDimensions.height}px`,
                margin: 'auto',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              }}
            >
              {/* Scaled & Rotated Bounding Box Container */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${canvasDimensions.width}px`,
                  height: `${canvasDimensions.height}px`,
                  transform: `translate(-50%, -50%) translate(${
                    (selectedClip.transform.positionX || 0) * (canvasDimensions.width / 1920)
                  }px, ${
                    (selectedClip.transform.positionY || 0) * (canvasDimensions.height / 1080)
                  }px) rotate(${selectedClip.transform.rotation || 0}deg) scale(${
                    selectedClip.transform.scale || 1
                  })`,
                  transformOrigin: 'center center',
                  pointerEvents: 'auto',
                }}
                className="group select-none"
              >
                {/* Bounding Outline & Move Area */}
                <div 
                  onMouseDown={(e) => startDragHandle(e, 'move')}
                  className="w-full h-full border-2 border-sky-400/90 shadow-[0_0_14px_rgba(56,189,248,0.5)] cursor-move relative flex items-center justify-center hover:border-sky-300 transition-colors"
                >
                  {/* Center Anchor Crosshair */}
                  <div className="w-6 h-6 rounded-full bg-slate-950/80 border border-sky-400 flex items-center justify-center text-sky-300 pointer-events-none shadow-sm">
                    <Move className="w-3.5 h-3.5" />
                  </div>

                  {/* Crop Inset Visual Guide (if crop active) */}
                  {selectedClip.transform.crop && (
                    <div
                      style={{
                        top: `${selectedClip.transform.crop.top || 0}%`,
                        bottom: `${selectedClip.transform.crop.bottom || 0}%`,
                        left: `${selectedClip.transform.crop.left || 0}%`,
                        right: `${selectedClip.transform.crop.right || 0}%`,
                      }}
                      className="absolute border border-dashed border-amber-400 pointer-events-none bg-amber-400/5"
                    />
                  )}

                  {/* Top Rotation Stem & Circular Handle */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                    <div
                      onMouseDown={(e) => startDragHandle(e, 'rotate')}
                      title="Drag to Rotate (Hold Shift for 15° snap)"
                      className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform flex items-center justify-center"
                    >
                      <RotateCw className="w-2.5 h-2.5 text-slate-900 stroke-[3]" />
                    </div>
                    <div className="w-[1.5px] h-3 bg-sky-400 pointer-events-none" />
                  </div>

                  {/* 4 Corner Resize Handles */}
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'scale', 'tl')}
                    title="Scale Corner (Top-Left)"
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'scale', 'tr')}
                    title="Scale Corner (Top-Right)"
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'scale', 'bl')}
                    title="Scale Corner (Bottom-Left)"
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'scale', 'br')}
                    title="Scale Corner (Bottom-Right)"
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto"
                  />

                  {/* 4 Edge Crop Handles */}
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'crop-top')}
                    title="Crop Top Edge"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-2 bg-sky-400 border border-white rounded-full shadow-sm cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'crop-bottom')}
                    title="Crop Bottom Edge"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2 bg-sky-400 border border-white rounded-full shadow-sm cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'crop-left')}
                    title="Crop Left Edge"
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-5 bg-sky-400 border border-white rounded-full shadow-sm cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => startDragHandle(e, 'crop-right')}
                    title="Crop Right Edge"
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-5 bg-sky-400 border border-white rounded-full shadow-sm cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto"
                  />

                  {/* Floating Transform HUD Tooltip */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-950/90 backdrop-blur-md border border-sky-500/40 px-2 py-0.5 rounded text-[10px] font-mono text-sky-200 shadow-xl whitespace-nowrap flex items-center gap-2">
                    <span className="text-white font-bold">{selectedClip.name}</span>
                    <span className="text-slate-500">•</span>
                    <span>X: {selectedClip.transform.positionX || 0}px Y: {selectedClip.transform.positionY || 0}px</span>
                    <span className="text-slate-500">•</span>
                    <span>Scale: {Math.round((selectedClip.transform.scale || 1) * 100)}%</span>
                    <span className="text-slate-500">•</span>
                    <span>Rot: {selectedClip.transform.rotation || 0}°</span>
                    {selectedClip.transform.crop && (selectedClip.transform.crop.left > 0 || selectedClip.transform.crop.top > 0) && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="text-amber-300">Crop: {selectedClip.transform.crop.left}%L {selectedClip.transform.crop.top}%T</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Shuttle Speed HUD Overlay */}
          {isPlaying && shuttleSpeed !== 1 && (
            <div className="absolute top-3 right-3 pointer-events-none bg-black/85 backdrop-blur-md border border-neutral-700/80 px-2.5 py-1 rounded-md text-xs font-mono font-bold shadow-2xl flex items-center gap-1.5 animate-pulse z-20">
              <span className={shuttleSpeed < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {shuttleSpeed < 0 ? '◀◀' : '▶▶'}
              </span>
              <span className="text-white">
                {Math.abs(shuttleSpeed)}x {shuttleSpeed < 0 ? 'REVERSE' : 'FORWARD'}
              </span>
            </div>
          )}

          {/* Empty Sequence Prompt with Subtle Dashed Drop Zone */}
          {clips.length === 0 && !isDraggingOver && (
            <div className="absolute inset-4 flex flex-col items-center justify-center text-neutral-400 gap-2 bg-[#080d1e]/75 border border-dashed border-[#23315a] rounded-xl p-6 text-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-[#121a38] border border-[#23336c] flex items-center justify-center text-sky-400">
                <Upload className="w-5 h-5 stroke-[1.5]" />
              </div>
              <span className="text-neutral-200 text-sm font-semibold">Canvas Preview Ready</span>
              <span className="text-xs text-neutral-400 max-w-sm">
                Drag & drop footage directly onto this preview monitor, or double-click media in the Project Bin
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Player Transport & Scrubber Bar */}
      <div className="bg-[#0d1226] border-t border-[#1b254a] px-3 py-1.5 flex flex-col gap-1.5 shrink-0">
        {/* Scrubber Progress Bar */}
        <div
          className="relative h-2 bg-[#1c1c24] rounded-full cursor-pointer overflow-hidden group border border-[#272733]"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(pos * duration);
          }}
        >
          {/* In / Out visual range */}
          {inPoint !== null && outPoint !== null && (
            <div
              className="absolute top-0 bottom-0 bg-sky-500/35 border-l-2 border-r-2 border-sky-400"
              style={{
                left: `${(inPoint / duration) * 100}%`,
                width: `${((outPoint - inPoint) / duration) * 100}%`,
              }}
            />
          )}

          {/* Played progress fill */}
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-75 relative"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Transport Controls & Timecode */}
        <div className="flex items-center justify-between text-xs">
          {/* Timecode Badge */}
          <div className="flex items-center gap-1.5 font-mono">
            <span
              className="font-bold text-emerald-400 bg-black/80 px-2 py-0.5 rounded border border-emerald-500/25 text-xs shadow-xs"
              title="Current Timecode"
            >
              {formatTimecode(currentTime, fps)}
            </span>
            <span className="text-neutral-500 text-[11px]">
              / {formatTimecode(duration, fps)}
            </span>
          </div>

          {/* Center: Modern Transport Buttons */}
          <div className="flex items-center gap-1">
            {/* Mark In */}
            <button
              onClick={onSetInPoint}
              title="Mark In Point (I)"
              className="px-2 py-1 rounded bg-[#1c1c24] hover:bg-[#262632] border border-[#2d2d3a] text-neutral-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
            >
              [ In
            </button>

            {/* Mark Out */}
            <button
              onClick={onSetOutPoint}
              title="Mark Out Point (O)"
              className="px-2 py-1 rounded bg-[#1c1c24] hover:bg-[#262632] border border-[#2d2d3a] text-neutral-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
            >
              Out ]
            </button>

            <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

            {/* Jump to Beginning */}
            <button
              onClick={() => onSeek(0)}
              title="Go to Beginning (Home)"
              className="p-1.5 rounded-md hover:bg-[#1c1c24] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Step 1 Frame Back */}
            <button
              onClick={() => onStepFrame(-1)}
              title="Step Back 1 Frame (Left Arrow)"
              className="p-1.5 rounded-md hover:bg-[#1c1c24] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Modern Play / Pause Primary Button */}
            <button
              onClick={onTogglePlay}
              title="Play / Pause (Space)"
              className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-all cursor-pointer shadow-md mx-0.5"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black stroke-[2.5]" />
              ) : (
                <Play className="w-4 h-4 fill-black ml-0.5 stroke-[2.5]" />
              )}
            </button>

            {/* Step 1 Frame Forward */}
            <button
              onClick={() => onStepFrame(1)}
              title="Step Forward 1 Frame (Right Arrow)"
              className="p-1.5 rounded-md hover:bg-[#1c1c24] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Jump to End */}
            <button
              onClick={() => onSeek(duration)}
              title="Go to End (End)"
              className="p-1.5 rounded-md hover:bg-[#1c1c24] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

            {/* Loop Toggle */}
            <button
              onClick={onToggleLoop}
              title={loop ? 'Looping is ON' : 'Looping is OFF'}
              className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                loop
                  ? 'bg-sky-950/60 border-sky-500/40 text-sky-400'
                  : 'bg-[#1c1c24] border-[#2d2d3a] text-neutral-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* J-K-L Shuttle Controls & Active Speed Indicator */}
          <div className="flex items-center gap-1.5">
            {isPlaying && shuttleSpeed !== 1 && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border animate-pulse ${
                  shuttleSpeed < 0
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                }`}
              >
                <span>{shuttleSpeed < 0 ? '◀◀' : '▶▶'}</span>
                <span>{Math.abs(shuttleSpeed)}x</span>
              </span>
            )}

            <div className="flex items-center bg-[#171720] rounded border border-[#272733] p-0.5 font-mono text-[10px]">
              <button
                onClick={() => onShuttleReverse?.()}
                title="Shuttle Reverse (J: -1x, -2x, -4x)"
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  isPlaying && shuttleSpeed < 0
                    ? 'bg-rose-500 text-black font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                J
              </button>
              <button
                onClick={() => onShuttleStop?.()}
                title="Shuttle Stop (K: Pause / Stop)"
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  !isPlaying
                    ? 'bg-neutral-700 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                K
              </button>
              <button
                onClick={() => onShuttleForward?.()}
                title="Shuttle Forward (L: 1x, 2x, 4x)"
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  isPlaying && shuttleSpeed > 0
                    ? 'bg-emerald-500 text-black font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                L
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
