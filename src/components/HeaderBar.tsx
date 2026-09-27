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
  Save,
  FolderOpen,
  ChevronDown,
  FilePlus,
  Check,
  Edit2
} from 'lucide-react';
import { User } from 'firebase/auth';

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
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  snapping: boolean;
  onToggleSnapping: () => void;
  onImportClick: () => void;
  onOpenDrive: () => void;
  onOpenAIVideo: () => void;
  currentUser: User | null;
  onAddTitle: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  snapping,
  onToggleSnapping,
  onImportClick,
  onOpenDrive,
  onOpenAIVideo,
  currentUser,
  onAddTitle,
  onOpenExport,
  onOpenShortcuts,
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);
  const [justSavedNotice, setJustSavedNotice] = useState(false);

  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNameInput(projectName);
  }, [projectName]);

  // Close file menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
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

  return (
    <header className="h-10 bg-[#121216] border-b border-[#222228] flex items-center justify-between px-3 shrink-0 select-none text-xs text-neutral-300 relative z-30">
      {/* Left: Modern App Brand & Workspaces */}
      <div className="flex items-center gap-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-400 flex items-center justify-center text-black shadow-sm">
            <Film className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-semibold text-white tracking-tight text-sm hidden md:inline">CineFlow</span>
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
              className="bg-[#1b1b24] text-white font-medium px-2 py-0.5 rounded border border-sky-500 text-xs outline-none max-w-[150px] sm:max-w-[200px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              title="Click to rename sequence"
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1c1c24] text-neutral-300 hover:text-white transition-colors cursor-pointer group max-w-[130px] sm:max-w-[190px] truncate"
            >
              <span className="font-medium truncate text-xs">{projectName}</span>
              {isUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
              <Edit2 className="w-2.5 h-2.5 text-neutral-500 group-hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>

        {/* File Dropdown Menu */}
        <div ref={fileMenuRef} className="relative">
          <button
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              isFileMenuOpen
                ? 'bg-neutral-800 text-white'
                : 'bg-[#18181f] hover:bg-[#202028] text-neutral-300 hover:text-white border border-[#272732]'
            }`}
          >
            <span>File</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isFileMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-[#16161f] border border-[#282836] rounded-lg shadow-2xl py-1 text-xs text-neutral-300 z-50 animate-fadeIn">
              <button
                onClick={() => {
                  handleSaveClick();
                  setIsFileMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-sky-400" />
                  <span>Save Project</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Ctrl+S</span>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenProjectFileModal('save');
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save As (.cineflow)...</span>
                </div>
              </button>

              <div className="h-[1px] bg-neutral-800 my-1" />

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenProjectFileModal('open');
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
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
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FilePlus className="w-3.5 h-3.5 text-purple-400" />
                  <span>New Sequence...</span>
                </div>
              </button>

              {lastSavedAt && (
                <div className="px-3 py-1.5 border-t border-neutral-800/80 text-[10px] text-neutral-500 font-mono mt-1">
                  Last saved: {new Date(lastSavedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-neutral-800 hidden sm:block" />

        {/* Panel Switchers */}
        <div className="flex items-center gap-1 bg-[#18181f] p-0.5 rounded-lg border border-[#272732]">
          <button
            onClick={onToggleMediaBin}
            title="Toggle Media Library (B)"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              showMediaBin
                ? 'bg-neutral-800 text-sky-400 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Media</span>
          </button>

          <button
            onClick={onToggleInspector}
            title="Toggle Inspector & Color (I)"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              showInspector
                ? 'bg-neutral-800 text-purple-400 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Inspector</span>
          </button>
        </div>
      </div>

      {/* Right: Modern Actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick Save Button */}
        <button
          onClick={handleSaveClick}
          title="Save Project (Ctrl+S)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
            justSavedNotice
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
              : isUnsaved
              ? 'bg-[#1b1c28] hover:bg-[#232435] border-sky-500/40 text-sky-300 hover:text-white'
              : 'bg-[#18181f] hover:bg-[#20202a] border-[#272732] text-neutral-300 hover:text-white'
          }`}
        >
          {justSavedNotice ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Save</span>
            </>
          )}
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center bg-[#18181f] rounded-md border border-[#272732] p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1 rounded transition-colors ${
              canUndo
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`p-1 rounded transition-colors ${
              canRedo
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
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
              : 'bg-[#18181f] border-[#272732] text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Snap</span>
        </button>

        {/* Add Title Graphic */}
        <button
          onClick={onAddTitle}
          title="Add Title Graphic (T)"
          className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#18181f] hover:bg-[#20202a] border border-[#272732] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Title</span>
        </button>

        {/* Import Media */}
        <button
          onClick={onImportClick}
          title="Import Local Footage (Ctrl+I)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#18181f] hover:bg-[#20202a] border border-[#272732] text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Import</span>
        </button>

        {/* Google Drive */}
        <button
          onClick={onOpenDrive}
          title="Browse & Import Google Drive"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#14201a] hover:bg-[#1a2e24] border border-emerald-600/30 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Drive{currentUser ? ' •' : ''}</span>
        </button>

        {/* AI Video Creation */}
        <button
          onClick={onOpenAIVideo}
          title="Generate Video with AI"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-purple-950/70 to-indigo-950/70 hover:from-purple-900/80 hover:to-indigo-900/80 border border-purple-500/40 text-purple-300 hover:text-purple-200 transition-all cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">AI Studio</span>
        </button>

        <div className="h-4 w-[1px] bg-neutral-800 hidden sm:block" />

        {/* Help & Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts & Workflow Help (? / F1)"
          className="p-1.5 rounded-md bg-[#18181f] hover:bg-[#22222d] border border-[#272732] text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          title="Export Sequence (Ctrl+M)"
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all cursor-pointer shadow-sm ml-1"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
