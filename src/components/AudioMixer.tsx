import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sliders, 
  Settings, 
  Activity, 
  Music, 
  MoreHorizontal, 
  Filter, 
  Check, 
  ChevronDown, 
  Radio,
  Maximize2,
  Minimize2,
  Headphones,
  SlidersHorizontal
} from 'lucide-react';
import { Track } from '../types/editor';

interface AudioMixerProps {
  tracks: Track[];
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onUpdateVolume: (trackId: string, volume: number) => void;
  onUpdatePan: (trackId: string, pan: number) => void;
  onUpdateEQ?: (trackId: string, eq: { low: number; mid: number; high: number }) => void;
  masterVolume: number;
  onUpdateMasterVolume: (vol: number) => void;
  isPlaying: boolean;
}

export const AudioMixer: React.FC<AudioMixerProps> = ({
  tracks,
  onToggleMute,
  onToggleSolo,
  onUpdateVolume,
  onUpdatePan,
  onUpdateEQ,
  masterVolume,
  onUpdateMasterVolume,
  isPlaying,
}) => {
  // Extract audio tracks only
  const audioTracks = (tracks || []).filter((t) => t && t.type === 'audio');

  // Sub-menu navigation state
  const [activeTab, setActiveTab] = useState<'mixer' | 'eq' | 'master'>('mixer');
  const [channelViewMode, setChannelViewMode] = useState<'standard' | 'compact'>('standard');
  const [channelFilter, setChannelFilter] = useState<'all' | 'unmuted'>('all');
  const [selectedEqTrackId, setSelectedEqTrackId] = useState<string>(() => audioTracks[0]?.id || 'a1');
  
  // Sub-menu dropdown popover states
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEqPresetsMenu, setShowEqPresetsMenu] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);
  const eqPresetsMenuRef = useRef<HTMLDivElement | null>(null);

  // Master bus dynamics features
  const [monoCheck, setMonoCheck] = useState(false);
  const [softLimiter, setSoftLimiter] = useState(true);

  // Track EQ local states
  const [eqStates, setEqStates] = useState<Record<string, { low: number; mid: number; high: number }>>({});

  // Simulate real-time VU audio levels for each track when playing
  const [trackLevels, setTrackLevels] = useState<Record<string, number>>({});

  // Ensure selectedEqTrackId points to an existing track if tracks change
  useEffect(() => {
    if (audioTracks.length > 0 && !audioTracks.some((t) => t.id === selectedEqTrackId)) {
      setSelectedEqTrackId(audioTracks[0].id);
    }
  }, [audioTracks, selectedEqTrackId]);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
      if (eqPresetsMenuRef.current && !eqPresetsMenuRef.current.contains(e.target as Node)) {
        setShowEqPresetsMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Sync initial EQ states from tracks
    const initialEqs: Record<string, { low: number; mid: number; high: number }> = {};
    audioTracks.forEach((t) => {
      initialEqs[t.id] = (t as any).eqSettings || { low: 0, mid: 0, high: 0 };
    });
    setEqStates(initialEqs);
  }, [tracks]);

  // Real-time VU meter level animator
  useEffect(() => {
    if (!isPlaying) {
      const resetLevels: Record<string, number> = {};
      audioTracks.forEach((t) => {
        resetLevels[t.id] = 0;
      });
      resetLevels['master'] = 0;
      setTrackLevels(resetLevels);
      return;
    }

    const interval = setInterval(() => {
      const nextLevels: Record<string, number> = {};
      let activeAudioVolumeSum = 0;
      let activeCount = 0;

      audioTracks.forEach((t) => {
        if (!t) return;
        if (t.muted) {
          nextLevels[t.id] = 0;
        } else {
          const trackVolume = typeof t.volume === 'number' && !isNaN(t.volume) ? t.volume : 1.0;
          const base = trackVolume * 70;
          const randomFactor = Math.sin(Date.now() / (100 + Math.random() * 50)) * 15;
          const noise = Math.random() * 8;
          const level = Math.max(0, Math.min(100, base + randomFactor + noise));
          nextLevels[t.id] = level;

          activeAudioVolumeSum += level;
          activeCount++;
        }
      });

      const safeMasterVolume = typeof masterVolume === 'number' && !isNaN(masterVolume) ? masterVolume : 1.0;
      const masterBase = activeCount > 0 ? (activeAudioVolumeSum / activeCount) * safeMasterVolume : 0;
      const masterNoise = isPlaying ? Math.random() * 5 : 0;
      let calculatedMaster = Math.max(0, Math.min(100, masterBase + masterNoise));
      
      // Soft Limiter compression clamp at 94%
      if (softLimiter && calculatedMaster > 94) {
        calculatedMaster = 94 + (calculatedMaster - 94) * 0.25;
      }

      nextLevels['master'] = calculatedMaster;

      setTrackLevels(nextLevels);
    }, 80);

    return () => clearInterval(interval);
  }, [isPlaying, tracks, masterVolume, softLimiter]);

  const handleEQSliderChange = (trackId: string, band: 'low' | 'mid' | 'high', value: number) => {
    const updatedEQ = {
      ...(eqStates[trackId] || { low: 0, mid: 0, high: 0 }),
      [band]: value,
    };

    setEqStates((prev) => ({
      ...prev,
      [trackId]: updatedEQ,
    }));

    if (onUpdateEQ) {
      onUpdateEQ(trackId, updatedEQ);
    }
  };

  const handleResetEQ = (trackId: string) => {
    const flatEQ = { low: 0, mid: 0, high: 0 };
    setEqStates((prev) => ({
      ...prev,
      [trackId]: flatEQ,
    }));
    if (onUpdateEQ) {
      onUpdateEQ(trackId, flatEQ);
    }
  };

  const applyEQPreset = (trackId: string, preset: 'vocal' | 'bass-boost' | 'podcast' | 'bright' | 'warmth' | 'flat') => {
    let targetEQ = { low: 0, mid: 0, high: 0 };
    switch (preset) {
      case 'vocal':
        targetEQ = { low: -4, mid: 6, high: 4 };
        break;
      case 'bass-boost':
        targetEQ = { low: 8, mid: -1, high: -2 };
        break;
      case 'podcast':
        targetEQ = { low: -2, mid: 5, high: 3 };
        break;
      case 'bright':
        targetEQ = { low: -3, mid: 2, high: 7 };
        break;
      case 'warmth':
        targetEQ = { low: 5, mid: 1, high: -4 };
        break;
      case 'flat':
      default:
        targetEQ = { low: 0, mid: 0, high: 0 };
        break;
    }

    setEqStates((prev) => ({
      ...prev,
      [trackId]: targetEQ,
    }));
    if (onUpdateEQ) {
      onUpdateEQ(trackId, targetEQ);
    }
    setShowEqPresetsMenu(false);
  };

  // Quick Action Sub-menu Handlers
  const handleResetAllFaders = () => {
    audioTracks.forEach((t) => onUpdateVolume(t.id, 1.0));
    setShowOptionsMenu(false);
  };

  const handleCenterAllPans = () => {
    audioTracks.forEach((t) => onUpdatePan(t.id, 0));
    setShowOptionsMenu(false);
  };

  const handleUnmuteAll = () => {
    audioTracks.forEach((t) => {
      if (t.muted) onToggleMute(t.id);
    });
    setShowOptionsMenu(false);
  };

  const handleClearAllSolos = () => {
    audioTracks.forEach((t) => {
      if (t.solo) onToggleSolo(t.id);
    });
    setShowOptionsMenu(false);
  };

  const handleResetAllEQs = () => {
    audioTracks.forEach((t) => handleResetEQ(t.id));
    setShowOptionsMenu(false);
  };

  const getEQCurvePath = (eq: { low: number; mid: number; high: number }, height = 64) => {
    const { low, mid, high } = eq;
    const midY = height / 2;
    const mapY = (val: number) => midY - (val / 15) * (midY - 8);
    const yLow = mapY(low);
    const yMid = mapY(mid);
    const yHigh = mapY(high);

    return `M 8,${yLow} C 35,${yLow} 50,${yMid} 70,${yMid} C 85,${yMid} 100,${yHigh} 132,${yHigh}`;
  };

  // Filter channels according to active sub-menu filter
  const displayedAudioTracks = audioTracks.filter((t) => {
    if (channelFilter === 'unmuted') return !t.muted;
    return true;
  });

  const activeEqTrack = audioTracks.find((t) => t.id === selectedEqTrackId) || audioTracks[0];
  const activeEq = (activeEqTrack && eqStates[activeEqTrack.id]) || { low: 0, mid: 0, high: 0 };

  return (
    <div className="flex flex-col h-full bg-[#0b0f22] border-r border-[#1a2346] shrink-0 text-slate-200 select-none text-xs">
      {/* Primary Header & Top Sub-Menu Switcher */}
      <div className="h-10 bg-[#101633] border-b border-[#1a2346] px-2.5 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-bold text-slate-200 text-xs tracking-wide">Mixer</span>
        </div>

        {/* Primary Sub-Menu Segmented Bar */}
        <div className="flex items-center bg-[#070a18] rounded-md p-0.5 border border-[#1a2346]">
          <button
            onClick={() => setActiveTab('mixer')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'mixer' 
                ? 'bg-[#1b254a] text-slate-100 shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-2.5 h-2.5 text-emerald-400" />
            <span>Channels</span>
          </button>
          <button
            onClick={() => setActiveTab('eq')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'eq' 
                ? 'bg-[#1b254a] text-slate-100 shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-2.5 h-2.5 text-cyan-400" />
            <span>EQ Console</span>
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'master' 
                ? 'bg-[#1b254a] text-slate-100 shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-2.5 h-2.5 text-sky-400" />
            <span>Master Bus</span>
          </button>
        </div>

        {/* Actions Dropdown Popover Sub-Menu */}
        <div className="relative shrink-0" ref={optionsMenuRef}>
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-1 rounded bg-[#070a18] hover:bg-[#192348] border border-[#1a2346] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Audio Mixer Tools & Batch Actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0e142e] border border-[#233164] rounded-lg shadow-2xl py-1 z-50 animate-fadeIn text-[11px]">
              <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider font-semibold text-slate-400 border-b border-[#1b254a]">
                Quick Batch Actions
              </div>
              <button
                onClick={handleResetAllFaders}
                className="w-full text-left px-2.5 py-1.5 text-slate-200 hover:bg-[#1a2656] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset Faders (0 dB)</span>
              </button>
              <button
                onClick={handleCenterAllPans}
                className="w-full text-left px-2.5 py-1.5 text-slate-200 hover:bg-[#1a2656] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>Center All Pan (C)</span>
              </button>
              <button
                onClick={handleUnmuteAll}
                className="w-full text-left px-2.5 py-1.5 text-slate-200 hover:bg-[#1a2656] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-3 h-3 text-cyan-400" />
                <span>Unmute All Tracks</span>
              </button>
              <button
                onClick={handleClearAllSolos}
                className="w-full text-left px-2.5 py-1.5 text-slate-200 hover:bg-[#1a2656] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <Headphones className="w-3 h-3 text-amber-400" />
                <span>Clear All Solos</span>
              </button>
              <div className="my-1 border-t border-[#1b254a]" />
              <button
                onClick={handleResetAllEQs}
                className="w-full text-left px-2.5 py-1.5 text-slate-200 hover:bg-[#1a2656] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-rose-400" />
                <span>Reset All EQ to Flat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Context Sub-Bar (Adjusts per active tab to keep UI uncluttered) */}
      {activeTab === 'mixer' && (
        <div className="h-7 bg-[#0c1026] border-b border-[#1a2346] px-2.5 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          {/* Sub-menu filters */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mr-1">Filter:</span>
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                channelFilter === 'all'
                  ? 'bg-[#1b2752] text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({audioTracks.length})
            </button>
            <button
              onClick={() => setChannelFilter('unmuted')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                channelFilter === 'unmuted'
                  ? 'bg-[#1b2752] text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Audible Only
            </button>
          </div>

          {/* Sub-menu density toggle: Standard vs Compact */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChannelViewMode(channelViewMode === 'standard' ? 'compact' : 'standard')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#070a18] hover:bg-[#162046] border border-[#1a2346] text-slate-300 hover:text-white cursor-pointer"
              title={channelViewMode === 'standard' ? 'Switch to Compact Strips' : 'Switch to Detailed Strips'}
            >
              {channelViewMode === 'standard' ? (
                <>
                  <Minimize2 className="w-2.5 h-2.5 text-slate-400" />
                  <span>Compact</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-2.5 h-2.5 text-slate-400" />
                  <span>Detailed</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 1: CHANNELS & FADERS */}
      {activeTab === 'mixer' && (
        <div className="flex-1 overflow-x-auto flex divide-x divide-[#1a2346]/60 bg-[#070a18]">
          {displayedAudioTracks.map((track) => {
            const level = trackLevels[track.id] || 0;
            const isCompact = channelViewMode === 'compact';

            return (
              <div 
                key={track.id} 
                className={`${isCompact ? 'w-20' : 'w-24'} shrink-0 flex flex-col items-center py-2 px-1 relative bg-[#090d21]/60 hover:bg-[#0c122e]/60 transition-colors`}
              >
                {/* Channel Header Tag */}
                <div className="text-[10px] font-mono font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Music className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[55px]">{track.name}</span>
                </div>

                {/* Pan Control Dial (in standard view) */}
                {!isCompact && (
                  <div className="flex flex-col items-center mb-2.5">
                    <span className="text-[8px] text-slate-400 font-mono scale-90">PAN</span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={track.pan || 0}
                      onChange={(e) => onUpdatePan(track.id, parseFloat(e.target.value))}
                      className="w-11 h-4 accent-emerald-500 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                      title={`Pan: ${track.pan === 0 || !track.pan ? 'Center' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 10))}` : `R${Math.round(track.pan * 10)}`}`}
                    />
                    <div className="text-[8px] font-mono text-slate-300 font-semibold">
                      {track.pan === undefined || track.pan === 0 
                        ? 'C' 
                        : track.pan < 0 
                        ? `L${Math.abs(Math.round(track.pan * 10))}` 
                        : `R${Math.round(track.pan * 10)}`}
                    </div>
                  </div>
                )}

                {/* VU level LED and Vertical Slider track */}
                <div className="flex-1 flex gap-1.5 justify-center w-full px-1">
                  {/* Channel Slider */}
                  <div className="relative flex flex-col items-center h-full">
                    <div className="flex-1 h-32 relative flex items-center justify-center">
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.01"
                        value={track.volume}
                        onChange={(e) => onUpdateVolume(track.id, parseFloat(e.target.value))}
                        className="h-28 w-3.5 accent-emerald-500 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                        title={`${track.name} Volume: ${Math.round(track.volume * 100)}%`}
                      />
                    </div>
                    
                    {/* dB Readout */}
                    <div className="text-[8px] font-mono text-slate-400 mt-1">
                      {track.volume === 0 ? '-∞' : `${Math.round((track.volume - 1) * 6)}dB`}
                    </div>
                  </div>

                  {/* Channel VU Meter LEDs */}
                  <div className="w-1.5 bg-slate-950 rounded border border-slate-900 flex flex-col justify-end overflow-hidden h-32 p-0.5">
                    <div
                      style={{ height: `${level}%` }}
                      className={`w-full transition-all duration-75 rounded-b-xs ${
                        level > 88 
                          ? 'bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500' 
                          : level > 70 
                          ? 'bg-gradient-to-t from-emerald-500 to-amber-400' 
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Solos & Mute Control deck */}
                <div className="mt-2 flex items-center gap-1 w-full px-1">
                  <button
                    onClick={() => onToggleSolo(track.id)}
                    className={`flex-1 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                      track.solo
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xs'
                        : 'bg-[#121935] border-transparent text-amber-400 hover:bg-[#1a254c]'
                    }`}
                    title="Solo Track (S)"
                  >
                    S
                  </button>
                  <button
                    onClick={() => onToggleMute(track.id)}
                    className={`flex-1 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                      track.muted
                        ? 'bg-rose-600 border-rose-500 text-white shadow-xs'
                        : 'bg-[#121935] border-transparent text-rose-400 hover:bg-[#1a254c]'
                    }`}
                    title="Mute Track (M)"
                  >
                    M
                  </button>
                </div>
              </div>
            );
          })}

          {displayedAudioTracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-slate-500 text-[11px]">
              No channels match the active filter.
            </div>
          )}

          {/* Master Bus Channel Strip */}
          <div className="w-24 shrink-0 flex flex-col items-center py-2 px-1 bg-[#090b1c] relative">
            <div className="text-[10px] font-mono font-bold text-sky-400 mb-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-sky-400" />
              <span>MASTER</span>
            </div>

            <div className="flex-1 flex gap-1.5 justify-center w-full px-1 pt-1">
              <div className="relative flex flex-col items-center h-full">
                <div className="flex-1 h-32 relative flex items-center justify-center">
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.01"
                    value={masterVolume}
                    onChange={(e) => onUpdateMasterVolume(parseFloat(e.target.value))}
                    className="h-28 w-3.5 accent-sky-500 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                    title={`Master Fader: ${Math.round(masterVolume * 100)}%`}
                  />
                </div>
                <div className="text-[8px] font-mono text-slate-400 mt-1">
                  {masterVolume === 0 ? '-∞' : `${Math.round((masterVolume - 1) * 6)}dB`}
                </div>
              </div>

              {/* Master Stereo VU Meter */}
              <div className="w-3 bg-slate-950 rounded border border-slate-900 flex gap-0.5 h-32 p-0.5 shrink-0">
                <div className="flex-1 bg-slate-950 flex flex-col justify-end overflow-hidden h-full">
                  <div
                    style={{ height: `${trackLevels['master'] || 0}%` }}
                    className="w-full transition-all duration-75 rounded-b-xs bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500"
                  />
                </div>
                <div className="flex-1 bg-slate-950 flex flex-col justify-end overflow-hidden h-full">
                  <div
                    style={{ height: `${(trackLevels['master'] || 0) * 0.95 || 0}%` }}
                    className="w-full transition-all duration-75 rounded-b-xs bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1 w-full px-1">
              <button
                onClick={() => onUpdateMasterVolume(masterVolume === 0 ? 0.85 : 0)}
                className={`w-full py-0.5 rounded text-[9px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  masterVolume === 0
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-[#121935] border-transparent text-slate-300 hover:text-white'
                }`}
              >
                {masterVolume === 0 ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5 text-sky-400" />}
                <span>{masterVolume === 0 ? 'Muted' : 'Mute'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: DEDICATED PARAMETRIC EQ CONSOLE */}
      {activeTab === 'eq' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#070a18] p-3 overflow-y-auto">
          {/* Track Selection Sub-Menu Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1a2346] gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mr-1 shrink-0">Channel:</span>
              {audioTracks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedEqTrackId(t.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer shrink-0 ${
                    selectedEqTrackId === t.id
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'bg-[#121935] text-slate-300 hover:bg-[#1b254c] hover:text-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* EQ Presets Sub-Menu Dropdown */}
            {activeEqTrack && (
              <div className="relative shrink-0" ref={eqPresetsMenuRef}>
                <button
                  onClick={() => setShowEqPresetsMenu(!showEqPresetsMenu)}
                  className="px-2 py-1 rounded bg-[#121935] hover:bg-[#1a2656] border border-[#202e5e] text-slate-200 text-[10px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Presets</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showEqPresetsMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-36 bg-[#0e142e] border border-[#233164] rounded-lg shadow-2xl py-1 z-50 text-[11px] animate-fadeIn">
                    <div className="px-2.5 py-0.5 text-[8px] uppercase tracking-wider font-semibold text-slate-400 border-b border-[#1b254a]">
                      Voice Profiles
                    </div>
                    <button
                      onClick={() => applyEQPreset(activeEqTrack.id, 'vocal')}
                      className="w-full text-left px-2.5 py-1 text-slate-200 hover:bg-[#1a2656] hover:text-cyan-300 cursor-pointer"
                    >
                      Dialogue Clarity
                    </button>
                    <button
                      onClick={() => applyEQPreset(activeEqTrack.id, 'podcast')}
                      className="w-full text-left px-2.5 py-1 text-slate-200 hover:bg-[#1a2656] hover:text-cyan-300 cursor-pointer"
                    >
                      Podcast Warmth
                    </button>
                    <div className="px-2.5 py-0.5 text-[8px] uppercase tracking-wider font-semibold text-slate-400 border-b border-[#1b254a] mt-1">
                      Music & Tone
                    </div>
                    <button
                      onClick={() => applyEQPreset(activeEqTrack.id, 'bass-boost')}
                      className="w-full text-left px-2.5 py-1 text-slate-200 hover:bg-[#1a2656] hover:text-cyan-300 cursor-pointer"
                    >
                      Bass Punch
                    </button>
                    <button
                      onClick={() => applyEQPreset(activeEqTrack.id, 'bright')}
                      className="w-full text-left px-2.5 py-1 text-slate-200 hover:bg-[#1a2656] hover:text-cyan-300 cursor-pointer"
                    >
                      Air & Shimmer
                    </button>
                    <button
                      onClick={() => applyEQPreset(activeEqTrack.id, 'warmth')}
                      className="w-full text-left px-2.5 py-1 text-slate-200 hover:bg-[#1a2656] hover:text-cyan-300 cursor-pointer"
                    >
                      Analog Warmth
                    </button>
                    <div className="my-1 border-t border-[#1b254a]" />
                    <button
                      onClick={() => applyEQPreset(activeEqTrack.id, 'flat')}
                      className="w-full text-left px-2.5 py-1 text-rose-300 hover:bg-rose-950/50 cursor-pointer"
                    >
                      Reset to Flat (0dB)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeEqTrack ? (
            <div className="flex-1 flex flex-col justify-between space-y-3">
              {/* Spacious Interactive EQ Frequency Graph */}
              <div className="h-20 bg-slate-950 rounded-lg border border-[#1b254a] relative overflow-hidden p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono">
                  <span>100 Hz</span>
                  <span>1 kHz</span>
                  <span>10 kHz</span>
                </div>

                <svg className="w-full h-12 overflow-visible" viewBox="0 0 140 64">
                  <line x1="0" y1="32" x2="140" y2="32" stroke="#1c2b5c" strokeWidth="1" strokeDasharray="3,3" />
                  <path
                    d={getEQCurvePath(activeEq, 64)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    className="transition-all duration-150"
                  />
                  {/* EQ Nodes */}
                  <circle cx="20" cy={32 - (activeEq.low / 15) * 24} r="3.5" fill="#a855f7" />
                  <circle cx="70" cy={32 - (activeEq.mid / 15) * 24} r="3.5" fill="#6366f1" />
                  <circle cx="120" cy={32 - (activeEq.high / 15) * 24} r="3.5" fill="#06b6d4" />
                </svg>

                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-purple-400">Low: {activeEq.low > 0 ? `+${activeEq.low}` : activeEq.low}dB</span>
                  <span className="text-indigo-400">Mid: {activeEq.mid > 0 ? `+${activeEq.mid}` : activeEq.mid}dB</span>
                  <span className="text-cyan-400">High: {activeEq.high > 0 ? `+${activeEq.high}` : activeEq.high}dB</span>
                </div>
              </div>

              {/* Parametric Band Sliders */}
              <div className="space-y-2 bg-[#0c1126] p-2.5 rounded-lg border border-[#1a2346]">
                {/* Low Band */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                    <span className="font-semibold text-purple-300">Low Bass (100 Hz)</span>
                    <span className="font-mono text-purple-400">{activeEq.low > 0 ? `+${activeEq.low}` : activeEq.low} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={activeEq.low}
                    onChange={(e) => handleEQSliderChange(activeEqTrack.id, 'low', parseInt(e.target.value))}
                    className="w-full h-2 accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Mid Band */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                    <span className="font-semibold text-indigo-300">Mid Range (1.2 kHz)</span>
                    <span className="font-mono text-indigo-400">{activeEq.mid > 0 ? `+${activeEq.mid}` : activeEq.mid} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={activeEq.mid}
                    onChange={(e) => handleEQSliderChange(activeEqTrack.id, 'mid', parseInt(e.target.value))}
                    className="w-full h-2 accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* High Band */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                    <span className="font-semibold text-cyan-300">High Treble (10 kHz)</span>
                    <span className="font-mono text-cyan-400">{activeEq.high > 0 ? `+${activeEq.high}` : activeEq.high} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={activeEq.high}
                    onChange={(e) => handleEQSliderChange(activeEqTrack.id, 'high', parseInt(e.target.value))}
                    className="w-full h-2 accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Reset Channel EQ Button */}
              <button
                onClick={() => handleResetEQ(activeEqTrack.id)}
                className="w-full py-1 rounded bg-[#131b36] hover:bg-[#1a254c] border border-[#202e5e] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset {activeEqTrack.name} EQ to Flat</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No audio tracks available to equalize.
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: MASTER BUS & DYNAMICS */}
      {activeTab === 'master' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#070a18] p-3 overflow-y-auto space-y-3">
          <div className="bg-[#0c1126] p-2.5 rounded-lg border border-[#1a2346] space-y-2">
            <span className="text-[10px] uppercase font-semibold text-sky-400 tracking-wider block">
              Master Bus Dynamics
            </span>

            {/* Soft Limiter Toggle */}
            <div className="flex items-center justify-between py-1 border-b border-[#182247]">
              <div>
                <span className="text-slate-200 font-medium block">Brickwall Soft Limiter</span>
                <span className="text-[9px] text-slate-400">Prevents digital clipping distortion above -0.5 dB</span>
              </div>
              <button
                onClick={() => setSoftLimiter(!softLimiter)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  softLimiter ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    softLimiter ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Mono Compatibility Check */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-slate-200 font-medium block">Mono Compatibility Mode</span>
                <span className="text-[9px] text-slate-400">Sum left and right channels to check phase issues</span>
              </div>
              <button
                onClick={() => setMonoCheck(!monoCheck)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  monoCheck ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    monoCheck ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Master Fader & Headroom overview */}
          <div className="bg-[#0c1126] p-2.5 rounded-lg border border-[#1a2346] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Master Output Level
              </span>
              <span className="text-[10px] font-mono text-sky-400 font-bold">
                {masterVolume === 0 ? '-∞ dB' : `${Math.round((masterVolume - 1) * 6)} dB (${Math.round(masterVolume * 100)}%)`}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1.5"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onUpdateMasterVolume(parseFloat(e.target.value))}
              className="w-full h-2.5 accent-sky-500 cursor-pointer"
            />

            <div className="flex gap-1.5 pt-1">
              <button
                onClick={() => onUpdateMasterVolume(1.0)}
                className="flex-1 py-1 rounded bg-[#131b36] hover:bg-[#1a254c] text-slate-300 hover:text-white text-[10px] font-mono"
              >
                Unity (0 dB)
              </button>
              <button
                onClick={() => onUpdateMasterVolume(0.85)}
                className="flex-1 py-1 rounded bg-[#131b36] hover:bg-[#1a254c] text-slate-300 hover:text-white text-[10px] font-mono"
              >
                Broadcast (-2 dB)
              </button>
              <button
                onClick={() => onUpdateMasterVolume(0)}
                className="flex-1 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px]"
              >
                Mute All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
