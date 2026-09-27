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
  onOpenAIVideo?: () => void;
  onOpenShortcuts?: () => void;
  onAddGenerator: (type: 'smpte-bars' | 'countdown') => void;
  onApplyEffectToSelected?: (effectName: string) => void;
}

export const ProjectBin: React.FC<ProjectBinProps> = ({
  mediaItems,
  selectedMediaId,
  onSelectMedia,
  onDoubleClickMedia,
  onImportFiles,
  onOpenDrive,
  onOpenAIVideo,
  onOpenShortcuts,
  onAddGenerator,
  onApplyEffectToSelected,
}) => {
  const [activeTab, setActiveTab] = useState<'bin' | 'effects' | 'generators' | 'help'>('bin');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const filteredMedia = mediaItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const effectsList = [
    { id: 'gaussian-blur', name: 'Gaussian Blur', category: 'Blur', desc: 'Smooth frame details' },
    { id: 'glitch', name: 'Digital Glitch FX', category: 'Stylize', desc: 'RGB chromatic shift' },
    { id: 'mirror', name: 'Mirror Invert', category: 'Distort', desc: 'Horizontal mirror' },
    { id: 'black-and-white', name: 'Monochrome Noir', category: 'Color', desc: 'B&W monochrome' },
    { id: 'edge-glow', name: 'Anamorphic Glow', category: 'Stylize', desc: 'Cyan light glow' },
    { id: 'cross-dissolve', name: 'Cross Dissolve', category: 'Transition', desc: 'Alpha fade' },
    { id: 'dip-to-black', name: 'Dip to Black', category: 'Transition', desc: 'Fade down' },
    { id: 'wipe-left', name: 'Wipe Transition', category: 'Transition', desc: 'Horizontal wipe' },
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
      className="flex-1 flex flex-col bg-[#101014] border border-[#222228] overflow-hidden select-none text-xs"
    >
      {/* Modern Tab Bar */}
      <div className="h-8 bg-[#131318] border-b border-[#222228] px-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('bin')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'bin'
                ? 'bg-neutral-800 text-sky-400 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Media</span>
            <span className="text-[10px] text-neutral-500 font-mono">({mediaItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'effects'
                ? 'bg-neutral-800 text-purple-400 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>FX</span>
          </button>

          <button
            onClick={() => setActiveTab('generators')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'generators'
                ? 'bg-neutral-800 text-amber-400 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Generators</span>
          </button>

          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'help'
                ? 'bg-neutral-800 text-emerald-400 shadow-xs'
                : 'text-neutral-400 hover:text-white'
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
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectMedia(item)}
                      onDoubleClick={() => onDoubleClickMedia(item)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(item));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`px-2 py-1.5 rounded-md flex items-center justify-between cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-[#1a1f28] border-sky-500/60 text-white shadow-xs'
                          : 'bg-[#141418] border-[#1d1d24] text-neutral-300 hover:bg-[#1a1a22] hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
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
                            <span>{formatDurationSeconds(item.duration)}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                        {formatDurationSeconds(item.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredMedia.map((item) => {
                  const isSelected = selectedMediaId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectMedia(item)}
                      onDoubleClick={() => onDoubleClickMedia(item)}
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
                      <div className="aspect-video bg-black rounded overflow-hidden relative flex items-center justify-center border border-neutral-800">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-neutral-500 font-mono">[{item.type}]</span>
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[9px] text-neutral-300 font-mono">
                          {formatDurationSeconds(item.duration)}
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

        {/* Generators Tab */}
        {activeTab === 'generators' && (
          <div className="space-y-2">
            <div className="text-[11px] text-neutral-400 px-1">
              Add studio test leaders and graphics:
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
