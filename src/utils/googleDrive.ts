import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { MediaItem } from '../types/editor';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
];

const provider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory access token cache (CRITICAL: never persist in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Need re-authentication to retrieve access token
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  hasThumbnail?: boolean;
}

/**
 * Fetch files from Google Drive with filters for video, audio, image footage
 */
export async function listDriveFootageFiles({
  folderId = 'root',
  query = '',
  fileType = 'all',
  token,
}: {
  folderId?: string;
  query?: string;
  fileType?: 'all' | 'video' | 'audio' | 'image';
  token: string;
}): Promise<{ files: DriveFileItem[]; folders: DriveFileItem[] }> {
  const queryParts: string[] = ['trashed = false'];

  if (folderId && folderId !== 'all') {
    queryParts.push(`'${folderId}' in parents`);
  }

  if (query.trim()) {
    queryParts.push(`name contains '${query.trim().replace(/'/g, "\\'")}'`);
  }

  // Type filtering
  if (fileType === 'video') {
    queryParts.push(`mimeType contains 'video/'`);
  } else if (fileType === 'audio') {
    queryParts.push(`mimeType contains 'audio/'`);
  } else if (fileType === 'image') {
    queryParts.push(`mimeType contains 'image/'`);
  }

  const q = queryParts.join(' and ');
  const fields = 'files(id, name, mimeType, size, thumbnailLink, iconLink, createdTime, modifiedTime, hasThumbnail)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=50&orderBy=folder,name`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const allFiles: DriveFileItem[] = data.files || [];

  const folders = allFiles.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
  const files = allFiles.filter((f) => f.mimeType !== 'application/vnd.google-apps.folder');

  return { files, folders };
}

/**
 * Download a Google Drive footage file and convert to CineFlow MediaItem
 */
export async function importDriveFileToMediaItem(
  file: DriveFileItem,
  token: string
): Promise<MediaItem> {
  const isVideo = file.mimeType.startsWith('video/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isImage = file.mimeType.startsWith('image/');

  // Fetch actual file binary blob via alt=media
  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file from Google Drive: ${response.statusText}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  // Probe media element for dimensions and duration
  let duration = isImage ? 5.0 : 10.0;
  let width = 1920;
  let height = 1080;

  if (isVideo || isAudio) {
    try {
      const probe = document.createElement(isVideo ? 'video' : 'audio');
      probe.src = objectUrl;
      await new Promise<void>((resolve) => {
        probe.onloadedmetadata = () => {
          if (probe.duration && !isNaN(probe.duration)) {
            duration = probe.duration;
          }
          if (isVideo) {
            width = (probe as HTMLVideoElement).videoWidth || 1920;
            height = (probe as HTMLVideoElement).videoHeight || 1080;
          }
          resolve();
        };
        probe.onerror = () => resolve();
        setTimeout(resolve, 1500); // 1.5s timeout fallback
      });
    } catch (e) {
      console.warn('Probe error on imported Drive file:', e);
    }
  }

  const mediaItem: MediaItem = {
    id: `drive-${file.id}`,
    name: file.name,
    type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
    url: objectUrl,
    duration,
    width: isVideo ? width : undefined,
    height: isVideo ? height : undefined,
    thumbnail: file.thumbnailLink || (isImage ? objectUrl : ''),
  };

  return mediaItem;
}
