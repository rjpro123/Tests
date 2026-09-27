import React, { useState } from 'react';
import { 
  Sliders, 
  Palette, 
  Move, 
  RotateCw, 
  Eye, 
  Sparkles, 
  Type, 
  Volume2, 
  Check, 
  RefreshCw,
  X
} from 'lucide-react';
import { BlendMode, Clip, LumetriSettings } from '../types/editor';

interface EffectControlsProps {
  selectedClip: Clip | null;
  onUpdateClip: (clip: Clip) => void;
  onClose?: () => void;
}

export const EffectControls: React.FC<EffectControlsProps> = ({
  selectedClip,
  onUpdateClip,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'motion' | 'lumetri' | 'fx' | 'text'>('motion');

  if (!selectedClip) {
    return (
      <div className="w-80 bg-[#121216] border-l border-[#222228] flex flex-col select-none text-xs">
        <div className="h-8 bg-[#16161c] border-b border-[#222228] px-3 flex items-center justify-between text-neutral-400">
          <span className="font-semibold text-neutral-200">Inspector</span>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500">
          <Sliders className="w-8 h-8 text-neutral-600 mb-2 stroke-[1.5]" />
          <span className="text-neutral-300 font-medium text-xs">No Clip Selected</span>
          <span className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
            Click any clip on the timeline to adjust position, color grading, and effects
          </span>
        </div>
      </div>
    );
  }

  // Update Motion Transform
  const updateTransform = (key: keyof Clip['transform'], value: any) => {
    onUpdateClip({
      ...selectedClip,
      transform: {
        ...selectedClip.transform,
        [key]: value,
      },
    });
  };

  // Update Lumetri Color
  const updateLumetri = (key: keyof LumetriSettings, value: any) => {
    onUpdateClip({
      ...selectedClip,
      colorGrading: {
        ...selectedClip.colorGrading,
        [key]: value,
      },
    });
  };

  // Update Effects
  const updateEffect = (key: keyof Clip['effects'], value: any) => {
    onUpdateClip({
      ...selectedClip,
      effects: {
        ...selectedClip.effects,
        [key]: value,
      },
    });
  };

  // Update Titles
  const updateTitle = (key: string, value: any) => {
    if (!selectedClip.titleSettings) return;
    onUpdateClip({
      ...selectedClip,
      titleSettings: {
        ...selectedClip.titleSettings,
        [key]: value,
      },
    });
  };

  // LUT Presets
  const applyLutPreset = (preset: LumetriSettings['lutPreset']) => {
    let settings: Partial<LumetriSettings> = { lutPreset: preset };
    if (preset === 'teal-orange') {
      settings = { ...settings, exposure: 5, contrast: 20, temperature: 10, tint: -5, saturation: 120, vignette: 25 };
    } else if (preset === 'cyberpunk') {
      settings = { ...settings, exposure: 10, contrast: 30, temperature: -25, tint: 25, saturation: 140, vignette: 35 };
    } else if (preset === 'vintage-film') {
      settings = { ...settings, exposure: -5, contrast: -10, temperature: 15, tint: 8, saturation: 85, filmGrain: 25, vignette: 30 };
    } else if (preset === 'monochrome') {
      settings = { ...settings, exposure: 0, contrast: 40, saturation: 0, filmGrain: 20, vignette: 40 };
    } else if (preset === 'warm-sunset') {
      settings = { ...settings, exposure: 8, contrast: 15, temperature: 30, tint: 10, saturation: 125, vignette: 20 };
    } else {
      settings = { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 100, vignette: 0, filmGrain: 0, lutPreset: 'none' };
    }

    onUpdateClip({
      ...selectedClip,
      colorGrading: {
        ...selectedClip.colorGrading,
        ...settings,
      },
    });
  };

  return (
    <div className="w-80 bg-[#121216] border-l border-[#222228] flex flex-col select-none overflow-hidden text-xs">
      {/* Header */}
      <div className="h-8 bg-[#16161c] border-b border-[#222228] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-semibold text-neutral-200 truncate">
            {selectedClip.name}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition-colors"
            title="Close Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sub Tabs: Motion, Lumetri, FX, Title */}
      <div className="flex items-center border-b border-[#222228] bg-[#141419] p-1 gap-1 shrink-0">
        <button
          onClick={() => setActiveSubTab('motion')}
          className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
            activeSubTab === 'motion'
              ? 'text-sky-400 bg-neutral-800 shadow-xs'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Move className="w-3 h-3" />
          <span>Motion</span>
        </button>
        <button
          onClick={() => setActiveSubTab('lumetri')}
          className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
            activeSubTab === 'lumetri'
              ? 'text-sky-400 bg-neutral-800 shadow-xs'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span>Color</span>
        </button>
        <button
          onClick={() => setActiveSubTab('fx')}
          className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
            activeSubTab === 'fx'
              ? 'text-sky-400 bg-neutral-800 shadow-xs'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>FX</span>
        </button>
        {selectedClip.type === 'title' && (
          <button
            onClick={() => setActiveSubTab('text')}
            className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
              activeSubTab === 'text'
                ? 'text-amber-400 bg-neutral-800 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Type className="w-3 h-3" />
            <span>Text</span>
          </button>
        )}
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5 text-[10px]">
        {/* MOTION SECTION */}
        {activeSubTab === 'motion' && (
          <div className="space-y-3">
            <div className="font-semibold text-neutral-300 flex items-center justify-between pb-1 border-b border-neutral-800">
              <span className="flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-sky-400" />
                <span>Motion Transform</span>
              </span>
              <button
                onClick={() =>
                  onUpdateClip({
                    ...selectedClip,
                    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
                  })
                }
                title="Reset Transform"
                className="text-neutral-500 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Position X / Y */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Position X / Y</span>
                <span className="font-mono tabular-nums">
                  {selectedClip.transform.positionX}px, {selectedClip.transform.positionY}px
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="-600"
                  max="600"
                  value={selectedClip.transform.positionX}
                  onChange={(e) => updateTransform('positionX', Number(e.target.value))}
                  className="accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
                <input
                  type="range"
                  min="-400"
                  max="400"
                  value={selectedClip.transform.positionY}
                  onChange={(e) => updateTransform('positionY', Number(e.target.value))}
                  className="accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Scale</span>
                <span className="font-mono tabular-nums">
                  {Math.round(selectedClip.transform.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={selectedClip.transform.scale}
                onChange={(e) => updateTransform('scale', Number(e.target.value))}
                className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Rotation</span>
                <span className="font-mono tabular-nums">{selectedClip.transform.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.transform.rotation}
                onChange={(e) => updateTransform('rotation', Number(e.target.value))}
                className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Opacity</span>
                <span className="font-mono tabular-nums">
                  {Math.round(selectedClip.transform.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={selectedClip.transform.opacity}
                onChange={(e) => updateTransform('opacity', Number(e.target.value))}
                className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Blend Mode */}
            <div className="space-y-1.5 pt-1">
              <span className="text-neutral-400 text-[11px]">Blend Mode</span>
              <select
                value={selectedClip.transform.blendMode}
                onChange={(e) => updateTransform('blendMode', e.target.value as BlendMode)}
                className="w-full bg-[#1b1b24] text-neutral-200 p-1.5 rounded border border-[#2e2e38] text-xs outline-none"
              >
                <option value="normal">Normal (Source Over)</option>
                <option value="screen">Screen (Lighten)</option>
                <option value="multiply">Multiply (Shadows)</option>
                <option value="overlay">Overlay (Contrast)</option>
                <option value="lighten">Lighten</option>
                <option value="darken">Darken</option>
              </select>
            </div>

            {/* Transitions */}
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <span className="font-semibold text-neutral-300">Transitions</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-neutral-500">In Transition</span>
                  <select
                    value={selectedClip.transitionIn?.type || 'none'}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        transitionIn: { type: e.target.value as any, duration: 0.6 },
                      })
                    }
                    className="w-full bg-[#1b1b24] text-neutral-200 p-1 rounded border border-[#2e2e38] text-[11px]"
                  >
                    <option value="none">None</option>
                    <option value="cross-dissolve">Dissolve</option>
                    <option value="dip-to-black">Dip to Black</option>
                    <option value="wipe-left">Wipe</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500">Out Transition</span>
                  <select
                    value={selectedClip.transitionOut?.type || 'none'}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        transitionOut: { type: e.target.value as any, duration: 0.6 },
                      })
                    }
                    className="w-full bg-[#1b1b24] text-neutral-200 p-1 rounded border border-[#2e2e38] text-[11px]"
                  >
                    <option value="none">None</option>
                    <option value="cross-dissolve">Dissolve</option>
                    <option value="dip-to-black">Dip to Black</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LUMETRI COLOR SECTION */}
        {activeSubTab === 'lumetri' && (
          <div className="space-y-3">
            <div className="font-semibold text-neutral-300 flex items-center justify-between pb-1 border-b border-neutral-800">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span>Lumetri Color Grading</span>
              </span>
              <button
                onClick={() => applyLutPreset('none')}
                title="Reset Color"
                className="text-neutral-500 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Cinematic Look / LUT Presets */}
            <div className="space-y-1.5">
              <span className="text-neutral-400 text-[11px]">Cinematic Look (LUT Preset)</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'teal-orange', label: 'Teal & Orange' },
                  { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                  { id: 'vintage-film', label: 'Vintage 35mm' },
                  { id: 'warm-sunset', label: 'Warm Sunset' },
                  { id: 'monochrome', label: 'Monochrome Noir' },
                  { id: 'none', label: 'Neutral (None)' },
                ].map((lut) => (
                  <button
                    key={lut.id}
                    onClick={() => applyLutPreset(lut.id as any)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border text-left truncate transition-colors ${
                      selectedClip.colorGrading.lutPreset === lut.id
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                        : 'bg-[#1e1e27] border-[#2e2e38] text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    {lut.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Correction Sliders */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-800">
              {/* Exposure */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Exposure</span>
                  <span className="font-mono tabular-nums">{selectedClip.colorGrading.exposure}</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={selectedClip.colorGrading.exposure}
                  onChange={(e) => updateLumetri('exposure', Number(e.target.value))}
                  className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Contrast</span>
                  <span className="font-mono tabular-nums">{selectedClip.colorGrading.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={selectedClip.colorGrading.contrast}
                  onChange={(e) => updateLumetri('contrast', Number(e.target.value))}
                  className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Temperature (Cool / Warm)</span>
                  <span className="font-mono tabular-nums">{selectedClip.colorGrading.temperature}</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={selectedClip.colorGrading.temperature}
                  onChange={(e) => updateLumetri('temperature', Number(e.target.value))}
                  className="w-full accent-amber-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Saturation</span>
                  <span className="font-mono tabular-nums">{selectedClip.colorGrading.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={selectedClip.colorGrading.saturation}
                  onChange={(e) => updateLumetri('saturation', Number(e.target.value))}
                  className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Vignette */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Vignette Amount</span>
                  <span className="font-mono tabular-nums">{selectedClip.colorGrading.vignette}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={selectedClip.colorGrading.vignette}
                  onChange={(e) => updateLumetri('vignette', Number(e.target.value))}
                  className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Film Grain */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>35mm Film Grain</span>
                  <span className="font-mono tabular-nums">{selectedClip.colorGrading.filmGrain}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={selectedClip.colorGrading.filmGrain}
                  onChange={(e) => updateLumetri('filmGrain', Number(e.target.value))}
                  className="w-full accent-sky-500 bg-[#282834] rounded h-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* FILTERS & EFFECTS */}
        {activeSubTab === 'fx' && (
          <div className="space-y-3">
            <div className="font-semibold text-neutral-300 flex items-center justify-between pb-1 border-b border-neutral-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Video Filters & FX</span>
              </span>
            </div>

            {/* Gaussian Blur */}
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Gaussian Blur</span>
                <span className="font-mono tabular-nums">{selectedClip.effects.gaussianBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={selectedClip.effects.gaussianBlur}
                onChange={(e) => updateEffect('gaussianBlur', Number(e.target.value))}
                className="w-full accent-purple-500 bg-[#282834] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Effect Toggles */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              {[
                { key: 'blackAndWhite', label: 'Black & White (Monochrome)' },
                { key: 'invert', label: 'Invert Color Negative' },
                { key: 'edgeGlow', label: 'Cyan Anamorphic Glow' },
              ].map(({ key, label }) => {
                const isActive = (selectedClip.effects as any)[key];
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between p-2 rounded bg-[#1c1c24] border border-[#2b2b38] cursor-pointer hover:bg-[#22222d]"
                  >
                    <span className="text-xs text-neutral-300">{label}</span>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => updateEffect(key as any, e.target.checked)}
                      className="accent-sky-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* TITLES INSPECTOR */}
        {activeSubTab === 'text' && selectedClip.titleSettings && (
          <div className="space-y-3">
            <div className="font-semibold text-neutral-300 flex items-center justify-between pb-1 border-b border-neutral-800">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <span>Title & Text Graphic</span>
              </span>
            </div>

            {/* Text Input */}
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Headline Text</span>
              <input
                type="text"
                value={selectedClip.titleSettings.text}
                onChange={(e) => updateTitle('text', e.target.value)}
                className="w-full bg-[#1b1b24] text-neutral-100 p-2 rounded border border-[#2e2e38] text-xs outline-none focus:border-amber-400"
              />
            </div>

            {/* Subtext Input */}
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Subtext / Secondary Line</span>
              <input
                type="text"
                value={selectedClip.titleSettings.subtext || ''}
                onChange={(e) => updateTitle('subtext', e.target.value)}
                className="w-full bg-[#1b1b24] text-neutral-100 p-2 rounded border border-[#2e2e38] text-xs outline-none focus:border-amber-400"
              />
            </div>

            {/* Font Size */}
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Font Size</span>
                <span className="font-mono tabular-nums">{selectedClip.titleSettings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="72"
                value={selectedClip.titleSettings.fontSize}
                onChange={(e) => updateTitle('fontSize', Number(e.target.value))}
                className="w-full accent-amber-500 bg-[#282834] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Style Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-neutral-400">Preset Template</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'cinematic-title', label: 'Cinematic Title' },
                  { id: 'lower-third', label: 'Lower Third' },
                  { id: 'standard', label: 'Centered Subtitle' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => updateTitle('presetStyle', tpl.id)}
                    className={`px-2 py-1 rounded text-[11px] border truncate ${
                      selectedClip.titleSettings?.presetStyle === tpl.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#1e1e27] border-[#2e2e38] text-neutral-300'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
