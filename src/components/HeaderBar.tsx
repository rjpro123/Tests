import React, { useState, useRef, useEffect } from 'react';
import { 
  RotateCcw, 
  RotateCw, 
  Upload, 
  Type, 
  HelpCircle, 
  Magnet, 
  Download, 
  HardDrive, 
  Film, 
  Sparkles, 
  Layers, 
  Sliders,
  Activity,
  Save,
  FolderOpen,
  ChevronDown,
  FilePlus,
  Check,
  Edit2,
  Wand2,
  Sun,
  Flame,
  Zap,
  Tv,
  Waves,
  CircleDot,
  Palette,
  Search,
  X,
  Play
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Clip } from '../types/editor';

interface HeaderBarProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  onQuickSave: () => void;
  onOpenProjectFileModal: (tab?: 'save' | 'open' | 'new') => void;
  lastSavedAt: string | null;
  isUnsaved: boolean;
  showInspector: boolean;
  onToggleInspector: () => void;
  showMediaBin: boolean;
  onToggleMediaBin: () => void;
  showAudioMixer?: boolean;
  onToggleAudioMixer?: () => void;
  showAIAssistant?: boolean;
  onToggleAIAssistant?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  snapping: boolean;
  onToggleSnapping: () => void;
  onImportClick: () => void;
  onOpenDrive: () => void;
  currentUser: User | null;
  onAddTitle: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  selectedClip?: Clip | null;
  onApplyEffect?: (effectId: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  projectName,
  onUpdateProjectName,
  onQuickSave,
  onOpenProjectFileModal,
  lastSavedAt,
  isUnsaved,
  showInspector,
  onToggleInspector,
  showMediaBin,
  onToggleMediaBin,
  showAudioMixer,
  onToggleAudioMixer,
  showAIAssistant,
  onToggleAIAssistant,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  snapping,
  onToggleSnapping,
  onImportClick,
  onOpenDrive,
  currentUser,
  onAddTitle,
  onOpenExport,
  onOpenShortcuts,
  selectedClip,
  onApplyEffect,
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isEffectsMenuOpen, setIsEffectsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);
  const [justSavedNotice, setJustSavedNotice] = useState(false);
  const [effectAppliedNotice, setEffectAppliedNotice] = useState<string | null>(null);
  const [effectsSearchQuery, setEffectsSearchQuery] = useState('');
  const [effectsCategory, setEffectsCategory] = useState<'all' | 'plugins' | 'looks' | 'transitions'>('all');

  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const effectsMenuRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNameInput(projectName);
  }, [projectName]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
      if (effectsMenuRef.current && !effectsMenuRef.current.contains(e.target as Node)) {
        setIsEffectsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveClick = () => {
    onQuickSave();
    setJustSavedNotice(true);
    setTimeout(() => setJustSavedNotice(false), 2000);
  };

  const handleFinishEditingName = () => {
    setIsEditingName(false);
    if (nameInput.trim()) {
      onUpdateProjectName(nameInput.trim());
    } else {
      setNameInput(projectName);
    }
  };

  const allEffectsList = [
    // AE Plugins
    { id: 'ae-optical-flares', name: 'Optical Flares Pro', cat: 'plugins', icon: Sun, color: 'text-cyan-400', badge: 'AE GPU', desc: 'Anamorphic streaks, halo rings & starbursts' },
    { id: 'ae-trapcode-particles', name: 'Trapcode Particular', cat: 'plugins', icon: Flame, color: 'text-amber-400', badge: 'AE GPU', desc: 'Embers, cyber sparks, stardust & snow' },
    { id: 'ae-deep-glow', name: 'Deep Glow Studio', cat: 'plugins', icon: Sparkles, color: 'text-blue-400', badge: 'AE GPU', desc: 'Multi-tier anamorphic aura bloom' },
    { id: 'ae-chromatic-aberration', name: 'Chromatic Aberration', cat: 'plugins', icon: Zap, color: 'text-rose-400', badge: 'AE GPU', desc: 'RGB prism channel split & dispersion' },
    { id: 'ae-vhs-glitch', name: 'VHS Tape & CRT Damage', cat: 'plugins', icon: Tv, color: 'text-emerald-400', badge: 'AE GPU', desc: 'Scanlines, jitter noise & VCR timestamp' },
    { id: 'ae-wave-displacement', name: 'Turbulent Wave Warp', cat: 'plugins', icon: Waves, color: 'text-teal-400', badge: 'AE GPU', desc: 'Liquid heat shimmer & refraction warp' },
    { id: 'ae-light-rays', name: 'CC Light Rays', cat: 'plugins', icon: Sun, color: 'text-yellow-300', badge: 'AE GPU', desc: 'Volumetric god rays from light origin' },
    { id: 'ae-halftone', name: 'Halftone & Pixel Matrix', cat: 'plugins', icon: CircleDot, color: 'text-purple-400', badge: 'AE GPU', desc: 'Retro print dots & mosaic pixelator' },
    // Lumetri Looks
    { id: 'lut-teal-orange', name: 'Teal & Orange Look', cat: 'looks', icon: Palette, color: 'text-amber-400', badge: 'Lumetri', desc: 'Cinematic Hollywood contrast' },
    { id: 'lut-cyberpunk', name: 'Cyberpunk Look', cat: 'looks', icon: Palette, color: 'text-pink-400', badge: 'Lumetri', desc: 'High saturation magenta & neon cyan' },
    { id: 'lut-vintage-film', name: 'Vintage 35mm Stock', cat: 'looks', icon: Palette, color: 'text-yellow-400', badge: 'Lumetri', desc: 'Warm grain, soft highlights & fade' },
    { id: 'lut-warm-sunset', name: 'Warm Sunset Glow', cat: 'looks', icon: Palette, color: 'text-orange-400', badge: 'Lumetri', desc: 'Golden hour temperature boost' },
    { id: 'lut-monochrome', name: 'Monochrome Noir', cat: 'looks', icon: Palette, color: 'text-slate-300', badge: 'Lumetri', desc: 'Deep black & white contrast' },
    // Classic Filters & Transitions
    { id: 'gaussian-blur', name: 'Gaussian Blur', cat: 'transitions', icon: Sparkles, color: 'text-sky-400', badge: 'Filter', desc: 'Smooth lens defocus & soften' },
    { id: 'glitch', name: 'Digital Glitch FX', cat: 'transitions', icon: Zap, color: 'text-fuchsia-400', badge: 'Filter', desc: 'RGB displacement jitter' },
    { id: 'black-and-white', name: 'B&W Monochrome', cat: 'transitions', icon: CircleDot, color: 'text-slate-300', badge: 'Filter', desc: 'Zero saturation B&W filter' },
    { id: 'cross-dissolve', name: 'Cross Dissolve', cat: 'transitions', icon: Layers, color: 'text-emerald-400', badge: 'Transition', desc: 'Alpha crossfade between clips' },
    { id: 'dip-to-black', name: 'Dip to Black', cat: 'transitions', icon: Layers, color: 'text-indigo-400', badge: 'Transition', desc: 'Fade down to black' },
    { id: 'wipe-left', name: 'Directional Wipe', cat: 'transitions', icon: Layers, color: 'text-cyan-400', badge: 'Transition', desc: 'Horizontal motion wipe' },
  ];

  const filteredEffects = allEffectsList.filter((eff) => {
    const matchesCat = effectsCategory === 'all' || eff.cat === effectsCategory;
    const matchesSearch = eff.name.toLowerCase().includes(effectsSearchQuery.toLowerCase()) ||
                          eff.desc.toLowerCase().includes(effectsSearchQuery.toLowerCase()) ||
                          eff.badge.toLowerCase().includes(effectsSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApply = (id: string, name: string) => {
    onApplyEffect?.(id);
    setEffectAppliedNotice(name);
    setTimeout(() => setEffectAppliedNotice(null), 2500);
  };

  return (
    <header className="h-10 bg-[#0d1226] border-b border-[#1b254a] flex items-center justify-between px-3 shrink-0 select-none text-xs text-slate-300 relative z-30">
      {/* Left: Modern App Brand & Workspaces */}
      <div className="flex items-center gap-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-600 via-blue-500 to-indigo-400 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <Film className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-bold text-slate-100 tracking-tight text-sm hidden md:inline">Riley Editor</span>
        </div>

        {/* Project Name (Editable) */}
        <div className="flex items-center">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleFinishEditingName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishEditingName();
                if (e.key === 'Escape') {
                  setNameInput(projectName);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="bg-[#152042] text-slate-100 font-medium px-2.5 py-0.5 rounded border border-sky-400 text-xs outline-none max-w-[150px] sm:max-w-[200px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="group flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#131b36] transition-colors cursor-pointer"
              title="Click to rename sequence project"
            >
              <span className="font-medium text-slate-200 text-xs truncate max-w-[120px] sm:max-w-[180px]">
                {projectName}
              </span>
              <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
              {isUnsaved && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
              )}
            </button>
          )}
        </div>

        {/* File Menu Dropdown */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              isFileMenuOpen
                ? 'bg-[#152042] text-slate-100'
                : 'bg-[#131b36] hover:bg-[#1a254c] text-slate-300'
            }`}
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            <span>File</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isFileMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-[#0e1635] border border-[#22306b] rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50 animate-fadeIn divide-y divide-[#1b254a]/60">
              <div className="py-1">
                <button
                  onClick={() => {
                    handleSaveClick();
                    setIsFileMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#18234d] hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-sky-400" />
                    <span>Save Project</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                </button>

                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenProjectFileModal('save');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#18234d] hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save As (.riley)...</span>
                  </div>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenProjectFileModal('open');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#18234d] hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Project File...</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenProjectFileModal('new');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#18234d] hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FilePlus className="w-3.5 h-3.5 text-sky-400" />
                    <span>New Sequence...</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved confirmation badge */}
        {justSavedNotice && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-fadeIn font-medium">
            <Check className="w-3 h-3" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Center: Quick Workspace Toggles */}
      <div className="hidden lg:flex items-center bg-[#0a0f21] p-0.5 rounded-lg border border-[#1b254a]">
        <button
          onClick={onToggleMediaBin}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            showMediaBin
              ? 'bg-[#1b254a] text-sky-300 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b36]'
          }`}
        >
          <Layers className="w-3 h-3 text-sky-400" />
          <span>Project Bin</span>
        </button>

        {onToggleAudioMixer && (
          <button
            onClick={onToggleAudioMixer}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              showAudioMixer
                ? 'bg-[#1b254a] text-emerald-300 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b36]'
            }`}
          >
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Audio Mixer</span>
          </button>
        )}

        {onToggleAIAssistant && (
          <button
            onClick={onToggleAIAssistant}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showAIAssistant
                ? 'bg-gradient-to-tr from-cyan-950 via-blue-950 to-indigo-950 border-cyan-400 text-cyan-200 shadow-cyan-500/20'
                : 'border-transparent text-cyan-300 hover:text-white hover:bg-[#131b36]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>AI Assistant</span>
          </button>
        )}
      </div>

      {/* Right: Actions, Snapping, Effects & Plugins Options, and Export */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#131b36] rounded-md border border-[#1b254a] p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Magnetic Snapping Toggle */}
        <button
          onClick={onToggleSnapping}
          title={snapping ? 'Snapping is ON (S)' : 'Snapping is OFF (S)'}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
            snapping
              ? 'bg-sky-950/60 border-sky-500/40 text-sky-400'
              : 'bg-[#131b36] border-[#1b254a] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Snap</span>
        </button>

        {/* TOP RIGHT: ALL EFFECTS & PLUGINS OPTIONS BUTTON */}
        <div className="relative" ref={effectsMenuRef}>
          <button
            onClick={() => setIsEffectsMenuOpen(!isEffectsMenuOpen)}
            title="Browse & Apply All After Effects Plugins, Looks & Transitions"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isEffectsMenuOpen
                ? 'bg-fuchsia-600 text-white shadow-fuchsia-600/30'
                : 'bg-gradient-to-r from-fuchsia-950/90 via-purple-950/80 to-indigo-950/90 hover:from-fuchsia-900 hover:to-indigo-900 border border-fuchsia-500/50 text-fuchsia-200 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-fuchsia-300 animate-pulse" />
            <span className="hidden md:inline">Effects & Plugins</span>
            <span className="inline md:hidden">FX</span>
            <ChevronDown className="w-3 h-3 text-fuchsia-300" />
          </button>

          {/* Effects Popover Menu */}
          {isEffectsMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-84 sm:w-96 bg-[#0c1228] border border-[#23316d] rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn text-xs">
              {/* Menu Header */}
              <div className="p-3 bg-[#111938] border-b border-[#1f2b5c] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300">
                    <Wand2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-100 block">Effects & Plugins Library</span>
                    <span className="text-[10px] text-slate-400">19 GPU procedural renderers & looks</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsEffectsMenuOpen(false)}
                  className="p-1 rounded hover:bg-[#1a2652] text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Notice Banner */}
              {effectAppliedNotice && (
                <div className="px-3 py-1.5 bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-[11px] animate-fadeIn">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Applied <b>{effectAppliedNotice}</b> to active clip!</span>
                </div>
              )}

              {/* Target Status Indicator */}
              <div className="px-3 py-2 bg-[#090e1f] border-b border-[#1b254a] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Play className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>Target:</span>
                  <span className="font-semibold text-slate-100 truncate">
                    {selectedClip ? selectedClip.name : 'Clip at Playhead'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    onToggleInspector();
                    setIsEffectsMenuOpen(false);
                  }}
                  className="text-purple-300 hover:text-purple-200 underline text-[10px] shrink-0 font-medium"
                >
                  Open Inspector
                </button>
              </div>

              {/* Search Box */}
              <div className="p-2 border-b border-[#1b254a] bg-[#0d142d]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search all plugins, looks & effects..."
                    value={effectsSearchQuery}
                    onChange={(e) => setEffectsSearchQuery(e.target.value)}
                    className="w-full bg-[#131d3d] border border-[#22326b] focus:border-fuchsia-400 rounded-lg pl-8 pr-3 py-1.5 text-slate-100 text-xs outline-none"
                  />
                  {effectsSearchQuery && (
                    <button
                      onClick={() => setEffectsSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex gap-1 mt-2">
                  {[
                    { id: 'all', label: 'All (19)' },
                    { id: 'plugins', label: 'AE Plugins (8)' },
                    { id: 'looks', label: 'Lumetri (5)' },
                    { id: 'transitions', label: 'Stylize & Transitions (6)' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEffectsCategory(cat.id as any)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                        effectsCategory === cat.id
                          ? 'bg-fuchsia-500/30 border border-fuchsia-400 text-fuchsia-200 font-bold'
                          : 'bg-[#131d3d] border border-[#1f2d59] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Effects List */}
              <div className="max-h-72 overflow-y-auto p-2 space-y-1 bg-[#0a0f21]">
                {filteredEffects.map((eff) => {
                  const Icon = eff.icon;
                  return (
                    <div
                      key={eff.id}
                      onClick={() => handleApply(eff.id, eff.name)}
                      className="p-2 rounded-lg bg-[#0e1633] hover:bg-[#14204a] border border-[#1a2752] hover:border-fuchsia-500/60 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-md bg-[#131d3d] border border-[#202f64] flex items-center justify-center ${eff.color} shrink-0 group-hover:scale-105 transition-transform`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-100 block text-xs truncate group-hover:text-fuchsia-200">
                            {eff.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {eff.desc}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                          eff.badge === 'AE GPU'
                            ? 'bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300'
                            : eff.badge === 'Lumetri'
                            ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
                            : 'bg-sky-950/80 border border-sky-500/40 text-sky-300'
                        }`}>
                          {eff.badge}
                        </span>
                        <button className="px-2 py-1 rounded bg-fuchsia-600/30 group-hover:bg-fuchsia-600 border border-fuchsia-500/40 group-hover:border-fuchsia-400 text-fuchsia-200 group-hover:text-white text-[10px] font-bold transition-all">
                          Apply
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-2 bg-[#0d142d] border-t border-[#1b254a] flex items-center justify-between text-[10px] text-slate-400">
                <span>Click any effect to apply instantly</span>
                <span className="font-mono text-fuchsia-300">GPU Accelerated</span>
              </div>
            </div>
          )}
        </div>

        {/* Add Title Graphic */}
        <button
          onClick={onAddTitle}
          title="Add Title Graphic (T)"
          className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#131b36] hover:bg-[#1a254c] border border-[#1b254a] text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Title</span>
        </button>

        {/* Import Media */}
        <button
          onClick={onImportClick}
          title="Import Local Footage (Ctrl+I)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#131b36] hover:bg-[#1a254c] border border-[#1b254a] text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Import</span>
        </button>

        {/* Google Drive */}
        <button
          onClick={onOpenDrive}
          title="Browse & Import Google Drive"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#0f211d] hover:bg-[#15302a] border border-emerald-600/30 text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Drive{currentUser ? ' •' : ''}</span>
        </button>

        <div className="h-4 w-[1px] bg-[#1b254a] hidden sm:block" />

        {/* Help & Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts & Workflow Help (? / F1)"
          className="p-1.5 rounded-md bg-[#131b36] hover:bg-[#1b254a] border border-[#1b254a] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          title="Export Sequence (Ctrl+M)"
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm ml-1"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
