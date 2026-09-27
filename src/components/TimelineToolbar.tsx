import React from 'react';
import { 
  MousePointer, 
  Scissors, 
  MoveHorizontal, 
  Type, 
  ZoomIn,
  SplitSquareVertical
} from 'lucide-react';
import { PremiereTool } from '../types/editor';

interface TimelineToolbarProps {
  activeTool: PremiereTool;
  onSelectTool: (tool: PremiereTool) => void;
  onSplitAtPlayhead: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  activeTool,
  onSelectTool,
  onSplitAtPlayhead,
}) => {
  const tools: { id: PremiereTool; label: string; shortcut: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'select', label: 'Selection Tool', shortcut: 'V', icon: MousePointer },
    { id: 'razor', label: 'Razor Tool (Cut)', shortcut: 'C', icon: Scissors },
    { id: 'ripple', label: 'Ripple Edit Tool', shortcut: 'B', icon: MoveHorizontal },
    { id: 'type', label: 'Type Title Tool', shortcut: 'T', icon: Type },
    { id: 'zoom', label: 'Zoom Tool', shortcut: 'Z', icon: ZoomIn },
  ];

  return (
    <div className="w-10 bg-[#121216] border-r border-[#222228] flex flex-col items-center py-2 gap-1.5 select-none shrink-0 text-xs">
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
                ? 'bg-sky-500 text-black shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-[#1f1f26]'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="w-5 h-[1px] bg-neutral-800 my-1" />

      {/* Quick Split at Playhead */}
      <button
        onClick={onSplitAtPlayhead}
        title="Split Clip at Playhead (Ctrl+K)"
        className="w-7 h-7 rounded-md bg-[#1a161f] hover:bg-[#282033] border border-amber-500/30 text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
      >
        <SplitSquareVertical className="w-4 h-4" />
      </button>
    </div>
  );
};
