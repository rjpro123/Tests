import React, { useState, useEffect } from 'react';
import { 
  X, 
  Folder, 
  Film, 
  Music, 
  Image as ImageIcon, 
  Search, 
  ArrowLeft, 
  Download, 
  Check, 
  Loader2, 
  AlertCircle, 
  LogOut, 
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  googleSignOut, 
  listDriveFootageFiles, 
  importDriveFileToMediaItem, 
  DriveFileItem 
} from '../utils/googleDrive';
import { MediaItem } from '../types/editor';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthSignOut: () => void;
  onImportMedia: (media: MediaItem, addToTimeline?: boolean) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accessToken,
  onAuthSuccess,
  onAuthSignOut,
  onImportMedia,
}) => {
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [folders, setFolders] = useState<DriveFileItem[]>([]);
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [isSigningIn, setIsSigningIn] = useState(false);

  const currentFolder = folderStack[folderStack.length - 1];

  // Fetch files when folder, filter, or token changes
  const loadFiles = async (token: string, folderId: string, filter: 'all' | 'video' | 'audio' | 'image', q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listDriveFootageFiles({
        folderId,
        query: q,
        fileType: filter,
        token,
      });
      setFiles(res.files);
      setFolders(res.folders);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFiles(accessToken, currentFolder.id, fileTypeFilter, searchQuery);
    }
  }, [isOpen, accessToken, currentFolder.id, fileTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken) {
      loadFiles(accessToken, currentFolder.id, fileTypeFilter, searchQuery);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        loadFiles(res.accessToken, 'root', fileTypeFilter, '');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    onAuthSignOut();
    setFiles([]);
    setFolders([]);
  };

  const handleEnterFolder = (f: DriveFileItem) => {
    setFolderStack((prev) => [...prev, { id: f.id, name: f.name }]);
    setSelectedFileIds(new Set());
  };

  const handleNavigateUp = (index: number) => {
    setFolderStack((prev) => prev.slice(0, index + 1));
    setSelectedFileIds(new Set());
  };

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Import selected files
  const handleImportSelected = async (addToTimeline: boolean = false) => {
    if (!accessToken || selectedFileIds.size === 0) return;

    const filesToImport = files.filter((f) => selectedFileIds.has(f.id));
    setImportingIds(new Set(selectedFileIds));

    for (const f of filesToImport) {
      try {
        const media = await importDriveFileToMediaItem(f, accessToken);
        onImportMedia(media, addToTimeline);
      } catch (err) {
        console.error('Failed to import file:', f.name, err);
      }
    }

    setImportingIds(new Set());
    setSelectedFileIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#181820] border border-[#2e2e38] rounded-lg shadow-2xl w-full max-w-3xl h-[650px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1e1e28] border-b border-[#2e2e38] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#1e293b] flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-neutral-100 text-sm">Google Drive Footage</span>
              <span className="text-[11px] text-neutral-400 ml-2 font-mono">
                Browse & Import Video / Audio Assets
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2 bg-[#252535] py-1 px-2 rounded border border-[#343448]">
                {currentUser.photoURL && (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                )}
                <span className="text-xs text-neutral-200 truncate max-w-[130px]">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="text-neutral-400 hover:text-rose-400 p-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!currentUser || !accessToken ? (
          /* Sign-In View */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <HardDrive className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-bold text-neutral-100">
                Connect your Google Drive Account
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Import raw video takes, camera footage, b-roll, background soundtracks, and voiceovers directly from your Google Drive into CineFlow Studio.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded max-w-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Official Style Sign in with Google Button */}
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-neutral-100 text-neutral-800 font-medium text-xs rounded-md shadow-md border border-neutral-300 transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : (
          /* Logged In Footage Browser */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar: Breadcrumb + Filter + Search */}
            <div className="h-10 bg-[#16161e] border-b border-[#282835] px-4 flex items-center justify-between gap-3 text-xs">
              {/* Folder Breadcrumb */}
              <div className="flex items-center gap-1.5 overflow-x-auto truncate">
                {folderStack.map((f, i) => (
                  <React.Fragment key={f.id}>
                    {i > 0 && <span className="text-neutral-600">/</span>}
                    <button
                      onClick={() => handleNavigateUp(i)}
                      className={`truncate font-medium hover:text-white transition-colors ${
                        i === folderStack.length - 1 ? 'text-emerald-400' : 'text-neutral-400'
                      }`}
                    >
                      {f.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1 bg-[#1f1f2b] p-0.5 rounded border border-[#2d2d3d] shrink-0">
                {(['all', 'video', 'audio', 'image'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFileTypeFilter(mode)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                      fileTypeFilter === mode
                        ? 'bg-[#2b2b3d] text-emerald-400 shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative w-48 shrink-0">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search Drive footage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121217] text-neutral-200 pl-7 pr-2 py-1 rounded text-xs border border-[#2e2e38] focus:border-emerald-500 outline-none"
                />
              </form>

              {/* Refresh Button */}
              <button
                onClick={() =>
                  accessToken &&
                  loadFiles(accessToken, currentFolder.id, fileTypeFilter, searchQuery)
                }
                title="Refresh Files"
                className="p-1 rounded bg-[#20202a] text-neutral-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Files Grid View */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Loading Google Drive files...</span>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                  <span className="text-xs max-w-md text-center">{error}</span>
                </div>
              ) : folders.length === 0 && files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-2">
                  <Film className="w-8 h-8 text-neutral-600" />
                  <span className="text-xs">No media footage found in this folder</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Folders Section */}
                  {folders.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Folders ({folders.length})
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {folders.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => handleEnterFolder(f)}
                            className="p-2.5 rounded bg-[#1c1c26] hover:bg-[#252535] border border-[#2a2a3b] cursor-pointer flex items-center gap-2 transition-colors"
                          >
                            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs text-neutral-200 truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files Section */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Footage Clips ({files.length})
                      </span>
                      <div className="grid grid-cols-3 gap-3">
                        {files.map((f) => {
                          const isSelected = selectedFileIds.has(f.id);
                          const isImporting = importingIds.has(f.id);
                          const isVideo = f.mimeType.startsWith('video/');
                          const isAudio = f.mimeType.startsWith('audio/');

                          return (
                            <div
                              key={f.id}
                              onClick={() => toggleSelectFile(f.id)}
                              className={`group relative rounded-md border p-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#222230] border-emerald-500 ring-1 ring-emerald-500/50'
                                  : 'bg-[#1b1b24] border-[#292936] hover:border-neutral-600 hover:bg-[#20202c]'
                              }`}
                            >
                              {/* Thumbnail preview */}
                              <div className="aspect-video bg-black rounded overflow-hidden relative flex items-center justify-center border border-neutral-900">
                                {f.thumbnailLink ? (
                                  <img
                                    src={f.thumbnailLink}
                                    alt={f.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : isVideo ? (
                                  <div className="w-full h-full bg-gradient-to-br from-sky-950/60 to-black flex items-center justify-center">
                                    <Film className="w-6 h-6 text-sky-400" />
                                  </div>
                                ) : isAudio ? (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-950/60 to-black flex items-center justify-center">
                                    <Music className="w-6 h-6 text-emerald-400" />
                                  </div>
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-950/60 to-black flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-purple-400" />
                                  </div>
                                )}

                                {/* Selection Checkbox */}
                                <div
                                  className={`absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center border ${
                                    isSelected
                                      ? 'bg-emerald-500 border-emerald-400 text-neutral-950'
                                      : 'bg-black/60 border-neutral-500 text-transparent group-hover:border-neutral-300'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>

                                {isImporting && (
                                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center gap-1.5 text-xs text-white">
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                    <span>Importing...</span>
                                  </div>
                                )}
                              </div>

                              {/* Title & Metadata */}
                              <div className="mt-1.5">
                                <div className="text-xs font-semibold text-neutral-200 truncate group-hover:text-emerald-300">
                                  {f.name}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between mt-0.5">
                                  <span>{f.size ? `${(parseInt(f.size, 10) / (1024 * 1024)).toFixed(1)} MB` : 'Footage'}</span>
                                  <span className="uppercase text-neutral-500">{isVideo ? 'Video' : isAudio ? 'Audio' : 'Image'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="h-12 bg-[#1b1b24] border-t border-[#2e2e38] px-4 flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-mono">
                {selectedFileIds.size} file(s) selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded bg-[#272733] hover:bg-[#323242] text-neutral-300 font-medium"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleImportSelected(false)}
                  disabled={selectedFileIds.size === 0 || importingIds.size > 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#272738] hover:bg-[#323248] text-neutral-200 border border-[#3e3e52] font-medium disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Import to Bin</span>
                </button>

                <button
                  onClick={() => handleImportSelected(true)}
                  disabled={selectedFileIds.size === 0 || importingIds.size > 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-40 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Import & Place on Timeline</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
