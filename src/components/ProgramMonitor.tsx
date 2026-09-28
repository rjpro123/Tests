import React, { useRef, useEffect, useState } from 'react';
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
  Upload
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
  const [showSafeMargins, setShowSafeMargins] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | '100%' | '50%'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const monitorDragCounterRef = useRef(0);

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
  }, [currentTime, tracks, clips, mediaMap, showSafeMargins]);

  // Sync fullscreen state if user exits via Esc key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
