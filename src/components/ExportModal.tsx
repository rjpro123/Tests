import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Download, 
  Film, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Image as ImageIcon,
  Clock,
  Sparkles,
  HardDrive,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronRight,
  ChevronDown,
  ListPlus,
  PlayCircle,
  FolderOpen,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  Maximize2,
  Trash2,
  Share2,
  UploadCloud
} from 'lucide-react';
import { Clip, MediaItem, Track } from '../types/editor';
import { exportSequenceVideo, ExportProgress, ExportConfig } from '../utils/exporter';
import { formatTimecode } from '../utils/timecode';
import { renderTimelineFrame } from '../utils/compositor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  duration: number;
  tracks: Track[];
  clips: Clip[];
  mediaMap: Map<string, MediaItem>;
  currentTime?: number;
  inPoint?: number | null;
  outPoint?: number | null;
}

interface QueueItem {
  id: string;
  name: string;
  format: string;
  preset: string;
  resolution: string;
  fps: number;
  status: 'ready' | 'encoding' | 'done' | 'error';
  progress: number;
  config: ExportConfig;
  downloadUrl?: string;
  fileSize?: string;
  addedAt: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  duration,
  tracks,
  clips,
  mediaMap,
  currentTime = 0,
  inPoint = null,
  outPoint = null,
}) => {
  // Navigation tabs in export modal (Adobe Media Encoder Inspector Tabs)
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'effects' | 'publish' | 'queue'>('video');

  // Format & Container
  const [format, setFormat] = useState<'h264' | 'hevc' | 'webm' | 'prores' | 'frame-png' | 'audio-only'>('h264');

  // Resolution Preset or Custom
  const [presetKey, setPresetKey] = useState<string>('match-source-high');
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);

  // Framerate
  const [fps, setFps] = useState<number>(30);
  const [matchSourceFps, setMatchSourceFps] = useState<boolean>(true);

  // Bitrate Encoding
  const [bitrateEncoding, setBitrateEncoding] = useState<'vbr1' | 'vbr2' | 'cbr'>('vbr1');
  const [targetBitrateMbps, setTargetBitrateMbps] = useState<number>(12);
  const [maxBitrateMbps, setMaxBitrateMbps] = useState<number>(16);

  // Export Range Scope
  const [rangeMode, setRangeMode] = useState<'entire' | 'in-out' | 'current-frame'>('entire');

  // Audio Settings
  const [includeVideo, setIncludeVideo] = useState<boolean>(true);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [audioSampleRate, setAudioSampleRate] = useState<44100 | 48000>(48000);
  const [audioBitrateKbps, setAudioBitrateKbps] = useState<number>(320);

  // Effects & Metadata
  const [burnInTimecode, setBurnInTimecode] = useState<boolean>(false);
  const [timecodePosition, setTimecodePosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [renderMaxDepth, setRenderMaxDepth] = useState<boolean>(true);
  const [useMaxQuality, setUseMaxQuality] = useState<boolean>(true);
  const [loudnessNormalize, setLoudnessNormalize] = useState<boolean>(false);

  // Output filename & path
  const [fileName, setFileName] = useState<string>(`CineFlow_Master_${new Date().toISOString().slice(0, 10)}`);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  // Preview monitor playback & scrubbing
  const [previewTime, setPreviewTime] = useState<number>(currentTime);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewViewMode, setPreviewViewMode] = useState<'source' | 'output'>('output');
  const [previewZoom, setPreviewZoom] = useState<'fit' | '100%' | '50%'>('fit');
  const [showSafeMargins, setShowSafeMargins] = useState<boolean>(false);

  // Local Queue Management (Adobe Media Encoder Queue simulation)
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);

  // Progress state for direct export
  const [progress, setProgress] = useState<ExportProgress>({
    percent: 0,
    currentFrame: 0,
    totalFrames: 0,
    status: 'idle',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewAnimRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Presets definition
  const amePresets: Record<string, { label: string; format: 'h264' | 'hevc' | 'webm' | 'prores' | 'frame-png' | 'audio-only'; width: number; height: number; fps: number; bitrate: number; desc: string }> = {
    'match-source-high': { label: 'Match Source - High bitrate', format: 'h264', width: 1920, height: 1080, fps: 30, bitrate: 16, desc: 'Highest quality H.264 matching sequence settings' },
    'match-source-med': { label: 'Match Source - Adaptive Medium bitrate', format: 'h264', width: 1920, height: 1080, fps: 30, bitrate: 10, desc: 'Balanced compression for web streaming & sharing' },
    'yt-4k': { label: 'YouTube 2160p 4K Ultra HD', format: 'h264', width: 3840, height: 2160, fps: 30, bitrate: 35, desc: 'Optimized 4K UHD YouTube upload profile' },
    'yt-1080p': { label: 'YouTube 1080p Full HD', format: 'h264', width: 1920, height: 1080, fps: 30, bitrate: 12, desc: 'Standard 1080p Full HD YouTube upload profile' },
    'social-reels': { label: 'TikTok & Instagram Reels (9:16 1080x1920)', format: 'h264', width: 1080, height: 1920, fps: 30, bitrate: 14, desc: 'Vertical high-motion profile for Reels, TikTok, Shorts' },
    'social-square': { label: 'Instagram Square (1:1 1080x1080)', format: 'h264', width: 1080, height: 1080, fps: 30, bitrate: 10, desc: 'Square 1080x1080 social media feed video' },
    'webm-vp9': { label: 'WebM VP9 Broadcast (High Efficiency)', format: 'webm', width: 1920, height: 1080, fps: 30, bitrate: 8, desc: 'Open-source WebM VP9/Opus streaming format' },
    'prores-422': { label: 'Apple ProRes 422 Master (.mov)', format: 'prores', width: 1920, height: 1080, fps: 30, bitrate: 45, desc: 'Studio archival post-production editing master' },
    'png-still': { label: 'PNG Still Frame (Current Playhead)', format: 'frame-png', width: 1920, height: 1080, fps: 30, bitrate: 0, desc: 'Lossless PNG image snapshot of timeline' },
    'audio-wav': { label: 'Waveform Audio Master (48kHz 24-bit)', format: 'audio-only', width: 1920, height: 1080, fps: 30, bitrate: 0, desc: 'Uncompressed stereo audio master mixdown' },
    'custom': { label: 'Custom User Settings...', format: 'h264', width: customWidth, height: customHeight, fps: fps, bitrate: targetBitrateMbps, desc: 'User-customized encoder parameters' },
  };

  // Apply Preset Selection
  const handleSelectPreset = (key: string) => {
    setPresetKey(key);
    if (key !== 'custom' && amePresets[key]) {
      const p = amePresets[key];
      setFormat(p.format);
      setCustomWidth(p.width);
      setCustomHeight(p.height);
      if (!matchSourceFps) setFps(p.fps);
      if (p.bitrate > 0) {
        setTargetBitrateMbps(p.bitrate);
        setMaxBitrateMbps(Math.round(p.bitrate * 1.3));
      }
      if (p.format === 'frame-png') {
        setRangeMode('current-frame');
      } else if (rangeMode === 'current-frame') {
        setRangeMode('entire');
      }
    }
  };

  // Compute active target dimensions
  const activeWidth = presetKey === 'custom' ? customWidth : (amePresets[presetKey]?.width || 1920);
  const activeHeight = presetKey === 'custom' ? customHeight : (amePresets[presetKey]?.height || 1080);

  // Compute active export time range
  const { exportStart, exportEnd, effectiveDuration } = useMemo(() => {
    if (rangeMode === 'current-frame' || format === 'frame-png') {
      return { exportStart: previewTime, exportEnd: previewTime + (1 / fps), effectiveDuration: 1 / fps };
    }
    if (rangeMode === 'in-out' && inPoint !== null && outPoint !== null && outPoint > inPoint) {
      return { exportStart: inPoint, exportEnd: outPoint, effectiveDuration: outPoint - inPoint };
    }
    return { exportStart: 0, exportEnd: duration, effectiveDuration: duration };
  }, [rangeMode, inPoint, outPoint, previewTime, duration, fps, format]);

  // Estimated file size calculation
  const estimatedSizeMb = useMemo(() => {
    if (format === 'frame-png') return '~2.4 MB (Lossless PNG)';
    if (format === 'audio-only') {
      const audioBytes = (audioBitrateKbps * 1000 * effectiveDuration) / 8;
      return `~${(audioBytes / (1024 * 1024)).toFixed(1)} MB (Audio)`;
    }
    const totalBps = (targetBitrateMbps * 1_000_000) + (includeAudio ? audioBitrateKbps * 1000 : 0);
    const totalBytes = (totalBps * effectiveDuration) / 8;
    return `~${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [targetBitrateMbps, effectiveDuration, format, includeAudio, audioBitrateKbps]);

  // Render preview frame to canvas
  const renderPreview = useCallback(() => {
    if (!canvasRef.current) return;
    renderTimelineFrame({
      canvas: canvasRef.current,
      currentTime: previewTime,
      tracks,
      clips,
      mediaMap,
      showSafeMargins,
      renderWidth: activeWidth,
      renderHeight: activeHeight,
    });
  }, [previewTime, tracks, clips, mediaMap, showSafeMargins, activeWidth, activeHeight]);

  // Redraw preview whenever time, canvas, tracks, clips change
  useEffect(() => {
    if (isOpen) {
      renderPreview();
    }
  }, [isOpen, previewTime, renderPreview, activeWidth, activeHeight, showSafeMargins]);

  // Preview Playback Loop
  useEffect(() => {
    if (!isPreviewPlaying) {
      if (previewAnimRef.current) cancelAnimationFrame(previewAnimRef.current);
      return;
    }

    lastTimeRef.current = performance.now();
    const loop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setPreviewTime((prev) => {
        let next = prev + delta;
        if (rangeMode === 'in-out' && inPoint !== null && outPoint !== null) {
          if (next >= outPoint) next = inPoint;
        } else if (next >= duration) {
          next = 0;
        }
        return next;
      });

      previewAnimRef.current = requestAnimationFrame(loop);
    };

    previewAnimRef.current = requestAnimationFrame(loop);
    return () => {
      if (previewAnimRef.current) cancelAnimationFrame(previewAnimRef.current);
    };
  }, [isPreviewPlaying, duration, inPoint, outPoint, rangeMode]);

  // Build config object
  const buildExportConfig = (): ExportConfig => {
    const isSingleFrame = rangeMode === 'current-frame' || format === 'frame-png';
    const chosenFormat = isSingleFrame 
      ? 'frame-png' 
      : (format === 'audio-only' ? 'audio-only' : (format === 'webm' ? 'webm' : 'mp4'));

    return {
      format: chosenFormat,
      width: activeWidth,
      height: activeHeight,
      fps,
      bitrate: targetBitrateMbps * 1_000_000,
      startTime: exportStart,
      endTime: exportEnd,
      fileName: fileName.trim() || 'CineFlow_Render',
      burnInTimecode,
      includeAudio: includeAudio && !isSingleFrame,
      audioSampleRate,
    };
  };

  // Direct Export Handler
  const handleStartExport = async () => {
    const config = buildExportConfig();
    setProgress({
      percent: 0,
      currentFrame: 0,
      totalFrames: Math.max(1, Math.floor(effectiveDuration * fps)),
      status: 'rendering',
    });

    try {
      await exportSequenceVideo(tracks, clips, mediaMap, config, (p) => setProgress(p));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        error: errMsg || 'Export rendering failed',
      }));
    }
  };

  // Add to Adobe Media Encoder Queue
  const handleAddToQueue = () => {
    const config = buildExportConfig();
    const newItem: QueueItem = {
      id: `ame_job_${Date.now()}`,
      name: fileName,
      format: format.toUpperCase(),
      preset: amePresets[presetKey]?.label || 'Custom',
      resolution: `${activeWidth}×${activeHeight}`,
      fps,
      status: 'ready',
      progress: 0,
      config,
      addedAt: new Date().toLocaleTimeString(),
    };
    setQueue((prev) => [...prev, newItem]);
    setActiveTab('queue');
  };

  // Process AME Queue
  const handleProcessQueue = async () => {
    if (isProcessingQueue || queue.length === 0) return;
    setIsProcessingQueue(true);

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'done') continue;

      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'encoding', progress: 0 } : item
        )
      );

      try {
        const item = queue[i];
        await exportSequenceVideo(
          tracks,
          clips,
          mediaMap,
          item.config,
          (p) => {
            setQueue((prev) =>
              prev.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      progress: p.percent,
                      status: p.status === 'completed' ? 'done' : 'encoding',
                      downloadUrl: p.downloadUrl || it.downloadUrl,
                      fileSize: p.fileSizeEstimate || it.fileSize,
                    }
                  : it
              )
            );
          }
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error' } : item
          )
        );
      }
    }

    setIsProcessingQueue(false);
  };

  if (!isOpen) return null;

  const isRendering = progress.status === 'rendering' || progress.status === 'encoding';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none font-sans text-xs animate-in fade-in duration-150">
      {/* Main Adobe Media Encoder Window */}
      <div className="bg-[#0b1021] border border-[#1e2a52] shadow-2xl rounded-lg w-full max-w-6xl overflow-hidden flex flex-col h-[92vh] text-neutral-200">
        
        {/* Adobe Media Encoder Header Bar */}
        <div className="h-10 bg-[#0d142b] border-b border-[#1b254a] px-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Iconic AME Brand Emblem */}
            <div className="w-6 h-6 rounded bg-[#2a134a] border border-[#6b21a8]/60 flex items-center justify-center text-white font-bold text-[11px] shadow-sm tracking-tight text-fuchsia-300">
              Me
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight">Export Settings</span>
              <span className="text-neutral-500 font-normal text-xs">—</span>
              <span className="text-neutral-300 font-medium text-xs truncate max-w-[280px]">
                {fileName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#152042] text-sky-400 border border-sky-500/30">
              AME Engine v2026.4
            </span>
            {!isRendering && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded hover:bg-[#1a254c] text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Export Settings (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Split Layout: Left Preview Monitor + Right Inspector Panel */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: Adobe Export Preview Monitor */}
          <div className="flex-1 lg:w-[48%] flex flex-col bg-[#070a14] border-b lg:border-b-0 lg:border-r border-[#1b254a] overflow-hidden">
            {/* Monitor Header Toolbar */}
            <div className="h-8 bg-[#0d142b] border-b border-[#1b254a] px-3 flex items-center justify-between text-xs text-neutral-400 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex bg-[#131b36] p-0.5 rounded border border-[#1e2a52]">
                  <button
                    onClick={() => setPreviewViewMode('output')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      previewViewMode === 'output'
                        ? 'bg-sky-500 text-black font-bold shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Output Preview
                  </button>
                  <button
                    onClick={() => setPreviewViewMode('source')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      previewViewMode === 'source'
                        ? 'bg-sky-500 text-black font-bold shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Source Comparison
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {/* Scale / Zoom mode */}
                <select
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(e.target.value as any)}
                  className="bg-[#131b36] text-neutral-300 text-[10px] px-2 py-0.5 rounded border border-[#1e2a52] outline-none cursor-pointer"
                >
                  <option value="fit">Fit View</option>
                  <option value="100%">100% Full Pixel</option>
                  <option value="50%">50% Scale</option>
                </select>

                {/* Safe Margins */}
                <button
                  onClick={() => setShowSafeMargins(!showSafeMargins)}
                  title="Toggle Safe Margins / Title Guides"
                  className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
                    showSafeMargins
                      ? 'bg-sky-950/80 border-sky-400 text-sky-300 font-bold'
                      : 'bg-[#131b36] border-[#1e2a52] text-neutral-400 hover:text-white'
                  }`}
                >
                  Safe Guides
                </button>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-[#05070d]">
              <div
                className={`relative flex items-center justify-center transition-all ${
                  previewZoom === 'fit' ? 'max-w-full max-h-full' : ''
                }`}
                style={{
                  width: previewZoom === '100%' ? `${activeWidth}px` : previewZoom === '50%' ? `${activeWidth * 0.5}px` : '100%',
                  height: previewZoom === '100%' ? `${activeHeight}px` : previewZoom === '50%' ? `${activeHeight * 0.5}px` : '100%',
                  aspectRatio: `${activeWidth} / ${activeHeight}`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain rounded-xs shadow-2xl border border-[#1b254a]/80"
                />

                {/* Burn-in Timecode Simulation Overlay in Preview */}
                {burnInTimecode && (
                  <div
                    className={`absolute p-1 font-mono text-[10px] tracking-widest text-neutral-100 bg-black/85 border border-white/20 rounded shadow-md pointer-events-none ${
                      timecodePosition === 'bottom-center'
                        ? 'bottom-3 left-1/2 -translate-x-1/2'
                        : timecodePosition === 'bottom-right'
                        ? 'bottom-3 right-3'
                        : 'top-3 right-3'
                    }`}
                  >
                    TC: {formatTimecode(previewTime, fps)}
                  </div>
                )}
              </div>
            </div>

            {/* Scrubber & In/Out Range Bar */}
            <div className="h-14 bg-[#0d142b] border-t border-[#1b254a] px-3 py-1.5 flex flex-col justify-between shrink-0">
              {/* Timeline Track Slider */}
              <div className="relative flex items-center group/scrub">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0.1, duration)}
                  step="0.033"
                  value={previewTime}
                  onChange={(e) => {
                    setIsPreviewPlaying(false);
                    setPreviewTime(parseFloat(e.target.value));
                  }}
                  className="w-full h-1.5 bg-[#172040] rounded-lg appearance-none cursor-pointer accent-sky-400"
                />

                {/* In / Out Visual Marks on bar */}
                {inPoint !== null && (
                  <div
                    style={{ left: `${(inPoint / Math.max(0.1, duration)) * 100}%` }}
                    className="absolute top-0 w-1 h-3 bg-cyan-400 pointer-events-none -translate-x-1/2"
                    title={`In Point: ${formatTimecode(inPoint, fps)}`}
                  />
                )}
                {outPoint !== null && (
                  <div
                    style={{ left: `${(outPoint / Math.max(0.1, duration)) * 100}%` }}
                    className="absolute top-0 w-1 h-3 bg-cyan-400 pointer-events-none -translate-x-1/2"
                    title={`Out Point: ${formatTimecode(outPoint, fps)}`}
                  />
                )}
              </div>

              {/* Transport Buttons & Timecode Indicators */}
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewTime((prev) => Math.max(0, prev - 1 / fps));
                    }}
                    title="Step 1 Frame Back (Left Arrow)"
                    className="p-1 rounded hover:bg-[#1a254c] text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                    title={isPreviewPlaying ? 'Pause Preview (Space)' : 'Play Preview (Space)'}
                    className="px-2 py-0.5 rounded bg-[#18234a] hover:bg-[#202f64] text-sky-400 hover:text-sky-300 border border-[#25356e] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isPreviewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-sky-400" />}
                    <span>{isPreviewPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewTime((prev) => Math.min(duration, prev + 1 / fps));
                    }}
                    title="Step 1 Frame Forward (Right Arrow)"
                    className="p-1 rounded hover:bg-[#1a254c] text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-neutral-400">
                    Playhead: <strong className="text-sky-300">{formatTimecode(previewTime, fps)}</strong>
                  </span>
                  <span className="text-neutral-500">/</span>
                  <span className="text-neutral-400">
                    Duration: <strong className="text-neutral-200">{formatTimecode(effectiveDuration, fps)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Adobe Media Encoder Inspector & Settings Panel */}
          <div className="flex-1 lg:w-[52%] flex flex-col bg-[#0b1021] overflow-hidden">
            
            {/* Top Format & Preset Bar */}
            <div className="p-3.5 bg-[#0e1630] border-b border-[#1b254a] space-y-3 shrink-0">
              
              {/* Preset & Format Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Format dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">
                    FORMAT
                  </label>
                  <select
                    disabled={isRendering}
                    value={format}
                    onChange={(e) => {
                      const f = e.target.value as any;
                      setFormat(f);
                      if (f === 'frame-png') {
                        setPresetKey('png-still');
                        setRangeMode('current-frame');
                      } else if (f === 'audio-only') {
                        setPresetKey('audio-wav');
                      }
                    }}
                    className="w-full bg-[#131d3d] text-white font-medium px-2.5 py-1.5 rounded border border-[#202f64] focus:border-sky-500 outline-none text-xs cursor-pointer shadow-xs"
                  >
                    <option value="h264">H.264 (.mp4)</option>
                    <option value="hevc">HEVC / H.265 (.mp4)</option>
                    <option value="webm">WebM (VP9 / Opus)</option>
                    <option value="prores">Apple ProRes / QuickTime (.mov)</option>
                    <option value="frame-png">PNG Still Frame / Image (.png)</option>
                    <option value="audio-only">Waveform Audio (.wav / .mp3)</option>
                  </select>
                </div>

                {/* Preset dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">
                    PRESET
                  </label>
                  <select
                    disabled={isRendering}
                    value={presetKey}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full bg-[#131d3d] text-white font-medium px-2.5 py-1.5 rounded border border-[#202f64] focus:border-sky-500 outline-none text-xs cursor-pointer shadow-xs"
                  >
                    <optgroup label="Sequence Match">
                      <option value="match-source-high">Match Source - High bitrate</option>
                      <option value="match-source-med">Match Source - Adaptive Medium bitrate</option>
                    </optgroup>
                    <optgroup label="Web & Social Platforms">
                      <option value="yt-4k">YouTube 2160p 4K Ultra HD</option>
                      <option value="yt-1080p">YouTube 1080p Full HD</option>
                      <option value="social-reels">TikTok & Instagram Reels (9:16)</option>
                      <option value="social-square">Instagram Square (1:1)</option>
                      <option value="webm-vp9">WebM VP9 High Efficiency</option>
                    </optgroup>
                    <optgroup label="Broadcast & Master">
                      <option value="prores-422">Apple ProRes 422 HQ Master</option>
                      <option value="png-still">PNG Still Frame (Current Playhead)</option>
                      <option value="audio-wav">Waveform Audio Master (WAV)</option>
                    </optgroup>
                    <optgroup label="Custom">
                      <option value="custom">Custom Configuration...</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Output Name Link & Checkboxes */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#1b254a]/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-semibold text-neutral-400">Output Name:</span>
                  {isEditingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                        className="bg-[#152042] text-white px-2 py-0.5 rounded border border-sky-400 text-xs outline-none font-mono"
                      />
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      title="Click to rename export file"
                      className="text-sky-400 hover:text-sky-300 font-mono text-xs underline cursor-pointer truncate max-w-[240px] text-left"
                    >
                      {fileName}.{format === 'frame-png' ? 'png' : format === 'prores' ? 'mov' : format === 'audio-only' ? 'wav' : format === 'webm' ? 'webm' : 'mp4'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                    <input
                      type="checkbox"
                      checked={includeVideo}
                      onChange={(e) => setIncludeVideo(e.target.checked)}
                      disabled={isRendering || format === 'audio-only'}
                      className="accent-sky-500 rounded"
                    />
                    <span>Export Video</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                    <input
                      type="checkbox"
                      checked={includeAudio}
                      onChange={(e) => setIncludeAudio(e.target.checked)}
                      disabled={isRendering || format === 'frame-png'}
                      className="accent-sky-500 rounded"
                    />
                    <span>Export Audio</span>
                  </label>
                </div>
              </div>

              {/* Adobe Classic Summary Box */}
              <div className="bg-[#080d1c] p-2.5 rounded border border-[#1a254c] text-[10px] space-y-1 font-mono">
                <div className="flex gap-2">
                  <span className="text-neutral-500 shrink-0 font-bold">Source:</span>
                  <span className="text-neutral-300 truncate">
                    Sequence 01, 1920×1080 (1.0), 30 fps, Progressive, {formatTimecode(duration, fps)}, 48000 Hz, Stereo
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-sky-400 shrink-0 font-bold">Output:</span>
                  <span className="text-neutral-200 truncate">
                    {activeWidth}×{activeHeight}, {fps} fps, Progressive, VBR {targetBitrateMbps.toFixed(1)} Mbps, {includeAudio ? `AAC ${audioBitrateKbps} kbps, ${audioSampleRate / 1000} kHz` : 'Audio Muted'}
                  </span>
                </div>
              </div>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex items-center border-b border-[#1b254a] bg-[#0c1228] px-2 pt-1 gap-1 shrink-0 overflow-x-auto text-xs">
              {[
                { id: 'video', label: 'Video' },
                { id: 'audio', label: 'Audio' },
                { id: 'effects', label: 'Effects' },
                { id: 'publish', label: 'Publish & Cloud' },
                { id: 'queue', label: `Queue (${queue.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-t font-medium transition-colors cursor-pointer whitespace-nowrap text-xs ${
                    activeTab === tab.id
                      ? 'bg-[#152042] text-sky-400 border-t-2 border-sky-400 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#101833]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body Contents */}
            <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1 text-xs bg-[#0b1021]">
              
              {/* TAB 1: VIDEO SETTINGS */}
              {activeTab === 'video' && (
                <div className="space-y-3.5">
                  {/* Basic Video Settings Group */}
                  <div className="bg-[#0e1630] p-3 rounded-lg border border-[#1b254a] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-200 text-xs">Basic Video Settings</span>
                      <button
                        onClick={() => {
                          setCustomWidth(1920);
                          setCustomHeight(1080);
                          setPresetKey('match-source-high');
                        }}
                        className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        Match Source
                      </button>
                    </div>

                    {/* Frame Size Width / Height with Lock Aspect Ratio */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Frame Size</span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {activeWidth} × {activeHeight} ({lockAspectRatio ? 'Locked Aspect' : 'Custom'})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-500 block mb-0.5">WIDTH (PIXELS)</label>
                          <input
                            type="number"
                            min="320"
                            max="7680"
                            step="2"
                            value={customWidth}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1920;
                              setCustomWidth(val);
                              setPresetKey('custom');
                              if (lockAspectRatio) {
                                setCustomHeight(Math.round((val * 9) / 16));
                              }
                            }}
                            className="w-full bg-[#131d3d] text-white px-2.5 py-1 rounded border border-[#202f64] font-mono text-xs outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-neutral-500 block mb-0.5">HEIGHT (PIXELS)</label>
                          <input
                            type="number"
                            min="240"
                            max="4320"
                            step="2"
                            value={customHeight}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1080;
                              setCustomHeight(val);
                              setPresetKey('custom');
                              if (lockAspectRatio) {
                                setCustomWidth(Math.round((val * 16) / 9));
                              }
                            }}
                            className="w-full bg-[#131d3d] text-white px-2.5 py-1 rounded border border-[#202f64] font-mono text-xs outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Lock Aspect Ratio & Presets */}
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <button
                          onClick={() => setLockAspectRatio(!lockAspectRatio)}
                          className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                        >
                          {lockAspectRatio ? <Lock className="w-3 h-3 text-sky-400" /> : <Unlock className="w-3 h-3 text-neutral-500" />}
                          <span>Lock 16:9 Aspect Ratio</span>
                        </button>

                        <div className="flex gap-1">
                          {['1080p', '4K', '9:16', '1:1'].map((preset) => (
                            <button
                              key={preset}
                              onClick={() => {
                                if (preset === '1080p') { setCustomWidth(1920); setCustomHeight(1080); }
                                if (preset === '4K') { setCustomWidth(3840); setCustomHeight(2160); }
                                if (preset === '9:16') { setCustomWidth(1080); setCustomHeight(1920); }
                                if (preset === '1:1') { setCustomWidth(1080); setCustomHeight(1080); }
                                setPresetKey('custom');
                              }}
                              className="px-1.5 py-0.5 bg-[#172247] hover:bg-[#202f63] rounded border border-[#25356e] text-[9px] text-neutral-300 cursor-pointer"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Frame Rate Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 block">FRAME RATE (FPS)</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[24, 25, 30, 50, 60].map((f) => (
                          <button
                            key={f}
                            onClick={() => {
                              setFps(f);
                              setMatchSourceFps(false);
                            }}
                            className={`py-1 rounded border text-center font-mono cursor-pointer transition-colors ${
                              fps === f
                                ? 'bg-sky-500 text-black font-bold border-sky-400'
                                : 'bg-[#131d3d] border-[#202f64] text-neutral-300 hover:bg-[#1a2752]'
                            }`}
                          >
                            {f} fps
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Field Order & Pixel Aspect */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
                      <div>
                        <span className="block text-neutral-500 text-[9px]">FIELD ORDER</span>
                        <span className="text-neutral-200 font-mono">Progressive (No Interlace)</span>
                      </div>
                      <div>
                        <span className="block text-neutral-500 text-[9px]">ASPECT</span>
                        <span className="text-neutral-200 font-mono">Square Pixels (1.0)</span>
                      </div>
                    </div>
                  </div>

                  {/* Bitrate & Encoding Settings Group */}
                  <div className="bg-[#0e1630] p-3 rounded-lg border border-[#1b254a] space-y-3">
                    <span className="font-bold text-neutral-200 text-xs block">Bitrate Settings</span>

                    {/* Bitrate Encoding Mode */}
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 block mb-1">
                        BITRATE ENCODING
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'vbr1', label: 'VBR, 1 Pass', desc: 'Fast render' },
                          { id: 'vbr2', label: 'VBR, 2 Pass', desc: 'Highest quality' },
                          { id: 'cbr', label: 'CBR', desc: 'Constant rate' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setBitrateEncoding(m.id as any)}
                            className={`p-1.5 rounded border text-left cursor-pointer transition-colors ${
                              bitrateEncoding === m.id
                                ? 'bg-[#1a285c] border-sky-400 text-white font-bold'
                                : 'bg-[#131d3d] border-[#202f64] text-neutral-400 hover:bg-[#18244d]'
                            }`}
                          >
                            <div className="text-[10px] font-semibold">{m.label}</div>
                            <div className="text-[8px] text-neutral-500">{m.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Bitrate Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300">Target Bitrate [Mbps]</span>
                        <span className="font-mono font-bold text-sky-400">{targetBitrateMbps.toFixed(1)} Mbps</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="40"
                        step="0.5"
                        value={targetBitrateMbps}
                        onChange={(e) => setTargetBitrateMbps(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#172040] rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Maximum Bitrate Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300">Maximum Bitrate [Mbps]</span>
                        <span className="font-mono font-bold text-sky-400">{maxBitrateMbps.toFixed(1)} Mbps</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="60"
                        step="1"
                        value={maxBitrateMbps}
                        onChange={(e) => setMaxBitrateMbps(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#172040] rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Checkbox Options */}
                    <div className="space-y-1.5 pt-1 text-[11px]">
                      <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                        <input
                          type="checkbox"
                          checked={renderMaxDepth}
                          onChange={(e) => setRenderMaxDepth(e.target.checked)}
                          className="accent-sky-500 rounded"
                        />
                        <span>Render at Maximum Depth (32-bit floating point color)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                        <input
                          type="checkbox"
                          checked={useMaxQuality}
                          onChange={(e) => setUseMaxQuality(e.target.checked)}
                          className="accent-sky-500 rounded"
                        />
                        <span>Use Maximum Render Quality & Bicubic Resampling</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AUDIO SETTINGS */}
              {activeTab === 'audio' && (
                <div className="bg-[#0e1630] p-3 rounded-lg border border-[#1b254a] space-y-3.5">
                  <span className="font-bold text-neutral-200 text-xs block">Audio Format & Mixdown</span>

                  {/* Audio Codec & Sample Rate */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 block mb-1">
                        AUDIO CODEC / CONTAINER
                      </label>
                      <select className="w-full bg-[#131d3d] text-white px-2.5 py-1.5 rounded border border-[#202f64] outline-none text-xs">
                        <option>AAC (Advanced Audio Coding - High Fidelity)</option>
                        <option>Opus Low-Latency Audio</option>
                        <option>Uncompressed Linear PCM (24-bit)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 block mb-1">
                        SAMPLE RATE
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { rate: 48000, label: '48,000 Hz', desc: 'Broadcast Cinema Standard' },
                          { rate: 44100, label: '44,100 Hz', desc: 'Standard CD / Web Audio' },
                        ].map((s) => (
                          <button
                            key={s.rate}
                            onClick={() => setAudioSampleRate(s.rate as any)}
                            className={`p-2 rounded border text-left cursor-pointer transition-colors ${
                              audioSampleRate === s.rate
                                ? 'bg-[#1a285c] border-sky-400 text-white font-bold'
                                : 'bg-[#131d3d] border-[#202f64] text-neutral-400 hover:bg-[#18244d]'
                            }`}
                          >
                            <div className="text-[11px] font-semibold">{s.label}</div>
                            <div className="text-[9px] text-neutral-500">{s.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 block mb-1">
                        CHANNELS & BITRATE
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[192, 256, 320].map((kbps) => (
                          <button
                            key={kbps}
                            onClick={() => setAudioBitrateKbps(kbps)}
                            className={`py-1.5 rounded border text-center font-mono cursor-pointer transition-colors ${
                              audioBitrateKbps === kbps
                                ? 'bg-sky-500 text-black font-bold border-sky-400'
                                : 'bg-[#131d3d] border-[#202f64] text-neutral-300 hover:bg-[#18244d]'
                            }`}
                          >
                            {kbps} kbps
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                        <input
                          type="checkbox"
                          checked={loudnessNormalize}
                          onChange={(e) => setLoudnessNormalize(e.target.checked)}
                          className="accent-sky-500 rounded"
                        />
                        <span>Loudness Normalization (ITU-R BS.1770 -14 LUFS Target)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EFFECTS & TIMECODE */}
              {activeTab === 'effects' && (
                <div className="bg-[#0e1630] p-3 rounded-lg border border-[#1b254a] space-y-3.5">
                  <span className="font-bold text-neutral-200 text-xs block">Studio Metadata & Overlays</span>

                  {/* Burn-in Timecode */}
                  <div className="space-y-2 p-2.5 rounded bg-[#0b1021] border border-[#1b254a]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={burnInTimecode}
                        onChange={(e) => setBurnInTimecode(e.target.checked)}
                        className="accent-sky-500 rounded"
                      />
                      <span className="font-bold text-neutral-200">Timecode Overlay (SMPTE Burn-In)</span>
                    </label>

                    {burnInTimecode && (
                      <div className="pl-6 space-y-2 pt-1 text-[11px]">
                        <label className="text-[9px] text-neutral-400 block">POSITION</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'bottom-center', label: 'Bottom Center' },
                            { id: 'bottom-right', label: 'Bottom Right' },
                            { id: 'top-right', label: 'Top Right' },
                          ].map((pos) => (
                            <button
                              key={pos.id}
                              onClick={() => setTimecodePosition(pos.id as any)}
                              className={`py-1 rounded border text-center text-[10px] cursor-pointer ${
                                timecodePosition === pos.id
                                  ? 'bg-sky-500 text-black font-bold border-sky-400'
                                  : 'bg-[#131d3d] border-[#202f64] text-neutral-400 hover:text-white'
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color Space & SDR Conform */}
                  <div className="space-y-1 text-[11px]">
                    <span className="text-neutral-400 block font-semibold">COLOR SPACE CONFORM</span>
                    <select className="w-full bg-[#131d3d] text-white px-2.5 py-1.5 rounded border border-[#202f64] outline-none text-xs">
                      <option>Rec. 709 (SDR Standard Broadcast)</option>
                      <option>sRGB (Web & Computer Displays)</option>
                      <option>Rec. 2020 (HDR Wide Gamut)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 4: PUBLISH & CLOUD */}
              {activeTab === 'publish' && (
                <div className="bg-[#0e1630] p-3 rounded-lg border border-[#1b254a] space-y-3">
                  <span className="font-bold text-neutral-200 text-xs block">Publish Destinations</span>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded bg-[#0b1021] border border-[#1b254a] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-sky-400" />
                        <div>
                          <div className="font-semibold text-neutral-200">Local Hard Drive</div>
                          <div className="text-[9px] text-neutral-500">Direct download to default browser downloads</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-[#0b1021] border border-[#1b254a] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="font-semibold text-neutral-200">Google Drive Cloud Storage</div>
                          <div className="text-[9px] text-neutral-500">Sync render directly to project Drive assets</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-400 bg-[#152042] border border-[#1e2a52] px-2 py-0.5 rounded">
                        Connected
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AME QUEUE MANAGER */}
              {activeTab === 'queue' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-200 text-xs">
                      Media Encoder Render Queue ({queue.length})
                    </span>
                    <button
                      disabled={isProcessingQueue || queue.length === 0}
                      onClick={handleProcessQueue}
                      className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isProcessingQueue
                          ? 'bg-neutral-800 text-neutral-500'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-xs'
                      }`}
                    >
                      {isProcessingQueue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                      <span>{isProcessingQueue ? 'Encoding Queue...' : 'Start Queue'}</span>
                    </button>
                  </div>

                  {queue.length === 0 ? (
                    <div className="p-6 text-center text-neutral-500 bg-[#0e1630] rounded-lg border border-[#1b254a] space-y-2">
                      <ListPlus className="w-8 h-8 mx-auto text-neutral-600" />
                      <p className="text-xs">No jobs currently in the Media Encoder queue.</p>
                      <button
                        onClick={handleAddToQueue}
                        className="px-3 py-1 bg-[#152042] hover:bg-[#1d2d5c] text-sky-300 rounded border border-sky-500/30 text-[11px] cursor-pointer transition-colors"
                      >
                        + Add Current Sequence to Queue
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {queue.map((item, idx) => (
                        <div
                          key={item.id}
                          className="bg-[#0e1630] p-2.5 rounded-lg border border-[#1b254a] space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-neutral-500 font-bold">#{idx + 1}</span>
                              <span className="font-bold text-neutral-100">{item.name}</span>
                              <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30 font-mono">
                                {item.format}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase font-mono ${
                                item.status === 'done'
                                  ? 'text-emerald-400'
                                  : item.status === 'encoding'
                                  ? 'text-sky-400'
                                  : 'text-neutral-400'
                              }`}>
                                [{item.status}]
                              </span>

                              <button
                                onClick={() => setQueue((prev) => prev.filter((q) => q.id !== item.id))}
                                className="text-neutral-500 hover:text-rose-400 p-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                            <span>Preset: {item.preset}</span>
                            <span>{item.resolution} @ {item.fps}fps</span>
                          </div>

                          {/* Progress bar */}
                          {item.status === 'encoding' && (
                            <div className="h-1.5 bg-[#080d1c] rounded-full overflow-hidden">
                              <div
                                style={{ width: `${item.progress}%` }}
                                className="h-full bg-sky-400 transition-all duration-100"
                              />
                            </div>
                          )}

                          {item.downloadUrl && (
                            <a
                              href={item.downloadUrl}
                              download={`${item.name}.${item.format.toLowerCase() === 'png' ? 'png' : 'mp4'}`}
                              className="mt-1 w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[10px] flex items-center justify-center gap-1 rounded transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download Render ({item.fileSize || 'Ready'})</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Direct Render Progress Banner */}
            {progress.status !== 'idle' && (
              <div className="p-3 bg-[#080d1c] border-t border-[#1b254a] space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                    {isRendering && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
                    {progress.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                    {progress.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                    <span className="uppercase font-mono text-[11px]">
                      Encoding Status: [{progress.status}]
                    </span>
                  </span>
                  <span className="font-mono text-sky-400 font-bold text-xs tabular-nums">
                    {progress.percent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-[#131d3d] rounded-full overflow-hidden border border-[#1e2a52]">
                  <div
                    style={{ width: `${progress.percent}%` }}
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-100"
                  />
                </div>

                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>Frame: {progress.currentFrame} / {progress.totalFrames}</span>
                  {progress.status === 'completed' && (
                    <span className="text-emerald-400 font-bold">Render Master Complete</span>
                  )}
                  {progress.status === 'error' && (
                    <span className="text-rose-400 font-bold">{progress.error}</span>
                  )}
                </div>

                {/* Direct Download Button */}
                {progress.downloadUrl && (
                  <a
                    href={progress.downloadUrl}
                    download={progress.fileName}
                    className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center justify-center gap-1.5 rounded transition-colors cursor-pointer text-xs shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File: {progress.fileName} ({progress.fileSizeEstimate})</span>
                  </a>
                )}
              </div>
            )}

            {/* Adobe Media Encoder Action Footer */}
            <div className="h-12 bg-[#0d142b] border-t border-[#1b254a] px-3.5 flex items-center justify-between shrink-0">
              
              {/* Range Scope dropdown & Estimated Size */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400 text-[10px] font-bold hidden sm:inline">RANGE:</span>
                <select
                  disabled={isRendering}
                  value={rangeMode}
                  onChange={(e) => setRangeMode(e.target.value as any)}
                  className="bg-[#131d3d] text-neutral-200 text-[10px] px-2 py-1 rounded border border-[#202f64] outline-none cursor-pointer"
                >
                  <option value="entire">Entire Sequence</option>
                  <option value="in-out" disabled={inPoint === null || outPoint === null}>
                    Sequence In / Out ({inPoint !== null && outPoint !== null ? `${(outPoint - inPoint).toFixed(1)}s` : 'No In/Out Set'})
                  </option>
                  <option value="current-frame">Current Frame Snapshot</option>
                </select>

                <span className="text-neutral-500 hidden sm:inline">·</span>
                <span className="text-neutral-400 text-[10px] font-mono">
                  Est: <strong className="text-emerald-400">{estimatedSizeMb}</strong>
                </span>
              </div>

              {/* Action Buttons: Queue, Cancel, Export */}
              <div className="flex items-center gap-2">
                {!isRendering && (
                  <>
                    <button
                      onClick={handleAddToQueue}
                      title="Send job to Media Encoder Queue for batch processing"
                      className="px-2.5 py-1.5 bg-[#172247] hover:bg-[#202f63] border border-[#25356e] text-sky-300 rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Queue</span>
                    </button>

                    <button
                      onClick={onClose}
                      className="px-3 py-1.5 bg-[#131d3d] hover:bg-[#1a2752] border border-[#202f64] text-neutral-300 rounded text-xs cursor-pointer transition-colors"
                    >
                      {progress.status === 'completed' ? 'Close' : 'Cancel'}
                    </button>
                  </>
                )}

                {/* Primary Export Button */}
                <button
                  onClick={handleStartExport}
                  disabled={isRendering}
                  className={`px-4 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isRendering
                      ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                      : 'bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/20'
                  }`}
                >
                  {isRendering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
