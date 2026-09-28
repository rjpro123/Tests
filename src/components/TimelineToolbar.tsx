import React from 'react';
import { 
  MousePointer, 
  Scissors, 
  MoveHorizontal, 
  Type, 
  ZoomIn,
  SplitSquareVertical,
  Wand2,
  Sparkles
} from 'lucide-react';
import { PremiereTool } from '../types/editor';

interface TimelineToolbarProps {
  activeTool: PremiereTool;
  onSelectTool: (tool: PremiereTool) => void;
  onSplitAtPlayhead: () => void;
  onAddAdjustmentLayer?: () => void;
  onAddEffectsLayer?: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  activeTool,
  onSelectTool,
  onSplitAtPlayhead,
  onAddAdjustmentLayer,
  onAddEffectsLayer,
}) => {
  const tools: { id: PremiereTool; label: string; shortcut: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'select', label: 'Selection Tool', shortcut: 'V', icon: MousePointer },
    { id: 'razor', label: 'Razor Tool (Cut)', shortcut: 'C', icon: Scissors },
    { id: 'ripple', label: 'Ripple Edit Tool', shortcut: 'B', icon: MoveHorizontal },
    { id: 'type', label: 'Type Title Tool', shortcut: 'T', icon: Type },
    { id: 'zoom', label: 'Zoom Tool', shortcut: 'Z', icon: ZoomIn },
  ];

  return (
    <div className="w-10 bg-[#0d1226] border-r border-[#1b254a] flex flex-col items-center py-2 gap-1.5 select-none shrink-0 text-xs z-20">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
              isActive
                ? 'bg-sky-500 text-black shadow-xs font-semibold shadow-sky-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-[#152042]'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="w-5 h-[1px] bg-[#1b254a] my-1" />

      {/* Non-Destructive Adjustment Layer */}
      {onAddAdjustmentLayer && (
        <button
          onClick={onAddAdjustmentLayer}
          title="Add Non-Destructive Adjustment Layer at Playhead"
          className="w-7 h-7 rounded-md bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
        >
          <Wand2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Procedural Effects Layer */}
      {onAddEffectsLayer && (
        <button
          onClick={onAddEffectsLayer}
          title="Add Effects & Overlays Layer at Playhead"
          className="w-7 h-7 rounded-md bg-pink-950/70 hover:bg-pink-900 border border-pink-500/40 text-pink-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="w-5 h-[1px] bg-[#1b254a] my-1" />

      {/* Quick Split at Playhead */}
      <button
        onClick={onSplitAtPlayhead}
        title="Split Clip at Playhead (Ctrl+K)"
        className="w-7 h-7 rounded-md bg-[#131d3d] hover:bg-[#1a285c] border border-amber-500/40 text-amber-400 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
      >
        <SplitSquareVertical className="w-4 h-4" />
      </button>
    </div>
  );
};
