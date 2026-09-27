import React, { useState, useEffect } from 'react';
import { X, Bookmark, Trash2, Check, Clock, Navigation } from 'lucide-react';
import { Marker } from '../types/editor';
import { formatTimecode } from '../utils/timecode';

interface MarkerModalProps {
  isOpen: boolean;
  marker: Marker | null;
  currentTime: number;
  fps?: number;
  onClose: () => void;
  onSave: (marker: Marker) => void;
  onDelete?: (markerId: string) => void;
  onSeek?: (time: number) => void;
}

export const MARKER_COLORS = [
  { name: 'Green', hex: '#22c55e', desc: 'Standard / Action' },
  { name: 'Cyan', hex: '#06b6d4', desc: 'Cut / Edit Point' },
  { name: 'Blue', hex: '#3b82f6', desc: 'VFX / Visual' },
  { name: 'Purple', hex: '#a855f7', desc: 'Audio / Music Beat' },
  { name: 'Amber', hex: '#f59e0b', desc: 'Todo / Note' },
  { name: 'Red', hex: '#ef4444', desc: 'Review / Retake' },
  { name: 'Pink', hex: '#ec4899', desc: 'Graphics / Title' },
  { name: 'White', hex: '#f4f4f5', desc: 'General' },
];

export const MarkerModal: React.FC<MarkerModalProps> = ({
  isOpen,
  marker,
  currentTime,
  fps = 30,
  onClose,
  onSave,
  onDelete,
  onSeek,
}) => {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [color, setColor] = useState('#22c55e');

  useEffect(() => {
    if (marker) {
      setName(marker.name || marker.label || 'Marker');
      setComment(marker.comment || '');
      setColor(marker.color || '#22c55e');
    } else {
      setName(`Marker @ ${formatTimecode(currentTime, fps)}`);
      setComment('');
      setColor('#22c55e');
    }
  }, [marker, currentTime, fps, isOpen]);

  if (!isOpen) return null;

  const targetTime = marker ? marker.time : currentTime;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMarker: Marker = {
      id: marker ? marker.id : `marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: targetTime,
      name: name.trim() || `Marker @ ${formatTimecode(targetTime, fps)}`,
      label: name.trim() || `Marker @ ${formatTimecode(targetTime, fps)}`,
      comment: comment.trim(),
      color,
    };
    onSave(finalMarker);
    onClose();
  };

  const handleJump = () => {
    onSeek?.(targetTime);
    onClose();
  };

  const handleDelete = () => {
    if (marker && onDelete) {
      onDelete(marker.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 select-none font-mono text-xs animate-in fade-in duration-150">
      <div className="bg-[#09090c] border border-[#27272a] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Terminal Header */}
        <div className="h-8 bg-[#111115] border-b border-[#222226] px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">&gt; MARKER:</span>
            <span className="font-bold text-neutral-100">
              {marker ? 'EDIT MARKER' : 'ADD TIMELINE MARKER'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-1.5 py-0.2 bg-[#181820] hover:bg-[#282834] border border-[#2e2e38] text-neutral-400 hover:text-white transition-colors cursor-pointer text-[10px]"
          >
            [X]
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-3.5 space-y-3">
          {/* Timecode Header Banner */}
          <div className="flex items-center justify-between p-2 bg-[#101015] border border-[#222228]">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] text-neutral-500">TIMESTAMP:</span>
              <span className="text-emerald-400 font-bold text-xs">
                {formatTimecode(targetTime, fps)}
              </span>
            </div>

            {onSeek && (
              <button
                type="button"
                onClick={handleJump}
                title="Seek playhead to marker timecode"
                className="px-2 py-0.5 bg-[#181822] hover:bg-[#222230] border border-[#303040] text-sky-300 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>[SEEK]</span>
              </button>
            )}
          </div>

          {/* Marker Name */}
          <div className="space-y-1">
            <label className="text-neutral-400 text-[10px] font-bold block">
              &gt; MARKER NAME / TAG:
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cut to B-Roll, Music Beat, Fix Audio..."
              className="w-full bg-black text-neutral-200 px-2.5 py-1.5 border border-[#2e2e38] focus:border-sky-500 outline-none text-xs font-mono"
            />
          </div>

          {/* Color Selection Palette */}
          <div className="space-y-1">
            <label className="text-neutral-400 text-[10px] font-bold block">
              &gt; COLOR CODING:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {MARKER_COLORS.map((c) => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`flex items-center gap-1.5 p-1.5 border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1a1a24] border-white text-white font-bold'
                        : 'bg-[#101014] border-[#222228] text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Marker Comment / Notes */}
          <div className="space-y-1">
            <label className="text-neutral-400 text-[10px] font-bold block">
              &gt; NOTES & COMMENTS (OPTIONAL):
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Additional production notes, instructions, cut cues..."
              className="w-full bg-black text-neutral-200 px-2.5 py-1.5 border border-[#2e2e38] focus:border-sky-500 outline-none text-xs font-mono resize-none"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-[#222228] flex items-center justify-between">
            {marker && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>[DELETE]</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 bg-[#16161c] hover:bg-[#22222a] border border-[#2c2c36] text-neutral-400 hover:text-white text-[10px] cursor-pointer"
              >
                [CANCEL]
              </button>

              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[10px] transition-all cursor-pointer border border-emerald-400 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>[SAVE MARKER]</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
