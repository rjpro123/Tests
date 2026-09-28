import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  X, 
  CheckCircle2, 
  Clock, 
  Wand2, 
  Layers, 
  Scissors, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Type, 
  MoreHorizontal, 
  History, 
  Palette, 
  Film, 
  Trash2, 
  Check, 
  Sliders,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Clip, Track, TrackLayerType } from '../types/editor';
import { formatTimecode } from '../utils/timecode';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionExecuted?: {
    type: string;
    description: string;
    target?: string;
  };
  isError?: boolean;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  duration: number;
  tracks: Track[];
  clips: Clip[];
  selectedClip: Clip | null;
  selectedClipIds: string[];
  onAddAdjustmentLayer: (trackId?: string, time?: number) => void;
  onAddEffectsLayer: (trackId?: string, time?: number) => void;
  onAddTitle: () => void;
  onAddGenerator: (type: 'smpte-bars' | 'countdown') => void;
  onAddTrack: (type: 'video' | 'audio', layerType?: TrackLayerType) => void;
  onSplitAtPlayhead: () => void;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onDeleteClip: (clipId: string) => void;
  onUpdateClip: (clipId: string, updates: Partial<Clip>) => void;
  onApplyEffectToSelected: (effectId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onToggleTrackVisible: (trackId: string) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  isOpen,
  onClose,
  currentTime,
  duration,
  tracks,
  clips,
  selectedClip,
  selectedClipIds,
  onAddAdjustmentLayer,
  onAddEffectsLayer,
  onAddTitle,
  onAddGenerator,
  onAddTrack,
  onSplitAtPlayhead,
  onSplitClip,
  onDeleteClip,
  onUpdateClip,
  onApplyEffectToSelected,
  onToggleTrackMute,
  onToggleTrackLock,
  onToggleTrackVisible,
  onSeek,
  onTogglePlay,
}) => {
  // Top Sub-Menu View Navigation
  const [activeTab, setActiveTab] = useState<'chat' | 'actions' | 'history'>('chat');
  const [promptCategory, setPromptCategory] = useState<'cut' | 'color' | 'layers' | 'audio' | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showContextHeader, setShowContextHeader] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I'm your Timeline Copilot. You can give me direct natural language commands or use the Quick Actions sub-menu to control cuts, colors, and layers.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close options menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => {
        inputRef.current?.focus();
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Execute Timeline Action based on parsed parameters
  const executeTimelineAction = (
    action: string,
    params: any
  ): { success: boolean; description: string; target?: string } => {
    const formattedTime = formatTimecode(currentTime);

    switch (action) {
      case 'add_adjustment_layer': {
        const targetTrack = params?.trackId || (tracks.find((t) => t.type === 'video' && t.layerType === 'adjustment')?.id);
        onAddAdjustmentLayer(targetTrack, currentTime);
        return {
          success: true,
          description: `Added Adjustment Layer at ${formattedTime}`,
          target: targetTrack ? `Track ${targetTrack.toUpperCase()}` : 'Top Video Track',
        };
      }

      case 'add_effects_layer': {
        const targetTrack = params?.trackId || (tracks.find((t) => t.type === 'video' && t.layerType === 'effects')?.id);
        onAddEffectsLayer(targetTrack, currentTime);
        return {
          success: true,
          description: `Added FX Overlay Layer at ${formattedTime}`,
          target: targetTrack ? `Track ${targetTrack.toUpperCase()}` : 'Top Video Track',
        };
      }

      case 'add_title': {
        onAddTitle();
        return {
          success: true,
          description: `Inserted Title Graphic at ${formattedTime}`,
          target: 'Track V3',
        };
      }

      case 'add_smpte_bars': {
        onAddGenerator('smpte-bars');
        return {
          success: true,
          description: `Added SMPTE Color Bars Leader at ${formattedTime}`,
          target: 'Track V1',
        };
      }

      case 'add_countdown': {
        onAddGenerator('countdown');
        return {
          success: true,
          description: `Added Film Leader Countdown at ${formattedTime}`,
          target: 'Track V1',
        };
      }

      case 'add_track': {
        const type = params?.type === 'audio' ? 'audio' : 'video';
        const layerType = params?.layerType || (type === 'audio' ? 'audio' : 'media');
        onAddTrack(type, layerType);
        return {
          success: true,
          description: `Added new ${layerType.toUpperCase()} ${type.toUpperCase()} Track to sequence`,
          target: `${type.toUpperCase()} Stack`,
        };
      }

      case 'split_clip':
      case 'cut_at_playhead': {
        const activeClip = selectedClip || clips.find(
          (c) => currentTime >= c.startTime && currentTime <= c.startTime + c.duration
        );
        if (activeClip) {
          onSplitClip(activeClip.id, currentTime);
          return {
            success: true,
            description: `Split active clip "${activeClip.name}" at playhead (${formattedTime})`,
            target: activeClip.name,
          };
        } else {
          onSplitAtPlayhead();
          return {
            success: true,
            description: `Split active tracks at playhead (${formattedTime})`,
            target: 'Playhead Position',
          };
        }
      }

      case 'apply_effect': {
        const effectId = params?.effectId || 'lut-teal-orange';
        if (selectedClip) {
          onApplyEffectToSelected(effectId);
          return {
            success: true,
            description: `Applied ${effectId.replace('-', ' ').toUpperCase()} effect to "${selectedClip.name}"`,
            target: selectedClip.name,
          };
        } else {
          const activeClipUnderPlayhead = clips.find(
            (c) => currentTime >= c.startTime && currentTime <= c.startTime + c.duration
          );
          if (activeClipUnderPlayhead) {
            onApplyEffectToSelected(effectId);
            return {
              success: true,
              description: `Applied ${effectId.replace('-', ' ').toUpperCase()} to "${activeClipUnderPlayhead.name}"`,
              target: activeClipUnderPlayhead.name,
            };
          }
          onApplyEffectToSelected(effectId);
          return {
            success: true,
            description: `Applied ${effectId.replace('-', ' ').toUpperCase()} effect`,
            target: 'Active Clip',
          };
        }
      }

      case 'apply_transition': {
        const transitionType = params?.transitionType || 'fade';
        if (!selectedClip) {
          return {
            success: false,
            description: 'Please select a clip on the timeline first to apply transitions.',
          };
        }

        onUpdateClip(selectedClip.id, {
          transitionIn: { type: transitionType as any, duration: 0.8 },
          transitionOut: { type: transitionType as any, duration: 0.8 },
        });

        return {
          success: true,
          description: `Applied ${transitionType.toUpperCase()} transition (0.8s) to "${selectedClip.name}"`,
          target: selectedClip.name,
        };
      }

      case 'modify_transform': {
        if (!selectedClip) {
          return {
            success: false,
            description: 'No clip selected. Select a clip to modify transform properties.',
          };
        }

        const currentTransform = selectedClip.transform || {
          positionX: 0,
          positionY: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          blendMode: 'normal',
        };

        const updates: Partial<Clip> = {
          transform: {
            ...currentTransform,
            ...(params.scale !== undefined ? { scale: params.scale } : {}),
            ...(params.opacity !== undefined ? { opacity: params.opacity } : {}),
            ...(params.rotation !== undefined ? { rotation: params.rotation } : {}),
            ...(params.positionX !== undefined ? { positionX: params.positionX } : {}),
            ...(params.positionY !== undefined ? { positionY: params.positionY } : {}),
            ...(params.blendMode ? { blendMode: params.blendMode } : {}),
          },
        };

        onUpdateClip(selectedClip.id, updates);

        const changeStr = Object.keys(params)
          .map((k) => `${k}: ${params[k]}`)
          .join(', ');

        return {
          success: true,
          description: `Updated transform on "${selectedClip.name}" (${changeStr})`,
          target: selectedClip.name,
        };
      }

      case 'track_control': {
        const actionType = params?.actionType || 'mute';
        const trackType = params?.type || 'audio';
        
        const targetTrack = tracks.find(
          (t) => t.type === trackType || t.id.toLowerCase() === (params?.trackId || '').toLowerCase()
        );

        if (targetTrack) {
          if (actionType === 'mute') onToggleTrackMute(targetTrack.id);
          else if (actionType === 'lock') onToggleTrackLock(targetTrack.id);
          else if (actionType === 'visible') onToggleTrackVisible(targetTrack.id);

          return {
            success: true,
            description: `Toggled ${actionType.toUpperCase()} for Track ${targetTrack.name}`,
            target: `Track ${targetTrack.name}`,
          };
        } else {
          const audioTrack = tracks.find((t) => t.type === 'audio');
          if (audioTrack) {
            onToggleTrackMute(audioTrack.id);
            return {
              success: true,
              description: `Muted audio track ${audioTrack.name}`,
              target: `Track ${audioTrack.name}`,
            };
          }
        }
        return {
          success: false,
          description: 'No matching track found for control action.',
        };
      }

      case 'seek_playhead': {
        const targetTime = typeof params?.time === 'number' ? params.time : currentTime + 5;
        const boundedTime = Math.max(0, Math.min(duration, targetTime));
        onSeek(boundedTime);
        return {
          success: true,
          description: `Moved playhead to ${formatTimecode(boundedTime)}`,
          target: formatTimecode(boundedTime),
        };
      }

      case 'delete_clip': {
        if (selectedClip) {
          onDeleteClip(selectedClip.id);
          return {
            success: true,
            description: `Deleted clip "${selectedClip.name}" from timeline`,
            target: selectedClip.name,
          };
        }
        return {
          success: false,
          description: 'No clip selected to delete.',
        };
      }

      default:
        return {
          success: false,
          description: 'Unrecognized action command.',
        };
    }
  };

  // Fast Client Intent Parser (Rules Engine)
  const parseIntentLocally = (
    prompt: string
  ): { action: string; parameters: any; explanation: string } | null => {
    const p = prompt.toLowerCase().trim();

    if (
      p.includes('please add a layer') ||
      p.includes('add a layer') ||
      p.includes('add layer') ||
      p.includes('new layer') ||
      p.includes('create layer') ||
      p.includes('insert layer') ||
      p.includes('adjustment') ||
      p.includes('adj layer') ||
      p.includes('color layer')
    ) {
      return { action: 'add_adjustment_layer', parameters: {}, explanation: 'Creating an adjustment layer at playhead position.' };
    }
    if (p.includes('effect layer') || p.includes('fx layer') || p.includes('overlay layer') || p.includes('procedural')) {
      return { action: 'add_effects_layer', parameters: {}, explanation: 'Adding a procedural effects overlay layer.' };
    }
    if (
      p.includes('split active clip at playhead') ||
      p.includes('split active clip') ||
      p.includes('cut active clip at playhead') ||
      p.includes('cut active clip') ||
      p.includes('split clip at playhead') ||
      p.includes('cut clip at playhead') ||
      p.includes('split at playhead') ||
      p.includes('cut at playhead') ||
      p.includes('split clip') ||
      p.includes('cut clip') ||
      p.includes('cut') ||
      p.includes('split') ||
      p.includes('slice') ||
      p.includes('razor')
    ) {
      return { action: 'split_clip', parameters: {}, explanation: 'Splitting active clip at playhead position.' };
    }
    if (p.includes('title') || p.includes('text') || p.includes('lower third') || p.includes('caption')) {
      return { action: 'add_title', parameters: {}, explanation: 'Inserting a cinematic title graphic.' };
    }
    if (p.includes('smpte') || p.includes('color bar') || p.includes('bars')) {
      return { action: 'add_smpte_bars', parameters: {}, explanation: 'Generating SMPTE color test pattern.' };
    }
    if (p.includes('countdown') || p.includes('leader')) {
      return { action: 'add_countdown', parameters: {}, explanation: 'Adding film leader countdown generator.' };
    }
    if (p.includes('add video track') || p.includes('new video track')) {
      return { action: 'add_track', parameters: { type: 'video', layerType: 'media' }, explanation: 'Adding new Video Track to sequence.' };
    }
    if (p.includes('add audio track') || p.includes('new audio track')) {
      return { action: 'add_track', parameters: { type: 'audio', layerType: 'audio' }, explanation: 'Adding new Audio Track to sequence.' };
    }
    if (p.includes('add track') || p.includes('new track')) {
      return { action: 'add_track', parameters: { type: 'video', layerType: 'media' }, explanation: 'Creating a new timeline video layer track.' };
    }
    if (p.includes('teal') || p.includes('hollywood')) {
      return { action: 'apply_effect', parameters: { effectId: 'lut-teal-orange' }, explanation: 'Applying Lumetri Teal & Orange cinematic grade.' };
    }
    if (p.includes('cyberpunk') || p.includes('neon')) {
      return { action: 'apply_effect', parameters: { effectId: 'lut-cyberpunk' }, explanation: 'Applying Cyberpunk neon magenta look.' };
    }
    if (p.includes('vintage') || p.includes('35mm')) {
      return { action: 'apply_effect', parameters: { effectId: 'lut-vintage-film' }, explanation: 'Applying Vintage 35mm film stock preset.' };
    }
    if (p.includes('black and white') || p.includes('b&w') || p.includes('monochrome')) {
      return { action: 'apply_effect', parameters: { effectId: 'black-and-white' }, explanation: 'Applying Monochrome B&W filter.' };
    }
    if (p.includes('blur') || p.includes('gaussian')) {
      return { action: 'apply_effect', parameters: { effectId: 'gaussian-blur' }, explanation: 'Applying Gaussian Blur effect.' };
    }
    if (p.includes('glitch') || p.includes('vhs')) {
      return { action: 'apply_effect', parameters: { effectId: 'ae-vhs-glitch' }, explanation: 'Applying VHS Glitch distortion.' };
    }
    if (p.includes('glow') || p.includes('deep glow') || p.includes('bloom')) {
      return { action: 'apply_effect', parameters: { effectId: 'ae-deep-glow' }, explanation: 'Applying Deep Glow effect.' };
    }
    if (p.includes('chromatic') || p.includes('rgb split') || p.includes('fringe')) {
      return { action: 'apply_effect', parameters: { effectId: 'ae-chromatic-aberration' }, explanation: 'Applying Chromatic Aberration fringe.' };
    }
    if (p.includes('flare') || p.includes('optical flare') || p.includes('anamorphic')) {
      return { action: 'apply_effect', parameters: { effectId: 'ae-optical-flares' }, explanation: 'Adding Optical Flares burst.' };
    }
    if (p.includes('fade in')) {
      return { action: 'apply_transition', parameters: { transitionType: 'fade' }, explanation: 'Applying 0.8s Fade In transition.' };
    }
    if (p.includes('crossfade') || p.includes('dissolve')) {
      return { action: 'apply_transition', parameters: { transitionType: 'crossfade' }, explanation: 'Applying Crossfade dissolve transition.' };
    }
    if (p.includes('dip to black') || p.includes('fade to black')) {
      return { action: 'apply_transition', parameters: { transitionType: 'dip-to-black' }, explanation: 'Applying Dip to Black transition.' };
    }
    if (p.includes('mute audio') || p.includes('silence audio')) {
      return { action: 'track_control', parameters: { type: 'audio', actionType: 'mute' }, explanation: 'Muting audio tracks.' };
    }
    if (p.includes('play') || p.includes('start playback')) {
      onTogglePlay();
      return { action: 'play', parameters: {}, explanation: 'Starting playback.' };
    }
    if (p.includes('stop') || p.includes('pause')) {
      onTogglePlay();
      return { action: 'pause', parameters: {}, explanation: 'Pausing playback.' };
    }
    if (p.includes('forward') || p.includes('skip') || p.includes('ahead')) {
      return { action: 'seek_playhead', parameters: { time: currentTime + 5 }, explanation: 'Skipping playhead forward 5 seconds.' };
    }
    if (p.includes('delete clip') || p.includes('remove clip')) {
      return { action: 'delete_clip', parameters: {}, explanation: 'Removing selected clip from timeline.' };
    }

    return null;
  };

  // Direct trigger from Quick Action recipe button
  const triggerQuickAction = (action: string, params: any, customLabel: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: customLabel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const execResult = executeTimelineAction(action, params);

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text: execResult.description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionExecuted: {
        type: action,
        description: execResult.description,
        target: execResult.target,
      },
      isError: !execResult.success,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
  };

  const handleSendMessage = async (e?: React.FormEvent, directPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = directPrompt || inputPrompt;
    if (!promptToSend.trim() || isProcessing) return;

    const userText = promptToSend.trim();
    setInputPrompt('');
    setPromptCategory(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const editorContext = {
        currentTime,
        currentTimeFormatted: formatTimecode(currentTime),
        duration,
        selectedClip: selectedClip ? {
          id: selectedClip.id,
          name: selectedClip.name,
          type: selectedClip.type,
          trackId: selectedClip.trackId,
          startTime: selectedClip.startTime,
          duration: selectedClip.duration,
        } : null,
        selectedClipIds,
        tracksSummary: tracks.map((t) => ({ id: t.id, name: t.name, type: t.type, layerType: t.layerType || t.type })),
      };

      let actionData: { action: string; parameters: any; explanation: string } | null = null;

      try {
        const response = await fetch('/api/ai-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userText, editorContext }),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.action) {
            actionData = {
              action: resJson.action,
              parameters: resJson.parameters || {},
              explanation: resJson.explanation || 'Processed timeline action.',
            };
          }
        }
      } catch (err) {
        console.warn('Server AI endpoint unavailable, using local intent parser:', err);
      }

      if (!actionData) {
        actionData = parseIntentLocally(userText);
      }

      if (actionData) {
        const execResult = executeTimelineAction(actionData.action, actionData.parameters);

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: actionData.explanation || execResult.description,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionExecuted: {
            type: actionData.action,
            description: execResult.description,
            target: execResult.target,
          },
          isError: !execResult.success,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const fallbackMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: `I couldn't match "${userText}" to a timeline command. You can choose a command from the Quick Actions sub-menu tab.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };

        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } catch (err: any) {
      console.error('Error handling AI message:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: 'An error occurred while processing your timeline request. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executedActionsHistory = messages.filter((m) => m.actionExecuted);

  if (!isOpen) return null;

  // Collapsed Docked Strip Mode
  if (isCollapsed) {
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        className="w-9 bg-[#0b0f22] hover:bg-[#101738] border-l border-[#1a2346] flex flex-col items-center py-3 cursor-pointer text-slate-400 hover:text-cyan-300 transition-all select-none shadow-xl shrink-0 group z-30"
        title="Click to expand AI Assistant Copilot"
      >
        <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-xs mb-3 group-hover:scale-105 transition-transform">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="[writing-mode:vertical-lr] [transform:rotate(180deg)] text-[10px] font-bold tracking-wider text-slate-400 group-hover:text-cyan-300 uppercase">
            AI Assistant Copilot
          </span>
        </div>
        <div className="mt-auto p-1 text-slate-500 group-hover:text-white">
          <ChevronLeft className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 md:w-96 bg-[#0b0f22] border-l border-[#1a2346] flex flex-col h-full shrink-0 select-none text-xs text-slate-200 shadow-2xl relative z-40 animate-fadeIn">
      {/* Top Header with Tab Sub-Menus */}
      <div className="h-10 bg-[#101633] border-b border-[#1a2346] px-2.5 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-100 text-xs tracking-wide">Assistant</span>
        </div>

        {/* Primary Sub-Menu Segmented Bar */}
        <div className="flex items-center bg-[#070a18] rounded-md p-0.5 border border-[#1a2346]">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'chat'
                ? 'bg-[#1b254a] text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-2.5 h-2.5 text-cyan-400" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'actions'
                ? 'bg-[#1b254a] text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-2.5 h-2.5 text-purple-400" />
            <span>Actions</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'history'
                ? 'bg-[#1b254a] text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-2.5 h-2.5 text-emerald-400" />
            <span>Log ({executedActionsHistory.length})</span>
          </button>
        </div>

        {/* More Options Popover Sub-Menu */}
        <div className="flex items-center gap-1 shrink-0" ref={optionsMenuRef}>
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-1 rounded bg-[#070a18] hover:bg-[#192348] border border-[#1a2346] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Assistant Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded hover:bg-[#1a254c] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Collapse AI Assistant to strip"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1a254c] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-3 top-10 w-44 bg-[#0e142e] border border-[#233164] rounded-lg shadow-2xl py-1 z-50 animate-fadeIn text-[11px]">
              <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider font-semibold text-slate-400 border-b border-[#1b254a]">
                Assistant Settings
              </div>
              <button
                onClick={() => {
                  setShowContextHeader(!showContextHeader);
                  setShowOptionsMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-slate-200 hover:bg-[#1a2656] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{showContextHeader ? 'Hide Context Bar' : 'Show Context Bar'}</span>
              </button>
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      sender: 'assistant',
                      text: 'Chat history cleared. How can I assist with your timeline?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                  setShowOptionsMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-rose-300 hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Clear History</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Context & Selection Sub-Menu Bar */}
      {showContextHeader && (
        <div className="px-2.5 py-1.5 bg-[#080c1c] border-b border-[#1a2346] flex flex-col gap-1 text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Timecode:</span>
              <span className="font-mono text-cyan-200 font-semibold">{formatTimecode(currentTime)}</span>
            </div>
            <div className="flex items-center gap-1 truncate max-w-[150px]">
              <Layers className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate">
                {selectedClip ? selectedClip.name : 'No selection'}
              </span>
            </div>
          </div>

          {/* Quick Context Sub-Menu when clip is selected */}
          {selectedClip && (
            <div className="flex items-center gap-1 pt-1 border-t border-[#162044]/60">
              <span className="text-[9px] text-slate-500 font-semibold">Clip:</span>
              <button
                onClick={() => triggerQuickAction('split_clip', {}, `Split "${selectedClip.name}"`)}
                className="px-1.5 py-0.5 rounded bg-[#131b36] hover:bg-[#1c2854] text-slate-200 text-[9px] cursor-pointer"
              >
                Split
              </button>
              <button
                onClick={() => triggerQuickAction('apply_effect', { effectId: 'lut-teal-orange' }, 'Apply Teal & Orange')}
                className="px-1.5 py-0.5 rounded bg-[#131b36] hover:bg-[#1c2854] text-cyan-300 text-[9px] cursor-pointer"
              >
                Teal & Orange
              </button>
              <button
                onClick={() => triggerQuickAction('apply_transition', { transitionType: 'fade' }, 'Add Fade')}
                className="px-1.5 py-0.5 rounded bg-[#131b36] hover:bg-[#1c2854] text-purple-300 text-[9px] cursor-pointer"
              >
                Fade
              </button>
              <button
                onClick={() => triggerQuickAction('delete_clip', {}, `Delete "${selectedClip.name}"`)}
                className="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[9px] ml-auto cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 1: INTERACTIVE COPILOT CHAT */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#070a18]">
          {/* Scrollable Chat History */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#070a18]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 text-white ${
                    msg.sender === 'user'
                      ? 'bg-sky-600'
                      : 'bg-gradient-to-tr from-cyan-600 to-indigo-600'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <UserIcon className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                </div>

                <div className="space-y-1 max-w-[82%]">
                  <div
                    className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-sky-600 text-white font-medium rounded-tr-none'
                        : msg.isError
                        ? 'bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-tl-none'
                        : 'bg-[#101633] border border-[#1d2b5c] text-slate-200 rounded-tl-none shadow-xs'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {msg.actionExecuted && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold bg-emerald-950/60 p-1.5 rounded border border-emerald-500/30 animate-fadeIn">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <div>{msg.actionExecuted.description}</div>
                          {msg.actionExecuted.target && (
                            <div className="text-[9px] text-emerald-400/70 font-mono font-normal">
                              Target: {msg.actionExecuted.target}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`text-[9px] text-slate-500 font-mono px-1 ${
                      msg.sender === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-cyan-300 p-2 bg-[#101633] border border-[#1d2b5c] rounded-lg w-fit animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Parsing AI command & updating timeline...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Sub-Menu Prompt Category Bar (Replaces messy horizontal overflow pills) */}
          <div className="border-t border-[#1a2346] bg-[#0c1026] p-2 shrink-0">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                Prompt Sub-Menus:
              </span>
              {promptCategory && (
                <button
                  onClick={() => setPromptCategory(null)}
                  className="text-[9px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Close Sub-Menu
                </button>
              )}
            </div>

            {/* Categorized Sub-Menu Selector Buttons */}
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => setPromptCategory(promptCategory === 'cut' ? null : 'cut')}
                className={`py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  promptCategory === 'cut'
                    ? 'bg-sky-950 border-sky-500 text-sky-200'
                    : 'bg-[#121935] border-transparent text-slate-300 hover:bg-[#1a254c]'
                }`}
              >
                <Scissors className="w-2.5 h-2.5 text-sky-400" />
                <span>Cuts</span>
              </button>

              <button
                onClick={() => setPromptCategory(promptCategory === 'color' ? null : 'color')}
                className={`py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  promptCategory === 'color'
                    ? 'bg-purple-950 border-purple-500 text-purple-200'
                    : 'bg-[#121935] border-transparent text-slate-300 hover:bg-[#1a254c]'
                }`}
              >
                <Palette className="w-2.5 h-2.5 text-purple-400" />
                <span>Color</span>
              </button>

              <button
                onClick={() => setPromptCategory(promptCategory === 'layers' ? null : 'layers')}
                className={`py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  promptCategory === 'layers'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                    : 'bg-[#121935] border-transparent text-slate-300 hover:bg-[#1a254c]'
                }`}
              >
                <Layers className="w-2.5 h-2.5 text-cyan-400" />
                <span>Layers</span>
              </button>

              <button
                onClick={() => setPromptCategory(promptCategory === 'audio' ? null : 'audio')}
                className={`py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  promptCategory === 'audio'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                    : 'bg-[#121935] border-transparent text-slate-300 hover:bg-[#1a254c]'
                }`}
              >
                <Volume2 className="w-2.5 h-2.5 text-emerald-400" />
                <span>Audio</span>
              </button>
            </div>

            {/* Active Sub-Menu Items Palette */}
            {promptCategory && (
              <div className="mt-2 p-1.5 bg-[#070a18] rounded-lg border border-[#1a2346] flex flex-wrap gap-1 animate-fadeIn">
                {promptCategory === 'cut' && (
                  <>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Cut clip at playhead')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Cut at Playhead
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Split all active tracks')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Razor All Tracks
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Delete selected clip')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Delete Selected
                    </button>
                  </>
                )}

                {promptCategory === 'color' && (
                  <>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Apply Teal & Orange cinematic look')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Teal & Orange
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Apply Cyberpunk neon grade')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Cyberpunk
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Apply vintage 35mm film stock')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Vintage 35mm
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Apply black and white monochrome')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Monochrome
                    </button>
                  </>
                )}

                {promptCategory === 'layers' && (
                  <>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Add an adjustment layer')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      + Adjustment Layer
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Add an effects overlay layer')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      + FX Layer
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Add title graphic')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      + Title Graphic
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Add SMPTE color bars')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      + SMPTE Bars
                    </button>
                  </>
                )}

                {promptCategory === 'audio' && (
                  <>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Mute audio tracks')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Mute Audio Tracks
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Apply crossfade transition')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Apply Crossfade
                    </button>
                    <button
                      onClick={() => handleSendMessage(undefined, 'Add fade in transition')}
                      className="px-2 py-1 bg-[#121935] hover:bg-[#1c2754] text-slate-200 rounded text-[10px] cursor-pointer"
                    >
                      Fade In (0.8s)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-[#0e142e] border-t border-[#1a2346] flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask AI to manipulate timeline..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isProcessing}
              className="flex-1 bg-[#141b3a] border border-[#212f5e] focus:border-cyan-400 rounded px-2.5 py-1.5 text-slate-100 text-xs outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isProcessing}
              className="p-2 rounded bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white transition-all cursor-pointer shadow-xs shrink-0"
              title="Send Command"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}

      {/* SUB-VIEW 2: QUICK ACTION RECIPES (Organized Sub-Menu Cards) */}
      {activeTab === 'actions' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#070a18]">
          {/* Sub-menu Section 1: Cuts & Edit Operations */}
          <div className="bg-[#0c1126] p-2.5 rounded-lg border border-[#1a2346] space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-sky-400 tracking-wider">
              <Scissors className="w-3 h-3" />
              <span>Cuts & Edits</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={() => triggerQuickAction('split_clip', {}, 'Cut at Playhead')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px]">Razor Cut</div>
                <div className="text-[9px] text-slate-400">Slice clip at playhead</div>
              </button>
              <button
                onClick={() => triggerQuickAction('apply_transition', { transitionType: 'fade' }, 'Fade In Transition')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px]">Fade In/Out</div>
                <div className="text-[9px] text-slate-400">0.8s head & tail dissolve</div>
              </button>
            </div>
          </div>

          {/* Sub-menu Section 2: Lumetri Color & Grade Recipes */}
          <div className="bg-[#0c1126] p-2.5 rounded-lg border border-[#1a2346] space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-purple-400 tracking-wider">
              <Palette className="w-3 h-3" />
              <span>Color Grades & LUTs</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={() => triggerQuickAction('apply_effect', { effectId: 'lut-teal-orange' }, 'Teal & Orange Grade')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px] text-amber-300">Teal & Orange</div>
                <div className="text-[9px] text-slate-400">Blockbuster Hollywood</div>
              </button>
              <button
                onClick={() => triggerQuickAction('apply_effect', { effectId: 'lut-cyberpunk' }, 'Cyberpunk Look')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px] text-purple-300">Cyberpunk</div>
                <div className="text-[9px] text-slate-400">Neon magenta & cyan</div>
              </button>
              <button
                onClick={() => triggerQuickAction('apply_effect', { effectId: 'lut-vintage-film' }, 'Vintage 35mm Grade')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px] text-emerald-300">Vintage 35mm</div>
                <div className="text-[9px] text-slate-400">Kodak analog warmth</div>
              </button>
              <button
                onClick={() => triggerQuickAction('apply_effect', { effectId: 'ae-deep-glow' }, 'Deep Glow Bloom')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px] text-cyan-300">Deep Glow</div>
                <div className="text-[9px] text-slate-400">Cinematic diffusion</div>
              </button>
            </div>
          </div>

          {/* Sub-menu Section 3: Layers & Generators */}
          <div className="bg-[#0c1126] p-2.5 rounded-lg border border-[#1a2346] space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
              <Layers className="w-3 h-3" />
              <span>Layers & Graphics</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={() => triggerQuickAction('add_adjustment_layer', {}, 'Add Adjustment Layer')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px]">Adjustment Layer</div>
                <div className="text-[9px] text-slate-400">Non-destructive grade</div>
              </button>
              <button
                onClick={() => triggerQuickAction('add_effects_layer', {}, 'Add FX Overlay Layer')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px]">FX Overlay</div>
                <div className="text-[9px] text-slate-400">Procedural graphics</div>
              </button>
              <button
                onClick={() => triggerQuickAction('add_title', {}, 'Insert Title Graphic')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px]">Title Graphic</div>
                <div className="text-[9px] text-slate-400">Overlay on Track V3</div>
              </button>
              <button
                onClick={() => triggerQuickAction('add_countdown', {}, 'Add Countdown Leader')}
                className="p-2 rounded bg-[#131b36] hover:bg-[#1c2754] border border-[#202e5e] text-left text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[11px]">Film Countdown</div>
                <div className="text-[9px] text-slate-400">Leader 5-4-3-2-1</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: EXECUTED ACTION LOG */}
      {activeTab === 'history' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#070a18]">
          <div className="flex items-center justify-between pb-1 border-b border-[#1a2346] text-[10px] text-slate-400">
            <span>Executed Commands ({executedActionsHistory.length})</span>
            <button
              onClick={() => setMessages(messages.filter((m) => !m.actionExecuted))}
              className="text-rose-400 hover:text-rose-300 text-[9px] cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          {executedActionsHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <History className="w-6 h-6 mb-2 opacity-40" />
              <p>No timeline actions executed yet.</p>
              <p className="text-[10px] text-slate-600 mt-1">Actions executed via prompt or the Quick Actions menu will appear here.</p>
            </div>
          ) : (
            executedActionsHistory.map((item) => (
              <div
                key={item.id}
                className="p-2 bg-[#0c1126] border border-[#1a2346] rounded-lg text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{item.actionExecuted?.description}</span>
                  <span className="text-[9px] font-mono text-slate-500">{item.timestamp}</span>
                </div>
                {item.actionExecuted?.target && (
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Target: {item.actionExecuted.target}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
