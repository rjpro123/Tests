import React, { useState, useMemo } from 'react';
import { 
  X, 
  Keyboard, 
  Search, 
  Copy, 
  Check, 
  Layers, 
  Scissors, 
  Play, 
  Film, 
  Sliders, 
  Sparkles, 
  HelpCircle,
  HardDrive,
  ZoomIn,
  Download,
  Info
} from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  desc: string;
  category: string;
  badge?: string;
  macKey?: string;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const categories = [
    { id: 'all', name: 'All Shortcuts', icon: Keyboard },
    { id: 'tools', name: 'Tools Palette', icon: Scissors },
    { id: 'playback', name: 'Playback & Shuttle', icon: Play },
    { id: 'timeline', name: 'Timeline & Editing', icon: Film },
    { id: 'multiselect', name: 'Multi-Select & Clips', icon: Layers },
    { id: 'navigation', name: 'Navigation & Zoom', icon: ZoomIn },
    { id: 'cloud', name: 'Cloud, AI & Export', icon: Sparkles },
  ];

  const shortcuts: ShortcutItem[] = [
    // Tools Palette
    { key: 'V', desc: 'Selection Tool (Move, select, and slip clips)', category: 'tools' },
    { key: 'C', desc: 'Razor Tool (Click any clip on timeline to cut/split)', category: 'tools', badge: 'Essential' },
    { key: 'A', desc: 'Track Select Forward Tool', category: 'tools' },
    { key: 'Shift + A', desc: 'Track Select Backward Tool', category: 'tools' },
    { key: 'B', desc: 'Ripple Edit Tool (Trim clip and shift subsequent clips)', category: 'tools' },
    { key: 'N', desc: 'Rolling Edit Tool (Adjust edit point between two adjacent clips)', category: 'tools' },
    { key: 'R', desc: 'Rate Stretch Tool (Speed up or slow down clip duration)', category: 'tools' },
    { key: 'Y', desc: 'Slip Tool (Change in/out frame without moving clip position)', category: 'tools' },
    { key: 'U', desc: 'Slide Tool (Move clip on timeline while trimming neighbors)', category: 'tools' },
    { key: 'P', desc: 'Pen Tool (Keyframing and precision points)', category: 'tools' },
    { key: 'H', desc: 'Hand Tool (Pan across timeline without moving playhead)', category: 'tools' },
    { key: 'Z', desc: 'Zoom Tool (Click to zoom in on timeline)', category: 'tools' },
    { key: 'T', desc: 'Type Tool (Create Title Graphic text overlay)', category: 'tools', badge: 'New' },

    // Playback & Shuttle
    { key: 'Space', desc: 'Play / Pause Toggle', category: 'playback', badge: 'Essential' },
    { key: 'J', desc: 'Shuttle Reverse (Press repeatedly for -1x, -2x, -4x variable rewind)', category: 'playback', badge: 'Essential' },
    { key: 'K', desc: 'Shuttle Stop / Pause playback (Hold K as modifier)', category: 'playback', badge: 'Essential' },
    { key: 'L', desc: 'Shuttle Forward (Press repeatedly for 1x, 2x, 4x variable fast-forward)', category: 'playback', badge: 'Essential' },
    { key: 'K + L', desc: 'Step 1 Frame forward / Hold for 0.5x slow-motion forward scrub', category: 'playback' },
    { key: 'K + J', desc: 'Step 1 Frame backward / Hold for -0.5x slow-motion reverse scrub', category: 'playback' },
    { key: '← / →', desc: 'Step 1 Frame Backward / Forward', category: 'playback' },
    { key: 'Shift + ← / →', desc: 'Step 5 Frames Backward / Forward', category: 'playback' },
    { key: '↑ / ↓', desc: 'Jump to Previous / Next Edit Point (Clip boundary)', category: 'playback' },
    { key: 'Home / End', desc: 'Jump to Sequence Start (00:00:00:00) / End', category: 'playback' },
    { key: 'I', desc: 'Mark In Point', category: 'playback' },
    { key: 'O', desc: 'Mark Out Point', category: 'playback' },
    { key: 'Alt + X', macKey: '⌥ + X', desc: 'Clear In and Out Points', category: 'playback' },
    { key: 'Shift + I', desc: 'Go directly to In Point', category: 'playback' },
    { key: 'Shift + O', desc: 'Go directly to Out Point', category: 'playback' },
    { key: 'D', desc: 'Select clip under playhead on active track', category: 'playback' },

    // Timeline & Editing
    { key: 'Ctrl + S', macKey: '⌘ + S', desc: 'Save Project (Instant browser save + snapshot)', category: 'timeline', badge: 'Essential' },
    { key: 'Ctrl + Shift + S', macKey: '⌘ + Shift + S', desc: 'Save Project As / Download .cineflow file', category: 'timeline' },
    { key: 'Ctrl + O', macKey: '⌘ + O', desc: 'Open Project File (.cineflow / .json) / Recent', category: 'timeline' },
    { key: 'Ctrl + K', macKey: '⌘ + K', desc: 'Add Edit / Split Clip at current playhead position', category: 'timeline', badge: 'Essential' },
    { key: 'Ctrl + Shift + K', macKey: '⌘ + Shift + K', desc: 'Add Edit to ALL tracks at playhead position', category: 'timeline' },
    { key: ',', desc: 'Insert Edit from Source to Timeline at playhead', category: 'timeline' },
    { key: '.', desc: 'Overwrite Edit from Source to Timeline at playhead', category: 'timeline' },
    { key: 'Shift + Delete', macKey: 'Shift + ⌫', desc: 'Ripple Delete (Delete clip and close empty gap automatically)', category: 'timeline', badge: 'Pro' },
    { key: "'", desc: 'Quick Ripple Delete selected clip', category: 'timeline' },
    { key: 'Delete / Backspace', macKey: '⌫', desc: 'Clear / Delete selected clip(s)', category: 'timeline' },
    { key: 'Ctrl + D', macKey: '⌘ + D', desc: 'Apply Default Video Transition (Cross Dissolve)', category: 'timeline' },
    { key: 'Ctrl + Z', macKey: '⌘ + Z', desc: 'Undo last editing action', category: 'timeline', badge: 'Essential' },
    { key: 'Ctrl + Y', macKey: '⌘ + Shift + Z', desc: 'Redo previously undone action', category: 'timeline' },

    // Multi-Select & Clips
    { key: 'Click + Drag on Empty Space', desc: 'Marquee Selection Box (Select multiple clips across tracks)', category: 'multiselect', badge: 'New' },
    { key: 'Ctrl / ⌘ + Click', macKey: '⌘ + Click', desc: 'Add / remove individual clip to multi-selection group', category: 'multiselect' },
    { key: 'Shift + Click', desc: 'Range select / toggle clip in selection', category: 'multiselect' },
    { key: 'Drag Any Selected Clip', desc: 'Move all selected clips together along time and between tracks', category: 'multiselect', badge: 'Pro' },
    { key: 'Ctrl + A', macKey: '⌘ + A', desc: 'Select All clips on the timeline', category: 'multiselect' },
    { key: 'Escape', desc: 'Deselect all clips / Clear selection', category: 'multiselect' },

    // Navigation & Zoom
    { key: '\\', desc: 'Fit Entire Sequence to Screen (Toggle zoom-to-fit view)', category: 'navigation', badge: 'Essential' },
    { key: '= / +', desc: 'Zoom In Timeline', category: 'navigation' },
    { key: '-', desc: 'Zoom Out Timeline', category: 'navigation' },
    { key: 'S', desc: 'Toggle Timeline Snapping (Magnetic snap to clip boundaries & markers)', category: 'navigation' },
    { key: 'M', desc: 'Add Timestamped Marker at playhead position / Open edit modal', category: 'navigation', badge: 'New' },
    { key: 'Shift + M', desc: 'Jump to Next Marker on timeline', category: 'navigation' },
    { key: 'Ctrl + Shift + M', macKey: '⌥ + Shift + M', desc: 'Jump to Previous Marker on timeline', category: 'navigation' },
    { key: '~ / `', desc: 'Maximize Program Monitor / Toggle Fullscreen preview', category: 'navigation' },

    // Cloud, AI & Export
    { key: 'Ctrl + M', macKey: '⌘ + M', desc: 'Open Export Media dialog', category: 'cloud', badge: 'Essential' },
    { key: 'Ctrl + I', macKey: '⌘ + I', desc: 'Import Media files dialog', category: 'cloud' },
    { key: '?', desc: 'Open this Keyboard Shortcuts & Help Center', category: 'cloud' },
    { key: 'F1', desc: 'Quick Help & Keyboard Reference', category: 'cloud' },
  ];

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = 
        !filter ||
        item.key.toLowerCase().includes(filter.toLowerCase()) ||
        item.desc.toLowerCase().includes(filter.toLowerCase()) ||
        item.category.toLowerCase().includes(filter.toLowerCase()) ||
        (item.macKey && item.macKey.toLowerCase().includes(filter.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [shortcuts, selectedCategory, filter]);

  const handleCopyCheatsheet = () => {
    const text = shortcuts
      .map((s) => `${s.key.padEnd(24)} | ${s.desc} (${s.category})`)
      .join('\n');
    navigator.clipboard.writeText(`# CineFlow Studio - Keyboard Shortcuts Reference\n\n` + text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 select-none font-mono">
      <div className="bg-[#09090c] border border-[#27272a] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
        {/* Terminal Title Bar */}
        <div className="h-8 bg-[#111115] border-b border-[#222226] px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">&gt; HELP:</span>
            <span className="font-bold text-neutral-100">KEYBOARD SHORTCUTS MANUAL</span>
            <span className="text-neutral-500 text-[10px] hidden sm:inline">[NLE STANDARD]</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCheatsheet}
              title="Copy All Shortcuts as Markdown to Clipboard"
              className="px-2 py-0.5 bg-[#181820] hover:bg-[#22222c] border border-[#2e2e38] text-neutral-300 hover:text-white text-[10px] transition-colors cursor-pointer"
            >
              {copied ? '[COPIED!]' : '[COPY ALL]'}
            </button>

            <button
              onClick={onClose}
              className="px-1.5 py-0.5 bg-[#181820] hover:bg-[#282834] border border-[#2e2e38] text-neutral-400 hover:text-white transition-colors cursor-pointer text-[10px]"
            >
              [X]
            </button>
          </div>
        </div>

        {/* Search & Category Tabs */}
        <div className="p-2 bg-[#0c0c0f] border-b border-[#222226] space-y-1.5">
          {/* Search bar */}
          <div className="relative flex items-center">
            <span className="text-neutral-500 absolute left-2 text-xs">&gt;</span>
            <input
              type="text"
              autoFocus
              placeholder="Search shortcuts (e.g. 'razor', 'shuttle', 'marquee', 'split', 'ctrl+k')..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-[#121217] text-neutral-200 pl-6 pr-6 py-1 text-xs border border-[#26262e] focus:border-sky-500 outline-none font-mono"
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="absolute right-2 text-neutral-500 hover:text-neutral-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'all' 
                ? shortcuts.length 
                : shortcuts.filter((s) => s.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.5 border whitespace-nowrap transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-neutral-800 text-sky-400 border-sky-500 font-bold'
                      : 'bg-[#121217] text-neutral-400 hover:text-neutral-200 border-[#222228]'
                  }`}
                >
                  [{cat.name.toUpperCase()} ({count})]
                </button>
              );
            })}
          </div>
        </div>

        {/* Content: Shortcuts Grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Quick Pro Tips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 text-[10px]">
            <div className="p-2 bg-[#0e0e13] border border-[#1e1e28]">
              <span className="text-sky-300 font-bold block">[MULTI-CLIP SELECTION]</span>
              <span className="text-neutral-400 mt-0.5 block">
                Drag empty timeline space to draw marquee box. Hold Shift or Ctrl to add clips.
              </span>
            </div>

            <div className="p-2 bg-[#0e0e13] border border-[#1e1e28]">
              <span className="text-purple-300 font-bold block">[J - K - L SHUTTLE]</span>
              <span className="text-neutral-400 mt-0.5 block">
                L: Fast-forward (2x/4x), J: Reverse rewind, K: Instant pause/stop.
              </span>
            </div>

            <div className="p-2 bg-[#0e0e13] border border-[#1e1e28]">
              <span className="text-emerald-300 font-bold block">[SPLIT & CUT]</span>
              <span className="text-neutral-400 mt-0.5 block">
                Ctrl+K: Split at playhead. C: Switch to Razor Tool and click directly.
              </span>
            </div>
          </div>

          {/* Shortcuts Grid */}
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              <span>[ NO SHORTCUTS MATCHING &quot;{filter}&quot; ]</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {filteredShortcuts.map((item, idx) => (
                <div
                  key={`${item.key}-${idx}`}
                  className="flex items-center justify-between p-1.5 bg-[#0f0f14] border border-[#1d1d24] hover:border-neutral-600 transition-all text-[11px]"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="text-neutral-300 block truncate">{item.desc}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.2 bg-black border border-sky-500/40 text-[10px] font-mono font-bold text-sky-300 whitespace-nowrap">
                      {item.key}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="h-7 bg-[#111115] border-t border-[#222226] px-3 flex items-center justify-between text-[10px] text-neutral-400">
          <span>&gt; Press <kbd className="px-1 py-0.2 bg-[#181822] text-sky-300 border border-sky-500/30">?</kbd> or <kbd className="px-1 py-0.2 bg-[#181822] text-sky-300 border border-sky-500/30">F1</kbd> to toggle help anywhere</span>

          <button
            onClick={onClose}
            className="px-3 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[10px] transition-colors cursor-pointer"
          >
            [CLOSE]
          </button>
        </div>
      </div>
    </div>
  );
};
