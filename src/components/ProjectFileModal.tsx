import React, { useState, useRef } from 'react';
import { 
  Save, 
  Download, 
  Upload, 
  FolderOpen, 
  Trash2, 
  Clock, 
  FileText, 
  Plus, 
  RotateCcw, 
  X, 
  Check, 
  HardDrive,
  Film,
  Sparkles,
  Layers
} from 'lucide-react';
import { CineFlowProject, SavedProjectSnapshot } from '../types/editor';
import { 
  exportProjectToFile, 
  parseProjectFile, 
  saveProjectToLocalStorage, 
  listSavedProjects, 
  loadSavedProjectById, 
  deleteSavedProject 
} from '../utils/projectFileManager';
import { formatDurationSeconds } from '../utils/timecode';

interface ProjectFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: CineFlowProject;
  onUpdateProjectName: (name: string) => void;
  onLoadProject: (project: CineFlowProject) => void;
  onNewProject: () => void;
  onLoadDemoProject: () => void;
  lastSavedAt: string | null;
  onSaveCurrentProject: () => void;
}

export const ProjectFileModal: React.FC<ProjectFileModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onUpdateProjectName,
  onLoadProject,
  onNewProject,
  onLoadDemoProject,
  lastSavedAt,
  onSaveCurrentProject,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'open' | 'new'>('save');
  const [projectNameInput, setProjectNameInput] = useState(currentProject.name);
  const [savedSnapshots, setSavedSnapshots] = useState<SavedProjectSnapshot[]>(listSavedProjects());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const refreshSnapshots = () => {
    setSavedSnapshots(listSavedProjects());
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProjectNameInput(val);
    onUpdateProjectName(val);
  };

  const handleQuickSave = () => {
    onSaveCurrentProject();
    setSaveSuccessNotice('Saved to browser storage successfully!');
    refreshSnapshots();
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleDownloadCineflow = () => {
    exportProjectToFile({ ...currentProject, name: projectNameInput }, `${projectNameInput}.cineflow`);
    setSaveSuccessNotice(`Downloaded ${projectNameInput}.cineflow`);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleDownloadJson = () => {
    exportProjectToFile({ ...currentProject, name: projectNameInput }, `${projectNameInput}.json`);
    setSaveSuccessNotice(`Downloaded ${projectNameInput}.json`);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    try {
      const parsed = await parseProjectFile(file);
      onLoadProject(parsed);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse project file');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileSelected(file);
    }
  };

  const handleLoadSnapshot = (id: string) => {
    const proj = loadSavedProjectById(id);
    if (proj) {
      onLoadProject(proj);
      onClose();
    }
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedProject(id);
    refreshSnapshots();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#121217] border border-[#272733] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] text-neutral-200">
        {/* Header */}
        <div className="h-12 bg-[#16161c] border-b border-[#242430] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white">Project File Manager</div>
              <div className="text-[11px] text-neutral-400">Save, export, and load sequences (.cineflow)</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[#242430] bg-[#141419] px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('save')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 font-medium transition-all border-b-2 cursor-pointer ${
              activeTab === 'save'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Project</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('open');
              refreshSnapshots();
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 font-medium transition-all border-b-2 cursor-pointer ${
              activeTab === 'open'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open & Recent</span>
            {savedSnapshots.length > 0 && (
              <span className="text-[10px] bg-neutral-800 px-1.5 py-0.2 rounded-full font-mono text-neutral-400">
                {savedSnapshots.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 font-medium transition-all border-b-2 cursor-pointer ${
              activeTab === 'new'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New & Templates</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {saveSuccessNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessNotice}</span>
            </div>
          )}

          {/* TAB 1: SAVE PROJECT */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              {/* Project Name Field */}
              <div className="bg-[#171720] border border-[#262633] p-3.5 rounded-xl space-y-2">
                <label className="text-neutral-300 font-medium block">
                  Sequence / Project Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectNameInput}
                    onChange={handleNameChange}
                    placeholder="Enter project name..."
                    className="flex-1 bg-[#101015] border border-[#2b2b3a] focus:border-sky-500 rounded-lg px-3 py-2 text-white text-xs outline-none"
                  />
                </div>
                <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>
                    Current stats: {currentProject.clips.length} clips • {currentProject.tracks.length} tracks • {formatDurationSeconds(currentProject.duration)}
                  </span>
                  {lastSavedAt && (
                    <span className="text-neutral-400 font-mono">
                      Last saved: {new Date(lastSavedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Primary Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Browser Fast Save (Ctrl+S) */}
                <div
                  onClick={handleQuickSave}
                  className="p-4 rounded-xl bg-[#171720] hover:bg-[#1e1e29] border border-[#262633] hover:border-sky-500/50 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-sky-950/70 border border-sky-500/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] bg-neutral-800 text-sky-300 font-mono px-2 py-0.5 rounded border border-neutral-700">
                        Ctrl + S
                      </span>
                    </div>
                    <div className="font-semibold text-white text-sm">Save to Browser</div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Instantly saves your timeline and footage to local browser storage. Persists across browser reloads.
                    </p>
                  </div>
                  <button className="mt-3 w-full py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs transition-colors cursor-pointer">
                    Quick Save Now
                  </button>
                </div>

                {/* 2. Download Project File (.cineflow) */}
                <div
                  onClick={handleDownloadCineflow}
                  className="p-4 rounded-xl bg-[#171720] hover:bg-[#1e1e29] border border-[#262633] hover:border-emerald-500/50 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                        <Download className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] bg-emerald-950/70 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                        .cineflow
                      </span>
                    </div>
                    <div className="font-semibold text-white text-sm">Download Project File</div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Download a standalone project file to your computer. Share with collaborators or keep as backup.
                    </p>
                  </div>
                  <button className="mt-3 w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors cursor-pointer">
                    Download .cineflow
                  </button>
                </div>
              </div>

              {/* Secondary Download JSON */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#141419] border border-[#22222d] text-neutral-400">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-neutral-400" />
                  <span>Need raw JSON for automation or custom scripts?</span>
                </div>
                <button
                  onClick={handleDownloadJson}
                  className="px-3 py-1 rounded-md bg-[#1f1f2a] hover:bg-[#282836] text-neutral-200 border border-[#303042] text-xs cursor-pointer transition-colors"
                >
                  Export .json
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: OPEN & RECENT PROJECTS */}
          {activeTab === 'open' && (
            <div className="space-y-4">
              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-sky-400 bg-sky-950/20'
                    : 'border-[#2d2d3c] bg-[#16161f] hover:border-neutral-600 hover:bg-[#1a1a25]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-sky-950/70 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="font-semibold text-white text-xs mb-1">
                  Upload Project File (.cineflow or .json)
                </div>
                <div className="text-[11px] text-neutral-400">
                  Drag and drop file here, or click to browse computer
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".cineflow,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
                  Error loading file: {uploadError}
                </div>
              )}

              {/* Saved Snapshots List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-neutral-400 font-medium px-1">
                  <span>Saved Browser Projects ({savedSnapshots.length})</span>
                  <span className="text-[11px] text-neutral-500">Stored locally in your browser</span>
                </div>

                {savedSnapshots.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#15151c] border border-[#22222d] text-center text-neutral-500 text-xs">
                    No projects saved in browser yet. Click &quot;Save to Browser&quot; or press Ctrl+S to save!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {savedSnapshots.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleLoadSnapshot(item.id)}
                        className="p-3 rounded-lg bg-[#161620] hover:bg-[#1d1d29] border border-[#242432] hover:border-sky-500/50 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#20202c] border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-sky-400">
                            <Film className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
                              <span>{item.clipCount} clips</span>
                              <span>•</span>
                              <span>{formatDurationSeconds(item.duration)}</span>
                              <span>•</span>
                              <span>{new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLoadSnapshot(item.id)}
                            className="px-2.5 py-1 rounded bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-xs font-medium cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            onClick={(e) => handleDeleteSnapshot(item.id, e)}
                            title="Delete Saved Project"
                            className="p-1 rounded hover:bg-rose-950/60 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NEW & TEMPLATES */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Blank Sequence */}
                <div
                  onClick={() => {
                    if (confirm('Start a new blank sequence? Unsaved changes will be lost unless saved.')) {
                      onNewProject();
                      onClose();
                    }
                  }}
                  className="p-4 rounded-xl bg-[#171720] hover:bg-[#1e1e29] border border-[#262633] hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-950/70 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-white text-sm">New Blank Sequence</div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Clears timeline clips and initializes clean video (V1, V2, V3) and audio (A1, A2, A3) tracks ready for editing.
                    </p>
                  </div>
                  <button className="mt-3 w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors cursor-pointer">
                    Create Blank Project
                  </button>
                </div>

                {/* Reset to Demo Sequence */}
                <div
                  onClick={() => {
                    if (confirm('Load pre-built sample demo sequence with stock clips & transitions?')) {
                      onLoadDemoProject();
                      onClose();
                    }
                  }}
                  className="p-4 rounded-xl bg-[#171720] hover:bg-[#1e1e29] border border-[#262633] hover:border-purple-500/50 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-white text-sm">Load Demo Sequence</div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Loads a pre-arranged cinematic sequence showcasing color grading, picture-in-picture, audio waveforms, and transitions.
                    </p>
                  </div>
                  <button className="mt-3 w-full py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-semibold text-xs transition-colors cursor-pointer">
                    Load Demo Sequence
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-[#16161c] border-t border-[#242430] px-4 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Pro Tip:</span>
            <kbd className="px-1.5 py-0.5 bg-black/60 rounded border border-neutral-700 font-mono text-[10px] text-neutral-300">
              Ctrl + S
            </kbd>
            <span className="text-[11px]">saves the project at any time.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#22222c] hover:bg-[#2b2b38] text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
