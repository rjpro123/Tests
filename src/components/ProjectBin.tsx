import React, { useState } from 'react';
import { 
  Folder, 
  Film, 
  Music, 
  Image as ImageIcon, 
  Upload, 
  Search, 
  Sliders, 
  Sparkles, 
  Plus, 
  Grid, 
  List,
  HardDrive,
  HelpCircle,
  Keyboard,
  ExternalLink,
  Layers,
  Wand2
} from 'lucide-react';
import { MediaItem } from '../types/editor';
import { formatDurationSeconds } from '../utils/timecode';

interface ProjectBinProps {
  mediaItems: MediaItem[];
  selectedMediaId: string | null;
  onSelectMedia: (item: MediaItem) => void;
  onDoubleClickMedia: (item: MediaItem) => void;
  onImportFiles: (files: FileList) => void;
  onOpenDrive?: () => void;
  onOpenShortcuts?: () => void;
  onAddGenerator: (type: 'smpte-bars' | 'countdown') => void;
  onAddAdjustmentLayer?: () => void;
  onAddEffectsLayer?: () => void;
  onApplyEffectToSelected?: (effectName: string) => void;
}

export const ProjectBin: React.FC<ProjectBinProps> = ({
  mediaItems,
  selectedMediaId,
  onSelectMedia,
  onDoubleClickMedia,
  onImportFiles,
  onOpenDrive,
  onOpenShortcuts,
  onAddGenerator,
  onAddAdjustmentLayer,
  onAddEffectsLayer,
  onApplyEffectToSelected,
}) => {
  const [activeTab, setActiveTab] = useState<'bin' | 'effects' | 'generators' | 'help'>('bin');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'video' | 'audio' | 'image' | 'generator'>('all');
  const [hoverScrub, setHoverScrub] = useState<{ id: string; percent: number; time: number } | null>(null);
  const hoverVideoRefs = React.useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const filteredMedia = mediaItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = mediaTypeFilter === 'all' || item.type === mediaTypeFilter;
    return matchesSearch && matchesType;
  });

  const mediaCounts = {
    all: mediaItems.length,
    video: mediaItems.filter((m) => m.type === 'video').length,
    audio: mediaItems.filter((m) => m.type === 'audio').length,
    image: mediaItems.filter((m) => m.type === 'image').length,
    generator: mediaItems.filter((m) => m.type === 'generator').length,
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const effectsList = [
    { id: 'ae-optical-flares', name: 'Optical Flares Pro', category: 'AE Plugin', desc: 'Anamorphic lens flares, streaks & halos' },
    { id: 'ae-trapcode-particles', name: 'Trapcode Particular', category: 'AE Plugin', desc: 'Embers, sparks, stardust & cosmic snow' },
    { id: 'ae-deep-glow', name: 'Deep Glow Studio', category: 'AE Plugin', desc: 'Multi-tier anamorphic aura bloom' },
    { id: 'ae-chromatic-aberration', name: 'Chromatic Aberration', category: 'AE Plugin', desc: 'RGB prism split & lens dispersion' },
    { id: 'ae-vhs-glitch', name: 'VHS Tape & CRT Damage', category: 'AE Plugin', desc: 'Scanlines, static noise & VCR timestamp' },
    { id: 'ae-wave-displacement', name: 'Turbulent Wave Warp', category: 'AE Plugin', desc: 'Liquid heat shimmer & refraction' },
    { id: 'ae-light-rays', name: 'CC Light Rays', category: 'AE Plugin', desc: 'Volumetric god rays from light origin' },
    { id: 'ae-halftone', name: 'Halftone & Pixel Matrix', category: 'AE Plugin', desc: 'Retro halftone print dots & pixel grid' },
    { id: 'gaussian-blur', name: 'Gaussian Blur', category: 'Blur', desc: 'Smooth frame details & defocus' },
    { id: 'glitch', name: 'Digital Glitch FX', category: 'Stylize', desc: 'Cyberpunk digital corruption' },
    { id: 'black-and-white', name: 'Monochrome Noir', category: 'Color', desc: 'Cinematic B&W contrast' },
    { id: 'cross-dissolve', name: 'Cross Dissolve', category: 'Transition', desc: 'Smooth alpha crossfade' },
    { id: 'dip-to-black', name: 'Dip to Black', category: 'Transition', desc: 'Fade down to black' },
    { id: 'wipe-left', name: 'Wipe Transition', category: 'Transition', desc: 'Directional horizontal wipe' },
  ];

  const quickShortcuts = [
    { key: 'V', desc: 'Selection Tool', cat: 'Tools' },
    { key: 'C', desc: 'Razor Cut Tool', cat: 'Tools' },
    { key: 'T', desc: 'Type Title Tool', cat: 'Tools' },
    { key: 'Space', desc: 'Play / Pause', cat: 'Transport' },
    { key: 'J / K / L', desc: 'Variable Shuttle (-4x to 4x)', cat: 'Transport' },
    { key: 'K + J / L', desc: 'Slow Scrub / Frame Step', cat: 'Transport' },
    { key: '← / →', desc: 'Step 1 Frame (Shift: 5f)', cat: 'Transport' },
    { key: 'I / O', desc: 'Mark In / Out Point', cat: 'Transport' },
    { key: 'Ctrl + S', desc: 'Save Project File', cat: 'File' },
    { key: 'Ctrl + K', desc: 'Split at Playhead', cat: 'Edit' },
    { key: 'M', desc: 'Add / Edit Marker', cat: 'Timeline' },
    { key: 'Shift + M', desc: 'Next Marker on Timeline', cat: 'Timeline' },
    { key: 'Shift + Del', desc: 'Ripple Delete', cat: 'Edit' },
    { key: 'Del', desc: 'Delete Selected Clip', cat: 'Edit' },
    { key: 'Marquee', desc: 'Drag empty space to select', cat: 'Multi' },
    { key: 'Ctrl + A', desc: 'Select All clips', cat: 'Multi' },
    { key: 'Ctrl + D', desc: 'Default Transition', cat: 'Effects' },
    { key: '\\', desc: 'Fit Sequence to View', cat: 'View' },
    { key: '= / -', desc: 'Zoom In / Out', cat: 'View' },
    { key: 'S', desc: 'Toggle Snapping', cat: 'Timeline' },
    { key: 'Ctrl + Z / Y', desc: 'Undo / Redo', cat: 'Edit' },
    { key: 'Ctrl + M', desc: 'Export Media Dialog', cat: 'Export' },
  ];

  const filteredShortcuts = quickShortcuts.filter((s) =>
    s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex-1 flex flex-col bg-[#0d1226] border border-[#1b254a] overflow-hidden select-none text-xs"
    >
      {/* Modern Tab Bar */}
      <div className="h-8 bg-[#131b36] border-b border-[#1b254a] px-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('bin')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'bin'
                ? 'bg-[#1b254a] text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Media</span>
            <span className="text-[10px] text-slate-400 font-mono">({mediaItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'effects'
                ? 'bg-[#1b254a] text-purple-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>FX</span>
          </button>

          <button
            onClick={() => setActiveTab('generators')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'generators'
                ? 'bg-[#1b254a] text-amber-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Generators</span>
          </button>

          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'help'
                ? 'bg-[#1b254a] text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Keys</span>
          </button>
        </div>

        {activeTab === 'bin' && (
          <div className="flex items-center gap-0.5 bg-[#1b1b22] p-0.5 rounded-md border border-[#272732]">
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewMode === 'list' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewMode === 'grid' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modern Search & Quick Action Bar */}
      <div className="h-8 bg-[#121216] border-b border-[#222228] px-2 flex items-center justify-between gap-2">
        <div className="flex-1 relative flex items-center">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'bin' 
                ? 'Search media...' 
                : activeTab === 'effects' 
                ? 'Search effects...' 
                : activeTab === 'help'
                ? 'Search shortcuts...'
                : 'Search...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181820] text-neutral-200 placeholder:text-neutral-500 pl-7 pr-2 py-1 text-xs rounded-md border border-[#272732] focus:border-sky-500 outline-none"
          />
        </div>

        {activeTab === 'bin' && (
          <label className="flex items-center gap-1 px-2 py-1 bg-[#181820] hover:bg-[#22222c] border border-[#272732] text-neutral-300 hover:text-white rounded-md text-xs font-medium cursor-pointer transition-colors shrink-0">
            <Upload className="w-3 h-3 text-sky-400" />
            <span>Import</span>
            <input
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onImportFiles(e.target.files);
              }}
            />
          </label>
        )}

        {activeTab === 'help' && onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title="Open Full Shortcuts Sheet (?)"
            className="flex items-center gap-1 px-2 py-1 bg-[#13221b] hover:bg-[#1a3026] border border-emerald-500/40 text-emerald-300 rounded-md text-xs font-medium cursor-pointer shrink-0 transition-colors"
          >
            <HelpCircle className="w-3 h-3 text-emerald-400" />
            <span>Full Sheet</span>
          </button>
        )}
      </div>

      {/* Media Type Quick Filter Tags */}
      {activeTab === 'bin' && (
        <div className="bg-[#0f1426] border-b border-[#1b254a] px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All', count: mediaCounts.all },
            { id: 'video', label: 'Video', count: mediaCounts.video },
            { id: 'audio', label: 'Audio', count: mediaCounts.audio },
            { id: 'image', label: 'Images', count: mediaCounts.image },
            { id: 'generator', label: 'Generators', count: mediaCounts.generator },
          ].map((tag) => {
            const isActive = mediaTypeFilter === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setMediaTypeFilter(tag.id as any)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 border ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-xs'
                    : 'bg-[#141c38] border-[#1f2c58] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <span>{tag.label}</span>
                <span className={`text-[9px] px-1 rounded-full font-mono ${isActive ? 'bg-sky-400/30 text-sky-200' : 'bg-black/40 text-slate-500'}`}>
                  {tag.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Bin Tab */}
        {activeTab === 'bin' && (
          <div>
            {filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
                <Upload className="w-6 h-6 text-neutral-600 mb-1" />
                <span className="text-xs text-neutral-300 font-medium">No Media Found</span>
                <span className="text-[11px] text-neutral-500 mt-0.5">
                  Drag & drop footage here or click Import
                </span>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-1">
                {filteredMedia.map((item) => {
                  const isSelected = selectedMediaId === item.id;
                  const isScrubbing = hoverScrub?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectMedia(item)}
                      onDoubleClick={() => onDoubleClickMedia(item)}
                      onMouseMove={(e) => {
                        if (item.type === 'video' && item.duration > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          const time = percent * item.duration;
                          setHoverScrub({ id: item.id, percent, time });
                          const vid = hoverVideoRefs.current[item.id];
                          if (vid && isFinite(time)) {
                            vid.currentTime = time;
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        if (hoverScrub?.id === item.id) {
                          setHoverScrub(null);
                        }
                      }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(item));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`px-2 py-1.5 rounded-md flex items-center justify-between cursor-pointer transition-all border relative overflow-hidden group ${
                        isSelected
                          ? 'bg-[#1a1f28] border-sky-500/60 text-white shadow-xs'
                          : 'bg-[#141418] border-[#1d1d24] text-neutral-300 hover:bg-[#1a1a22] hover:border-neutral-700'
                      }`}
                    >
                      {/* Hover scrub line for video */}
                      {isScrubbing && (
                        <div
                          style={{ left: `${hoverScrub.percent * 100}%` }}
                          className="absolute top-0 bottom-0 w-[2px] bg-sky-400 z-20 pointer-events-none shadow-xs"
                        />
                      )}

                      <div className="flex items-center gap-2 truncate pr-2 relative z-10">
                        <span className="shrink-0 p-1 rounded bg-black/40 text-neutral-400">
                          {item.type === 'video' && <Film className="w-3.5 h-3.5 text-sky-400" />}
                          {item.type === 'audio' && <Music className="w-3.5 h-3.5 text-emerald-400" />}
                          {item.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
                          {item.type === 'generator' && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                        </span>
                        <div className="truncate">
                          <div className="font-medium text-xs truncate">{item.name}</div>
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 font-mono">
                            <span>{item.type.toUpperCase()}</span>
                            <span>•</span>
                            <span>
                              {isScrubbing
                                ? `Scrub: ${formatDurationSeconds(hoverScrub.time)}`
                                : formatDurationSeconds(item.duration)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-neutral-500 font-mono shrink-0 relative z-10">
                        {isScrubbing ? (
                          <span className="text-sky-300 font-semibold">{formatDurationSeconds(hoverScrub.time)}</span>
                        ) : (
                          formatDurationSeconds(item.duration)
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredMedia.map((item) => {
                  const isSelected = selectedMediaId === item.id;
                  const isScrubbing = hoverScrub?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectMedia(item)}
                      onDoubleClick={() => onDoubleClickMedia(item)}
                      onMouseMove={(e) => {
                        if (item.type === 'video' && item.duration > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          const time = percent * item.duration;
                          setHoverScrub({ id: item.id, percent, time });
                          const vid = hoverVideoRefs.current[item.id];
                          if (vid && isFinite(time)) {
                            vid.currentTime = time;
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        if (hoverScrub?.id === item.id) {
                          setHoverScrub(null);
                        }
                      }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(item));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`p-1.5 rounded-md border flex flex-col cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1a1f28] border-sky-500 text-white shadow-xs'
                          : 'bg-[#141418] border-[#1d1d24] hover:border-neutral-700'
                      }`}
                    >
                      <div className="aspect-video bg-black rounded overflow-hidden relative flex items-center justify-center border border-neutral-800 group">
                        {item.url && item.type === 'video' ? (
                          <>
                            <video
                              ref={(el) => {
                                hoverVideoRefs.current[item.id] = el;
                              }}
                              src={item.url}
                              muted
                              playsInline
                              preload="metadata"
                              className={`w-full h-full object-cover ${isScrubbing ? 'block' : item.thumbnail ? 'hidden' : 'block'}`}
                            />
                            {item.thumbnail && !isScrubbing && (
                              <img
                                src={item.thumbnail}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </>
                        ) : item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-neutral-500 font-mono">[{item.type}]</span>
                        )}

                        {/* Hover Scrub Playhead & Progress Indicator */}
                        {isScrubbing && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div
                              style={{ width: `${hoverScrub.percent * 100}%` }}
                              className="absolute top-0 bottom-0 left-0 bg-sky-500/20"
                            />
                            <div
                              style={{ left: `${hoverScrub.percent * 100}%` }}
                              className="absolute top-0 bottom-0 w-[2px] bg-sky-400 shadow-md"
                            />
                            <div className="absolute top-1 left-1 bg-black/90 px-1.5 py-0.5 rounded text-[9px] text-sky-300 font-mono font-bold border border-sky-500/40">
                              {formatDurationSeconds(hoverScrub.time)}
                            </div>
                          </div>
                        )}

                        <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[9px] text-neutral-300 font-mono">
                          {isScrubbing ? formatDurationSeconds(hoverScrub.time) : formatDurationSeconds(item.duration)}
                        </span>
                      </div>
                      <div className="text-xs truncate font-medium text-neutral-200 mt-1">
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-neutral-400 px-1">
              Click or drag effect onto selected clip:
            </div>
            {effectsList.map((eff) => (
              <div
                key={eff.id}
                onClick={() => onApplyEffectToSelected?.(eff.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'effect', id: eff.id, name: eff.name }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="p-2 rounded-md bg-[#141418] hover:bg-[#1a1a24] border border-[#1d1d24] hover:border-purple-500/50 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between text-xs"
              >
                <div className="truncate pr-2">
                  <span className="text-neutral-200 font-medium block truncate">{eff.name}</span>
                  <span className="text-[11px] text-neutral-500">{eff.desc}</span>
                </div>
                <span className="text-[10px] text-purple-400 bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 rounded shrink-0 font-medium">
                  {eff.category}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Generators & Layers Tab */}
        {activeTab === 'generators' && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-neutral-400 px-1 font-semibold text-slate-300 uppercase tracking-wider">
              Layers & Generators
            </div>

            {/* Non-Destructive Adjustment Layer - Sleek List Item */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'adjustment-layer' }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="p-1.5 px-2 rounded-md bg-[#141418] hover:bg-[#1a1626] border border-[#231b34] hover:border-purple-500/50 flex items-center justify-between cursor-grab text-xs transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Wand2 className="w-3 h-3" />
                </div>
                <div className="truncate">
                  <div className="text-purple-200 font-medium text-xs flex items-center gap-1.5 truncate">
                    <span>Adjustment Layer</span>
                    <span className="text-[9px] bg-purple-900/60 px-1 py-0.2 rounded font-mono text-purple-300">ADJ</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onAddAdjustmentLayer}
                title="Add Adjustment Layer to top video track"
                className="px-2 py-0.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white font-medium text-[11px] rounded cursor-pointer transition-colors shrink-0 shadow-xs"
              >
                + Add
              </button>
            </div>

            {/* Procedural Effects Layer - Sleek List Item */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'effects-layer' }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="p-1.5 px-2 rounded-md bg-[#141418] hover:bg-[#201524] border border-[#2d1b32] hover:border-pink-500/50 flex items-center justify-between cursor-grab text-xs transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-300 shrink-0">
                  <Sparkles className="w-3 h-3" />
                </div>
                <div className="truncate">
                  <div className="text-pink-200 font-medium text-xs flex items-center gap-1.5 truncate">
                    <span>Effects Layer</span>
                    <span className="text-[9px] bg-pink-900/60 px-1 py-0.2 rounded font-mono text-pink-300">FX</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onAddEffectsLayer}
                title="Add Effects Layer to top video track"
                className="px-2 py-0.5 bg-pink-950/70 hover:bg-pink-900 border border-pink-500/40 text-pink-300 hover:text-white font-medium text-[11px] rounded cursor-pointer transition-colors shrink-0 shadow-xs"
              >
                + Add
              </button>
            </div>

            {/* SMPTE Bars */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'generator', generatorType: 'smpte-bars' }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="p-2 rounded-md bg-[#141418] border border-[#1d1d24] hover:border-sky-500/50 flex items-center justify-between cursor-grab text-xs transition-colors"
            >
              <div>
                <div className="text-neutral-200 font-medium">SMPTE Color Bars</div>
                <div className="text-[11px] text-neutral-500">75% broadcast bars + 1kHz tone</div>
              </div>
              <button
                onClick={() => onAddGenerator('smpte-bars')}
                className="px-2 py-1 bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-xs rounded-md cursor-pointer font-medium"
              >
                + Add
              </button>
            </div>

            {/* Countdown Leader */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'generator', generatorType: 'countdown' }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="p-2 rounded-md bg-[#141418] border border-[#1d1d24] hover:border-amber-500/50 flex items-center justify-between cursor-grab text-xs transition-colors"
            >
              <div>
                <div className="text-neutral-200 font-medium">Film Countdown</div>
                <div className="text-[11px] text-neutral-500">5-4-3-2-1 cinema leader</div>
              </div>
              <button
                onClick={() => onAddGenerator('countdown')}
                className="px-2 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs rounded-md cursor-pointer font-medium"
              >
                + Add
              </button>
            </div>
          </div>
        )}

        {/* Shortcuts Tab */}
        {activeTab === 'help' && (
          <div className="space-y-1">
            <div className="space-y-1">
              {filteredShortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="px-2 py-1.5 rounded-md bg-[#141418] border border-[#1d1d24] flex items-center justify-between text-xs hover:border-neutral-700"
                >
                  <span className="text-neutral-300 truncate pr-2 text-[11px]">{sc.desc}</span>
                  <span className="text-sky-300 font-mono font-medium bg-[#1a1a24] px-1.5 py-0.5 rounded border border-sky-500/30 text-[10px] shrink-0">
                    {sc.key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
