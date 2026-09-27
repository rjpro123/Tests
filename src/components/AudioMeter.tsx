import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface AudioMeterProps {
  isPlaying: boolean;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
}

export const AudioMeter: React.FC<AudioMeterProps> = ({
  isPlaying,
  masterVolume,
  onMasterVolumeChange,
}) => {
  const [levelL, setLevelL] = useState(-60);
  const [levelR, setLevelR] = useState(-60);
  const [peakL, setPeakL] = useState(-60);
  const [peakR, setPeakR] = useState(-60);

  const peakTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      setLevelL(-60);
      setLevelR(-60);
      return;
    }

    const interval = setInterval(() => {
      const levels = audioEngine.getLevels();
      setLevelL(levels.left);
      setLevelR(levels.right);

      setPeakL((prev) => Math.max(prev, levels.left));
      setPeakR((prev) => Math.max(prev, levels.right));
    }, 45);

    peakTimerRef.current = window.setInterval(() => {
      setPeakL((p) => Math.max(-60, p - 1.5));
      setPeakR((p) => Math.max(-60, p - 1.5));
    }, 200);

    return () => {
      clearInterval(interval);
      if (peakTimerRef.current) clearInterval(peakTimerRef.current);
    };
  }, [isPlaying]);

  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 3) return 100;
    return Math.max(0, Math.min(100, ((db + 60) / 63) * 100));
  };

  const ticks = [0, -6, -12, -24, -48];

  return (
    <div className="w-14 bg-[#101014] border-l border-[#222228] flex flex-col items-center py-2 select-none shrink-0 text-xs">
      <span className="font-semibold text-neutral-400 text-[10px] tracking-wider mb-1">VU dB</span>

      {/* Meter Columns & Labels */}
      <div className="flex-1 w-full flex items-center justify-center gap-1.5 px-2 relative">
        {/* Tick Mark Numbers */}
        <div className="flex flex-col justify-between h-full py-1 text-neutral-500 font-mono text-[9px] pointer-events-none tabular-nums text-right w-3.5">
          {ticks.map((t) => (
            <span key={t} className={t >= 0 ? 'text-rose-400 font-semibold' : t >= -12 ? 'text-amber-400' : ''}>
              {t}
            </span>
          ))}
        </div>

        {/* Dual Stereo Bars Container */}
        <div className="flex-1 flex gap-1 h-full py-1">
          {/* Channel L */}
          <div className="flex-1 bg-black/80 rounded-sm relative flex flex-col justify-end overflow-hidden border border-[#222228]">
            <div
              style={{ bottom: `${dbToPercent(peakL)}%` }}
              className="absolute left-0 right-0 h-[1.5px] bg-white z-10 shadow-xs"
            />
            <div
              style={{
                height: `${dbToPercent(levelL)}%`,
                background: 'linear-gradient(to top, #10b981 0%, #10b981 72%, #f59e0b 86%, #ef4444 100%)',
              }}
              className="w-full transition-all duration-75 rounded-b-xs"
            />
          </div>

          {/* Channel R */}
          <div className="flex-1 bg-black/80 rounded-sm relative flex flex-col justify-end overflow-hidden border border-[#222228]">
            <div
              style={{ bottom: `${dbToPercent(peakR)}%` }}
              className="absolute left-0 right-0 h-[1.5px] bg-white z-10 shadow-xs"
            />
            <div
              style={{
                height: `${dbToPercent(levelR)}%`,
                background: 'linear-gradient(to top, #10b981 0%, #10b981 72%, #f59e0b 86%, #ef4444 100%)',
              }}
              className="w-full transition-all duration-75 rounded-b-xs"
            />
          </div>
        </div>
      </div>

      {/* Channel Labels */}
      <div className="flex justify-around w-full text-[10px] font-mono text-neutral-400 font-medium my-1 px-2">
        <span>L</span>
        <span>R</span>
      </div>

      {/* Master Volume Slider */}
      <div className="w-full px-2 flex flex-col items-center gap-1 border-t border-neutral-800/80 pt-2">
        <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
          {masterVolume > 0 ? (
            <Volume2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <VolumeX className="w-3 h-3 text-rose-400" />
          )}
          <span>{Math.round(masterVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.05"
          value={masterVolume}
          onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
          className="w-10 accent-emerald-500 h-1.5 bg-[#222228] rounded-full cursor-pointer"
        />
      </div>
    </div>
  );
};
