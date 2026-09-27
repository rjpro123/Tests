import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, CornerDownRight, ArrowDownToLine, Film } from 'lucide-react';
import { MediaItem } from '../types/editor';
import { formatTimecode } from '../utils/timecode';

interface SourceMonitorProps {
  media: MediaItem | null;
  onInsertToTimeline: (media: MediaItem, inTime: number, outTime: number) => void;
  onOverwriteToTimeline: (media: MediaItem, inTime: number, outTime: number) => void;
}

export const SourceMonitor: React.FC<SourceMonitorProps> = ({
  media,
  onInsertToTimeline,
  onOverwriteToTimeline,
}) => {
  const [sourceTime, setSourceTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const animRef = useRef<number | null>(null);

  // Reset in/out when media changes
  useEffect(() => {
    if (media) {
      setSourceTime(0);
      setInPoint(0);
      setOutPoint(media.duration);
      setIsPlaying(false);
    }
  }, [media?.id]);

  useEffect(() => {
    if (!isPlaying || !media) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setSourceTime((prev) => {
        const next = prev + dt;
        if (next >= (outPoint || media.duration)) {
          setIsPlaying(false);
          return inPoint;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, media, inPoint, outPoint]);

  if (!media) {
    return (
      <div className="flex-1 flex flex-col bg-[#141418] border border-[#2e2e38] rounded overflow-hidden select-none">
        <div className="h-8 bg-[#1a1a20] border-b border-[#2e2e38] px-3 flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-400">Source: (No Clip Loaded)</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-neutral-500 gap-2">
          <Film className="w-8 h-8 text-neutral-600" />
          <p className="text-xs text-center max-w-[200px]">
            Double-click any clip in the Project Bin to load into Source Monitor
          </p>
        </div>
      </div>
    );
  }

  const duration = media.duration || 10;
  const currentOut = outPoint ?? duration;

  return (
    <div className="flex-1 flex flex-col bg-[#141418] border border-[#2e2e38] rounded overflow-hidden select-none">
      {/* Panel Tab Header */}
      <div className="h-8 bg-[#1a1a20] border-b border-[#2e2e38] px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-neutral-200">Source:</span>
          <span className="text-amber-400 font-medium truncate max-w-[200px]">{media.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[11px] tabular-nums">
          <span>{formatTimecode(sourceTime, 30)}</span>
          <span className="text-neutral-600">/</span>
          <span>{formatTimecode(duration, 30)}</span>
        </div>
      </div>

      {/* Source Preview Canvas / Image */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden p-2">
        {media.type === 'video' || media.type === 'image' ? (
          <img
            src={media.thumbnail}
            alt={media.name}
            className="max-h-full max-w-full object-contain rounded-sm"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-neutral-400">
            <div className="w-16 h-16 rounded bg-[#23232c] flex items-center justify-center">
              <Film className="w-8 h-8 text-sky-400" />
            </div>
            <span className="text-xs font-mono">{media.name}</span>
          </div>
        )}
      </div>

      {/* Scrub bar */}
      <div className="bg-[#18181f] border-t border-[#2e2e38] px-3 py-2 flex flex-col gap-1.5 shrink-0">
        <div
          className="relative h-2 bg-[#262633] rounded cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setSourceTime(pos * duration);
          }}
        >
          {/* In / Out visual range */}
          <div
            className="absolute top-0 bottom-0 bg-amber-500/25 border-l border-r border-amber-400"
            style={{
              left: `${(inPoint / duration) * 100}%`,
              width: `${((currentOut - inPoint) / duration) * 100}%`,
            }}
          />
          <div
            className="h-full bg-amber-400 rounded transition-all duration-75"
            style={{ width: `${(sourceTime / duration) * 100}%` }}
          />
        </div>

        {/* Transport Toolbar */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInPoint(sourceTime)}
              title="Mark In (I)"
              className="px-2 py-0.5 rounded bg-[#23232c] hover:bg-[#2e2e3a] border border-[#343442] text-[11px] font-mono font-bold text-neutral-300"
            >
              Mark In
            </button>
            <button
              onClick={() => setOutPoint(sourceTime)}
              title="Mark Out (O)"
              className="px-2 py-0.5 rounded bg-[#23232c] hover:bg-[#2e2e3a] border border-[#343442] text-[11px] font-mono font-bold text-neutral-300"
            >
              Mark Out
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Insert and Overwrite Buttons (Signature Premiere Pro buttons) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onInsertToTimeline(media, inPoint, currentOut)}
              title="Insert to Timeline (,)"
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#252530] hover:bg-[#2f2f3d] border border-[#3b3b4d] text-neutral-200 text-[11px] font-medium"
            >
              <CornerDownRight className="w-3 h-3 text-amber-400" />
              <span>Insert</span>
            </button>
            <button
              onClick={() => onOverwriteToTimeline(media, inPoint, currentOut)}
              title="Overwrite to Timeline (.)"
              className="flex items-center gap-1 px-2 py-1 rounded bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/50 text-sky-200 text-[11px] font-medium"
            >
              <ArrowDownToLine className="w-3 h-3 text-sky-400" />
              <span>Overwrite</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
