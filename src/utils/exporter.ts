import { Clip, MediaItem, Track } from '../types/editor';
import { audioEngine } from './audioEngine';
import { renderTimelineFrame } from './compositor';
import { formatTimecode } from './timecode';

export interface ExportProgress {
  percent: number;
  currentFrame: number;
  totalFrames: number;
  status: 'idle' | 'rendering' | 'encoding' | 'completed' | 'error';
  error?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSizeEstimate?: string;
}

export interface ExportConfig {
  format: 'webm' | 'mp4' | 'audio-only' | 'frame-png';
  width: number;
  height: number;
  fps: number;
  bitrate: number; // bits per second (e.g. 8_000_000)
  startTime: number;
  endTime: number;
  fileName: string;
  burnInTimecode: boolean;
  includeAudio: boolean;
  audioSampleRate?: 44100 | 48000;
}

export async function exportSequenceVideo(
  tracks: Track[],
  clips: Clip[],
  mediaMap: Map<string, MediaItem>,
  config: ExportConfig,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        format,
        width,
        height,
        fps,
        bitrate,
        startTime,
        endTime,
        fileName: rawFileName,
        burnInTimecode,
        includeAudio,
      } = config;

      const exportDuration = Math.max(0.1, endTime - startTime);
      const totalFrames = Math.max(1, Math.floor(exportDuration * fps));
      const frameInterval = 1 / fps;

      // 1. Single Frame Still Snapshot Export
      if (format === 'frame-png') {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;

        renderTimelineFrame({
          canvas: offscreenCanvas,
          currentTime: startTime,
          tracks,
          clips,
          mediaMap,
          renderWidth: width,
          renderHeight: height,
        });

        if (burnInTimecode) {
          const ctx = offscreenCanvas.getContext('2d');
          if (ctx) {
            drawTimecodeBurnIn(ctx, width, height, startTime, fps);
          }
        }

        offscreenCanvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to capture snapshot'));
            return;
          }
          const downloadUrl = URL.createObjectURL(blob);
          const finalName = rawFileName.endsWith('.png') ? rawFileName : `${rawFileName}.png`;

          onProgress({
            percent: 100,
            currentFrame: 1,
            totalFrames: 1,
            status: 'completed',
            downloadUrl,
            fileName: finalName,
            fileSizeEstimate: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
          });

          triggerDownload(downloadUrl, finalName);
          resolve(blob);
        }, 'image/png');
        return;
      }

      // 2. Video & Audio Stream Exporter
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;

      // Check supported MIME types for video/audio
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
          mimeType = 'video/webm;codecs=h264,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      const canvasStream = offscreenCanvas.captureStream(fps);

      // Connect audio mix if requested
      if (includeAudio) {
        const audioDest = audioEngine.getMasterDestination();
        const audioCtx = audioEngine.getAudioContext();
        if (audioDest && audioCtx) {
          try {
            const mediaStreamDest = audioCtx.createMediaStreamDestination();
            audioDest.connect(mediaStreamDest);
            for (const track of mediaStreamDest.stream.getAudioTracks()) {
              canvasStream.addTrack(track);
            }
          } catch (e) {
            console.warn('Audio export stream link notice:', e);
          }
        }
      }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const ext = format === 'mp4' ? '.mp4' : '.webm';
      const cleanFileName = rawFileName.replace(/\.[^/.]+$/, '');
      const finalFileName = `${cleanFileName}${ext}`;

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType });
        const downloadUrl = URL.createObjectURL(finalBlob);
        const sizeMb = (finalBlob.size / (1024 * 1024)).toFixed(2);

        onProgress({
          percent: 100,
          currentFrame: totalFrames,
          totalFrames,
          status: 'completed',
          downloadUrl,
          fileName: finalFileName,
          fileSizeEstimate: `${sizeMb} MB`,
        });

        triggerDownload(downloadUrl, finalFileName);
        resolve(finalBlob);
      };

      recorder.onerror = (err) => {
        onProgress({
          percent: 0,
          currentFrame: 0,
          totalFrames: 0,
          status: 'error',
          error: 'MediaRecorder encoding error',
        });
        reject(err);
      };

      recorder.start();

      let currentFrame = 0;

      const renderNext = () => {
        if (currentFrame >= totalFrames) {
          onProgress({
            percent: 99,
            currentFrame: totalFrames,
            totalFrames,
            status: 'encoding',
          });
          recorder.stop();
          return;
        }

        const currentTimestamp = startTime + currentFrame * frameInterval;
        renderTimelineFrame({
          canvas: offscreenCanvas,
          currentTime: currentTimestamp,
          tracks,
          clips,
          mediaMap,
          renderWidth: width,
          renderHeight: height,
        });

        // Optional Burn-in Timecode overlay on exported frame
        if (burnInTimecode) {
          const ctx = offscreenCanvas.getContext('2d');
          if (ctx) {
            drawTimecodeBurnIn(ctx, width, height, currentTimestamp, fps);
          }
        }

        currentFrame++;
        const percent = Math.floor((currentFrame / totalFrames) * 98);

        onProgress({
          percent,
          currentFrame,
          totalFrames,
          status: 'rendering',
        });

        requestAnimationFrame(renderNext);
      };

      renderNext();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      onProgress({
        percent: 0,
        currentFrame: 0,
        totalFrames: 0,
        status: 'error',
        error: errMsg,
      });
      reject(err);
    }
  });
}

function drawTimecodeBurnIn(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  fps: number
) {
  ctx.save();
  const tc = formatTimecode(time, fps);
  const fontSize = Math.max(14, Math.floor(height * 0.035));
  ctx.font = `bold ${fontSize}px monospace`;
  
  const metrics = ctx.measureText(` ${tc} `);
  const boxWidth = metrics.width + 16;
  const boxHeight = fontSize + 12;
  const x = (width - boxWidth) / 2;
  const y = height - boxHeight - 20;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tc, width / 2, y + boxHeight / 2);
  ctx.restore();
}

function triggerDownload(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
