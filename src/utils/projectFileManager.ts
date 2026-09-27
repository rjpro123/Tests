import { CineFlowProject, SavedProjectSnapshot, Track, Clip, MediaItem, Marker } from '../types/editor';

const ACTIVE_PROJECT_KEY = 'cineflow_active_project';
const SAVED_PROJECTS_LIST_KEY = 'cineflow_saved_projects_list';
const SAVED_PROJECT_PREFIX = 'cineflow_project_data_';

/**
 * Downloads the current project as a standalone portable file (.cineflow or .json).
 */
export function exportProjectToFile(project: CineFlowProject, filename?: string): void {
  const safeName = (filename || project.name || 'CineFlow_Project')
    .trim()
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  
  const finalFilename = safeName.endsWith('.cineflow') || safeName.endsWith('.json')
    ? safeName
    : `${safeName}.cineflow`;

  const projectJson = JSON.stringify(project, null, 2);
  const blob = new Blob([projectJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an uploaded project file (.cineflow or .json).
 */
export async function parseProjectFile(file: File): Promise<CineFlowProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error('Project file is empty.');
        }

        const data = JSON.parse(text);

        // Validation & normalization
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid project file format.');
        }

        if (!Array.isArray(data.tracks)) {
          throw new Error('Project file missing valid tracks array.');
        }

        if (!Array.isArray(data.clips)) {
          throw new Error('Project file missing valid clips array.');
        }

        const project: CineFlowProject = {
          version: data.version || '1.0.0',
          id: data.id || `proj_${Date.now()}`,
          name: data.name || file.name.replace(/\.(cineflow|json|prproj)$/i, '') || 'Imported Project',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fps: Number(data.fps) || 30,
          duration: Number(data.duration) || 30,
          currentTime: Number(data.currentTime) || 0,
          inPoint: typeof data.inPoint === 'number' ? data.inPoint : null,
          outPoint: typeof data.outPoint === 'number' ? data.outPoint : null,
          masterVolume: typeof data.masterVolume === 'number' ? data.masterVolume : 0.85,
          snapping: data.snapping !== undefined ? Boolean(data.snapping) : true,
          tracks: data.tracks,
          clips: data.clips,
          markers: Array.isArray(data.markers) ? data.markers : [],
          mediaItems: Array.isArray(data.mediaItems) ? data.mediaItems : [],
        };

        resolve(project);
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to read project file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading error.'));
    };

    reader.readAsText(file);
  });
}

/**
 * Saves project to browser localStorage and updates snapshot registry.
 */
export function saveProjectToLocalStorage(project: CineFlowProject): void {
  try {
    const updatedProject: CineFlowProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    // Save as active project
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(updatedProject));

    // Save snapshot slot
    localStorage.setItem(`${SAVED_PROJECT_PREFIX}${updatedProject.id}`, JSON.stringify(updatedProject));

    // Update list of saved projects
    const list = listSavedProjects();
    const existingIndex = list.findIndex((p) => p.id === updatedProject.id);

    const snapshot: SavedProjectSnapshot = {
      id: updatedProject.id,
      name: updatedProject.name,
      updatedAt: updatedProject.updatedAt,
      clipCount: updatedProject.clips.length,
      duration: updatedProject.duration,
      trackCount: updatedProject.tracks.length,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = snapshot;
    } else {
      list.unshift(snapshot);
    }

    // Limit snapshots list to 25 items to avoid storage overflow
    const trimmed = list.slice(0, 25);
    localStorage.setItem(SAVED_PROJECTS_LIST_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
  }
}

/**
 * Loads the active project from localStorage if available.
 */
export function loadActiveProjectFromLocalStorage(): CineFlowProject | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Lists all saved project snapshots from localStorage.
 */
export function listSavedProjects(): SavedProjectSnapshot[] {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Loads a specific saved project by ID.
 */
export function loadSavedProjectById(id: string): CineFlowProject | null {
  try {
    const raw = localStorage.getItem(`${SAVED_PROJECT_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Deletes a saved project from localStorage.
 */
export function deleteSavedProject(id: string): void {
  try {
    localStorage.removeItem(`${SAVED_PROJECT_PREFIX}${id}`);
    const list = listSavedProjects().filter((p) => p.id !== id);
    localStorage.setItem(SAVED_PROJECTS_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Failed to delete saved project:', error);
  }
}
