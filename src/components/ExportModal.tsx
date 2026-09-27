import React, { useState, useMemo } from 'react';
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
  HardDrive
} from 'lucide-react';
import { Clip, MediaItem, Track } from '../types/editor';
import { exportSequenceVideo, ExportProgress, ExportConfig } from '../utils/exporter';
import { formatTimecode } from '../utils/timecode';

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
  // Navigation tabs in export modal
  const [activeTab, setActiveTab] = useState<'presets' | 'video' | 'audio' | 'range'>('presets');

  // Format & Container
  const [format, setFormat] = useState<'webm' | 'mp4' | 'frame-png'>('webm');

  // Resolution Preset or Custom
  const [presetKey, setPresetKey] = useState<string>('1080p');
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);

  // Framerate
  const [fps, setFps] = useState<number>(30);

  // Bitrate & Quality
  const [bitrateKey, setBitrateKey] = useState<'low' | 'med' | 'high' | 'ultra'>('med');

  // Export Range Scope
  const [rangeMode, setRangeMode] = useState<'entire' | 'in-out' | 'current-frame'>('entire');

  // Audio Settings
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [audioSampleRate, setAudioSampleRate] = useState<44100 | 48000>(48000);

  // Extras
  const [burnInTimecode, setBurnInTimecode] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>(`CineFlow_Render_${new Date().toISOString().slice(0, 10)}`);

  // Progress state
  const [progress, setProgress] = useState<ExportProgress>({
    percent: 0,
    currentFrame: 0,
    totalFrames: 0,
    status: 'idle',
  });

  const resolutionPresets: Record<string, { label: string; width: number; height: number; aspect: string; desc: string }> = {
    '1080p': { label: '1080p Full HD', width: 1920, height: 1080, aspect: '16:9', desc: 'YouTube / Web standard broadcast' },
    '4k': { label: '4K Ultra HD', width: 3840, height: 2160, aspect: '16:9', desc: 'High-res master cinema format' },
    '720p': { label: '720p HD (Fast)', width: 1280, height: 720, aspect: '16:9', desc: 'Ultra-fast draft & preview' },
    '9:16': { label: '9:16 Vertical Story', width: 1080, height: 1920, aspect: '9:16', desc: 'TikTok, IG Reels, YT Shorts' },
    '1:1': { label: '1:1 Square Feed', width: 1080, height: 1080, aspect: '1:1', desc: 'Instagram & Square Feed' },
    '4:5': { label: '4:5 Social Portrait', width: 1080, height: 1350, aspect: '4:5', desc: 'Social Media Portrait Feed' },
    '21:9': { label: '21:9 UltraWide', width: 2560, height: 1080, aspect: '21:9', desc: 'Cinematic Anamorphic Scope' },
    'custom': { label: 'Custom Dimension', width: customWidth, height: customHeight, aspect: 'User', desc: 'User defined W × H' },
  };

  const bitrateConfig: Record<string, { label: string; bps: number; desc: string }> = {
    'low': { label: 'Draft / Low (4 Mbps)', bps: 4_000_000, desc: 'Smallest file size / fast upload' },
    'med': { label: 'Standard Web (8 Mbps)', bps: 8_000_000, desc: 'Recommended for YouTube & Web' },
    'high': { label: 'High Quality (16 Mbps)', bps: 16_000_000, desc: 'Sharp high-motion detail' },
    'ultra': { label: 'Master Studio (28 Mbps)', bps: 28_000_000, desc: 'Archival & maximum fidelity' },
  };

  // Compute active target dimensions
  const activeWidth = presetKey === 'custom' ? customWidth : resolutionPresets[presetKey].width;
  const activeHeight = presetKey === 'custom' ? customHeight : resolutionPresets[presetKey].height;

  // Compute active export time range
  const { exportStart, exportEnd, effectiveDuration } = useMemo(() => {
    if (rangeMode === 'current-frame') {
      return { exportStart: currentTime, exportEnd: currentTime + (1 / fps), effectiveDuration: 1 / fps };
    }
    if (rangeMode === 'in-out' && inPoint !== null && outPoint !== null && outPoint > inPoint) {
      return { exportStart: inPoint, exportEnd: outPoint, effectiveDuration: outPoint - inPoint };
    }
    return { exportStart: 0, exportEnd: duration, effectiveDuration: duration };
  }, [rangeMode, inPoint, outPoint, currentTime, duration, fps]);

  // Estimated file size calculation
  const estimatedSizeMb = useMemo(() => {
    if (format === 'frame-png') return '~1.8 MB (PNG)';
    const bps = bitrateConfig[bitrateKey].bps;
    const totalBytes = (bps * effectiveDuration) / 8;
    return `~${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [bitrateKey, effectiveDuration, format]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    const isSingleFrame = rangeMode === 'current-frame' || format === 'frame-png';
    const chosenFormat = isSingleFrame ? 'frame-png' : format;

    const config: ExportConfig = {
      format: chosenFormat,
      width: activeWidth,
      height: activeHeight,
      fps,
      bitrate: bitrateConfig[bitrateKey].bps,
      startTime: exportStart,
      endTime: exportEnd,
      fileName: fileName.trim() || 'CineFlow_Render',
      burnInTimecode,
      includeAudio: includeAudio && !isSingleFrame,
      audioSampleRate,
    };

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

  const isRendering = progress.status === 'rendering' || progress.status === 'encoding';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 select-none font-mono text-xs animate-in fade-in duration-150">
      <div className="bg-[#09090c] border border-[#27272a] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Terminal Header */}
        <div className="h-8 bg-[#111115] border-b border-[#222226] px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">&gt; EXPORT:</span>
            <span className="font-bold text-neutral-100">SEQUENCE RENDER CONFIGURATION</span>
          </div>
          {!isRendering && (
            <button
              onClick={onClose}
              className="px-1.5 py-0.2 bg-[#181820] hover:bg-[#282834] border border-[#2e2e38] text-neutral-400 hover:text-white transition-colors cursor-pointer text-[10px]"
            >
              [X]
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#222226] bg-[#0c0c0f] text-[10px] p-1 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1 border text-center transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-neutral-800 text-sky-400 border-sky-500 font-bold'
                : 'bg-[#121217] text-neutral-400 border-[#222228] hover:text-white'
            }`}
          >
            [1: PRESETS & FORMAT]
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-1 border text-center transition-colors cursor-pointer ${
              activeTab === 'video'
                ? 'bg-neutral-800 text-sky-400 border-sky-500 font-bold'
                : 'bg-[#121217] text-neutral-400 border-[#222228] hover:text-white'
            }`}
          >
            [2: VIDEO & FPS]
          </button>
          <button
            onClick={() => setActiveTab('range')}
            className={`flex-1 py-1 border text-center transition-colors cursor-pointer ${
              activeTab === 'range'
                ? 'bg-neutral-800 text-sky-400 border-sky-500 font-bold'
                : 'bg-[#121217] text-neutral-400 border-[#222228] hover:text-white'
            }`}
          >
            [3: SCOPE & RANGE]
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-1 border text-center transition-colors cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-neutral-800 text-sky-400 border-sky-500 font-bold'
                : 'bg-[#121217] text-neutral-400 border-[#222228] hover:text-white'
            }`}
          >
            [4: AUDIO & EXTRAS]
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: PRESETS & FORMAT */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              {/* Output Container Format */}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px] font-bold block">
                  &gt; SELECT CONTAINER / CODEC:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    disabled={isRendering}
                    onClick={() => setFormat('webm')}
                    className={`p-2 border text-left cursor-pointer transition-all ${
                      format === 'webm'
                        ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                        : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-[11px]">WebM (VP9/VP8)</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">High Efficiency Web Stream</div>
                  </button>

                  <button
                    disabled={isRendering}
                    onClick={() => setFormat('mp4')}
                    className={`p-2 border text-left cursor-pointer transition-all ${
                      format === 'mp4'
                        ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                        : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-[11px]">MP4 (H.264 / AAC)</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">Universal Device Playback</div>
                  </button>

                  <button
                    disabled={isRendering}
                    onClick={() => setFormat('frame-png')}
                    className={`p-2 border text-left cursor-pointer transition-all ${
                      format === 'frame-png'
                        ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                        : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-[11px]">PNG Still Frame</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">Capture Current Poster Frame</div>
                  </button>
                </div>
              </div>

              {/* Resolution Presets Grid */}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px] font-bold block">
                  &gt; RESOLUTION & ASPECT RATIO PRESET:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(resolutionPresets).map(([key, val]) => (
                    <button
                      key={key}
                      disabled={isRendering}
                      onClick={() => setPresetKey(key)}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        presetKey === key
                          ? 'bg-neutral-800 border-sky-400 text-sky-300'
                          : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span>{val.label}</span>
                        <span className="text-[9px] text-neutral-500">{val.aspect}</span>
                      </div>
                      <div className="text-[9px] text-neutral-500 mt-0.5 font-mono">
                        {val.width} × {val.height} · {val.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO & FPS */}
          {activeTab === 'video' && (
            <div className="space-y-3">
              {/* Custom Dimension Inputs if custom selected */}
              {presetKey === 'custom' && (
                <div className="p-2 bg-[#121217] border border-sky-500/40 space-y-1.5">
                  <span className="text-sky-300 text-[10px] font-bold block">&gt; CUSTOM RESOLUTION (W × H):</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] text-neutral-500 block">WIDTH (PX)</label>
                      <input
                        type="number"
                        min="320"
                        max="7680"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="w-full bg-black text-neutral-200 px-2 py-1 border border-[#2e2e38] text-xs font-mono"
                      />
                    </div>
                    <span className="text-neutral-500 mt-3">×</span>
                    <div className="flex-1">
                      <label className="text-[9px] text-neutral-500 block">HEIGHT (PX)</label>
                      <input
                        type="number"
                        min="240"
                        max="4320"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="w-full bg-black text-neutral-200 px-2 py-1 border border-[#2e2e38] text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Framerate Selection */}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px] font-bold block">
                  &gt; FRAME RATE (FPS):
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { val: 24, label: '24 FPS', desc: 'Cinema' },
                    { val: 25, label: '25 FPS', desc: 'PAL Broadcast' },
                    { val: 30, label: '30 FPS', desc: 'Web Standard' },
                    { val: 50, label: '50 FPS', desc: 'High PAL' },
                    { val: 60, label: '60 FPS', desc: 'Smooth 60' },
                  ].map(({ val, label, desc }) => (
                    <button
                      key={val}
                      disabled={isRendering}
                      onClick={() => setFps(val)}
                      className={`p-1.5 border text-center cursor-pointer transition-all ${
                        fps === val
                          ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                          : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      <div className="text-[10px] font-bold">{label}</div>
                      <div className="text-[8px] text-neutral-500">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bitrate & Encoding Target */}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px] font-bold block">
                  &gt; VIDEO BITRATE & QUALITY ENCODING:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(bitrateConfig).map(([key, val]) => (
                    <button
                      key={key}
                      disabled={isRendering}
                      onClick={() => setBitrateKey(key as any)}
                      className={`p-2 border text-left cursor-pointer transition-all ${
                        bitrateKey === key
                          ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                          : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      <div className="text-[11px]">{val.label}</div>
                      <div className="text-[9px] text-neutral-500 mt-0.5">{val.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCOPE & RANGE */}
          {activeTab === 'range' && (
            <div className="space-y-3">
              <span className="text-neutral-400 text-[10px] font-bold block">
                &gt; SELECT EXPORT TIME RANGE:
              </span>
              <div className="space-y-1.5">
                {/* Entire Sequence */}
                <button
                  disabled={isRendering}
                  onClick={() => setRangeMode('entire')}
                  className={`w-full p-2 border text-left cursor-pointer transition-all flex items-center justify-between ${
                    rangeMode === 'entire'
                      ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                      : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  <div>
                    <div className="text-[11px]">Entire Sequence</div>
                    <div className="text-[9px] text-neutral-500">Render full timeline from start to finish</div>
                  </div>
                  <span className="text-neutral-300 font-mono text-[10px]">
                    00:00:00:00 → {formatTimecode(duration, fps)} ({duration.toFixed(1)}s)
                  </span>
                </button>

                {/* In / Out Range */}
                <button
                  disabled={isRendering || inPoint === null || outPoint === null}
                  onClick={() => setRangeMode('in-out')}
                  className={`w-full p-2 border text-left cursor-pointer transition-all flex items-center justify-between ${
                    rangeMode === 'in-out'
                      ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                      : inPoint !== null && outPoint !== null
                      ? 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                      : 'bg-[#121217] border-neutral-900 text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="text-[11px]">In to Out Range Only [I / O]</div>
                    <div className="text-[9px] text-neutral-500">
                      {inPoint !== null && outPoint !== null
                        ? 'Render between marked In and Out points'
                        : 'No In/Out points currently set (Press I and O on timeline)'}
                    </div>
                  </div>
                  {inPoint !== null && outPoint !== null && (
                    <span className="text-neutral-300 font-mono text-[10px]">
                      {formatTimecode(inPoint, fps)} → {formatTimecode(outPoint, fps)} ({(outPoint - inPoint).toFixed(1)}s)
                    </span>
                  )}
                </button>

                {/* Current Frame Only */}
                <button
                  disabled={isRendering}
                  onClick={() => setRangeMode('current-frame')}
                  className={`w-full p-2 border text-left cursor-pointer transition-all flex items-center justify-between ${
                    rangeMode === 'current-frame'
                      ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                      : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  <div>
                    <div className="text-[11px]">Current Playhead Frame (Still Image)</div>
                    <div className="text-[9px] text-neutral-500">Export high-res screenshot at playhead position</div>
                  </div>
                  <span className="text-neutral-300 font-mono text-[10px]">
                    @ {formatTimecode(currentTime, fps)}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIO & EXTRAS */}
          {activeTab === 'audio' && (
            <div className="space-y-3">
              {/* Audio Track Toggle */}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px] font-bold block">
                  &gt; AUDIO MIXDOWN SETTINGS:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    disabled={isRendering}
                    onClick={() => setIncludeAudio(true)}
                    className={`p-2 border text-left cursor-pointer transition-all ${
                      includeAudio
                        ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                        : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Include Audio Mix</span>
                    </div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">Stereo Master Mixdown (Opus/AAC)</div>
                  </button>

                  <button
                    disabled={isRendering}
                    onClick={() => setIncludeAudio(false)}
                    className={`p-2 border text-left cursor-pointer transition-all ${
                      !includeAudio
                        ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                        : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                      <span>Mute Audio (Video Only)</span>
                    </div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">Silent video file output</div>
                  </button>
                </div>
              </div>

              {/* Sample Rate */}
              {includeAudio && (
                <div className="space-y-1">
                  <span className="text-neutral-400 text-[10px] font-bold block">
                    &gt; AUDIO SAMPLE RATE:
                  </span>
                  <div className="flex gap-1.5">
                    {[
                      { val: 48000, label: '48,000 Hz (Cinema Broadcast Master)' },
                      { val: 44100, label: '44,100 Hz (Standard Audio / CD)' },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        disabled={isRendering}
                        onClick={() => setAudioSampleRate(val as any)}
                        className={`flex-1 p-2 border text-left cursor-pointer transition-all ${
                          audioSampleRate === val
                            ? 'bg-neutral-800 border-sky-400 text-sky-300 font-bold'
                            : 'bg-[#121217] border-[#222228] text-neutral-400 hover:border-neutral-600'
                        }`}
                      >
                        <div className="text-[10px]">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras: Burn-in Timecode */}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px] font-bold block">
                  &gt; STUDIO METADATA EXTRAS:
                </span>
                <label className="flex items-center gap-2 p-2 bg-[#121217] border border-[#222228] cursor-pointer hover:border-neutral-600">
                  <input
                    type="checkbox"
                    checked={burnInTimecode}
                    onChange={(e) => setBurnInTimecode(e.target.checked)}
                    disabled={isRendering}
                    className="accent-sky-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-[11px] text-neutral-200 font-bold">Burn-in Timecode Overlay</div>
                    <div className="text-[9px] text-neutral-500">
                      Renders broadcast SMPTE timecode watermark on exported frames
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Filename & Output Summary Bar */}
          <div className="bg-[#121217] p-2.5 border border-[#222228] space-y-2">
            <div>
              <label className="text-[9px] text-neutral-500 block mb-0.5">OUTPUT FILE NAME:</label>
              <input
                type="text"
                disabled={isRendering}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full bg-black text-neutral-200 px-2 py-1 border border-[#2e2e38] text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-[10px] text-neutral-400 border-t border-neutral-800/80 pt-1.5 font-mono">
              <div>
                <span className="text-neutral-500 block text-[8px]">RESOLUTION</span>
                <span className="text-neutral-200 font-bold">{activeWidth} × {activeHeight}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[8px]">FPS / RATE</span>
                <span className="text-neutral-200 font-bold">{fps} FPS</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[8px]">DURATION</span>
                <span className="text-neutral-200 font-bold">{effectiveDuration.toFixed(1)}s</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[8px]">EST. FILE SIZE</span>
                <span className="text-emerald-400 font-bold">{estimatedSizeMb}</span>
              </div>
            </div>
          </div>

          {/* Render Progress Area */}
          {progress.status !== 'idle' && (
            <div className="bg-[#101015] p-3 border border-[#2a2a36] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                  {isRendering && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
                  {progress.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  {progress.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="uppercase font-bold">[{progress.status}]</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold tabular-nums">
                  {progress.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-black border border-[#262633] overflow-hidden">
                <div
                  style={{ width: `${progress.percent}%` }}
                  className="h-full bg-emerald-500 transition-all duration-100"
                />
              </div>

              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>
                  FRAME: {progress.currentFrame} / {progress.totalFrames}
                </span>
                {progress.status === 'completed' && (
                  <span className="text-emerald-400 font-bold">[ RENDER COMPLETE ]</span>
                )}
                {progress.status === 'error' && (
                  <span className="text-rose-400 font-bold">{progress.error}</span>
                )}
              </div>

              {/* Direct download link if completed */}
              {progress.downloadUrl && (
                <a
                  href={progress.downloadUrl}
                  download={progress.fileName}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>[DOWNLOAD FILE: {progress.fileName} ({progress.fileSizeEstimate})]</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Terminal Footer Actions */}
        <div className="h-9 bg-[#111115] border-t border-[#222226] px-3 flex items-center justify-between">
          <div className="text-[10px] text-neutral-500">
            <span>&gt; TARGET: {format.toUpperCase()} @ {bitrateConfig[bitrateKey].label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isRendering && (
              <button
                onClick={onClose}
                className="px-2.5 py-1 bg-[#181820] hover:bg-[#252530] border border-[#2e2e38] text-neutral-300 text-[10px] cursor-pointer"
              >
                {progress.status === 'completed' ? '[CLOSE]' : '[CANCEL]'}
              </button>
            )}

            <button
              onClick={handleStartExport}
              disabled={isRendering}
              className={`px-3 py-1 font-bold text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                isRendering
                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-black border border-emerald-400 shadow-xs'
              }`}
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>[RENDERING...]</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>[START EXPORT RENDER]</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
