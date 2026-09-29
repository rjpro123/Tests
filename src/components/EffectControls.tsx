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
  X,
  Sun,
  Flame,
  Zap,
  Tv,
  Waves,
  CircleDot,
  Wand2,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Layers,
  Crop
} from 'lucide-react';
import { BlendMode, Clip, LumetriSettings, AEPlugins, DEFAULT_AE_PLUGINS } from '../types/editor';

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
  const [activeSubTab, setActiveSubTab] = useState<'motion' | 'lumetri' | 'plugins' | 'fx' | 'text'>('plugins');
  const [expandedPlugin, setExpandedPlugin] = useState<string>('opticalFlares');

  if (!selectedClip) {
    return (
      <div className="w-full h-full bg-[#0d1226] border-l border-[#1b254a] flex flex-col select-none text-xs">
        <div className="h-8 bg-[#131b36] border-b border-[#1b254a] px-3 flex items-center justify-between text-slate-400">
          <span className="font-semibold text-slate-200">Inspector</span>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-[#1b254a] text-slate-400 hover:text-white cursor-pointer transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <Wand2 className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
          <span className="text-slate-300 font-medium text-xs">No Clip Selected</span>
          <span className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
            Click any timeline clip to configure Motion, Lumetri Color, and After Effects Plugins
          </span>
        </div>
      </div>
    );
  }

  // Active Plugins safe reference
  const plugins: AEPlugins = {
    ...DEFAULT_AE_PLUGINS,
    ...(selectedClip.plugins || {}),
  };

  const updatePlugin = <K extends keyof AEPlugins>(
    pluginKey: K,
    patch: Partial<AEPlugins[K]>
  ) => {
    const basePlugin = plugins[pluginKey] || DEFAULT_AE_PLUGINS[pluginKey];
    onUpdateClip({
      ...selectedClip,
      plugins: {
        ...plugins,
        [pluginKey]: {
          ...basePlugin,
          ...patch,
        },
      },
    });
  };

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

  // Update Basic FX
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
    <div className="w-full h-full bg-[#0d1226] border-l border-[#1b254a] flex flex-col select-none overflow-hidden text-xs text-slate-200">
      {/* Header */}
      <div className="h-8 bg-[#131b36] border-b border-[#1b254a] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          {selectedClip.type === 'adjustment-layer' ? (
            <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          ) : selectedClip.type === 'effects-layer' ? (
            <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          ) : (
            <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-100 truncate">
            {selectedClip.name}
          </span>
          {selectedClip.type === 'adjustment-layer' && (
            <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-500/40 px-1 rounded font-mono font-bold">
              ADJUSTMENT
            </span>
          )}
          {selectedClip.type === 'effects-layer' && (
            <span className="text-[9px] bg-pink-950 text-pink-300 border border-pink-500/40 px-1 rounded font-mono font-bold">
              FX OVERLAY
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1b254a] text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Close Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Layer Explanation Banner */}
      {selectedClip.type === 'adjustment-layer' && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border-b border-purple-500/40 text-[10px] text-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
            <span>Non-Destructive Composite Layer</span>
          </div>
          <span className="text-purple-300 font-mono text-[9px]">Processes All Tracks Below</span>
        </div>
      )}
      {selectedClip.type === 'effects-layer' && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-pink-950/90 to-purple-950/90 border-b border-pink-500/40 text-[10px] text-pink-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-3 h-3 text-pink-400 shrink-0" />
            <span>AE Procedural Effects Generator</span>
          </div>
          <span className="text-pink-300 font-mono text-[9px]">Screen/Overlay Blend</span>
        </div>
      )}

      {/* Sub Tabs: Plugins, Motion, Color, FX, Text */}
      <div className="flex items-center border-b border-[#1b254a] bg-[#0e1633] p-1 gap-1 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('plugins')}
          className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
            activeSubTab === 'plugins'
              ? 'text-fuchsia-300 bg-[#1b254a] shadow-xs font-bold'
              : 'text-slate-400 hover:text-white hover:bg-[#152042]'
          }`}
        >
          <Wand2 className="w-3 h-3 text-fuchsia-400" />
          <span>AE Plugins</span>
        </button>

        <button
          onClick={() => setActiveSubTab('motion')}
          className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
            activeSubTab === 'motion'
              ? 'text-sky-400 bg-[#1b254a] shadow-xs font-bold'
              : 'text-slate-400 hover:text-white hover:bg-[#152042]'
          }`}
        >
          <Move className="w-3 h-3 text-sky-400" />
          <span>Motion</span>
        </button>

        <button
          onClick={() => setActiveSubTab('lumetri')}
          className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
            activeSubTab === 'lumetri'
              ? 'text-amber-300 bg-[#1b254a] shadow-xs font-bold'
              : 'text-slate-400 hover:text-white hover:bg-[#152042]'
          }`}
        >
          <Palette className="w-3 h-3 text-amber-400" />
          <span>Color</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fx')}
          className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
            activeSubTab === 'fx'
              ? 'text-indigo-400 bg-[#1b254a] shadow-xs font-bold'
              : 'text-slate-400 hover:text-white hover:bg-[#152042]'
          }`}
        >
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>FX</span>
        </button>

        {selectedClip.type === 'title' && (
          <button
            onClick={() => setActiveSubTab('text')}
            className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all cursor-pointer font-medium flex items-center justify-center gap-1 ${
              activeSubTab === 'text'
                ? 'text-emerald-400 bg-[#1b254a] shadow-xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#152042]'
            }`}
          >
            <Type className="w-3 h-3 text-emerald-400" />
            <span>Text</span>
          </button>
        )}
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3 text-xs bg-[#0b1021]">
        
        {/* AFTER EFFECTS PLUGINS SUITE */}
        {activeSubTab === 'plugins' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-[#1b254a]">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>After Effects Plugins</span>
              </span>
              <span className="text-[10px] text-fuchsia-400/80 font-mono">Real-time GPU FX</span>
            </div>

            {/* 1. Optical Flares (Knoll Light Factory style) */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'opticalFlares' ? '' : 'opticalFlares')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-slate-100 text-xs">Optical Flares Pro</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.opticalFlares.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('opticalFlares', { enabled: e.target.checked });
                    }}
                    className="accent-cyan-400 cursor-pointer"
                  />
                  {expandedPlugin === 'opticalFlares' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'opticalFlares' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-medium">PRESET</label>
                    <select
                      value={plugins.opticalFlares.preset}
                      onChange={(e) => updatePlugin('opticalFlares', { preset: e.target.value as any, enabled: true })}
                      className="w-full bg-[#131d3d] text-white px-2 py-1 rounded border border-[#202f64] outline-none text-xs"
                    >
                      <option value="anamorphic-cyan">Anamorphic Cyan Flare (Sci-Fi / JJ)</option>
                      <option value="warm-solar">Warm Solar Burst (Sunset Golden)</option>
                      <option value="scifi-violet">Sci-Fi Violet Laser Streak</option>
                      <option value="emerald-star">Emerald Starburst Flare</option>
                      <option value="golden-flare">Vintage 35mm Prime Glare</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Brightness / Intensity</span>
                      <span className="font-mono text-cyan-400">{plugins.opticalFlares.intensity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={plugins.opticalFlares.intensity}
                      onChange={(e) => updatePlugin('opticalFlares', { intensity: parseFloat(e.target.value), enabled: true })}
                      className="w-full accent-cyan-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Anamorphic Streak Length</span>
                      <span className="font-mono text-cyan-400">{plugins.opticalFlares.streakLength.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="3.0"
                      step="0.1"
                      value={plugins.opticalFlares.streakLength}
                      onChange={(e) => updatePlugin('opticalFlares', { streakLength: parseFloat(e.target.value), enabled: true })}
                      className="w-full accent-cyan-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Position X ({Math.round(plugins.opticalFlares.posX * 100)}%)</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={plugins.opticalFlares.posX}
                        onChange={(e) => updatePlugin('opticalFlares', { posX: parseFloat(e.target.value), enabled: true })}
                        className="w-full accent-cyan-400 bg-[#172040] rounded h-1 cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Position Y ({Math.round(plugins.opticalFlares.posY * 100)}%)</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={plugins.opticalFlares.posY}
                        onChange={(e) => updatePlugin('opticalFlares', { posY: parseFloat(e.target.value), enabled: true })}
                        className="w-full accent-cyan-400 bg-[#172040] rounded h-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Trapcode Particular Particles */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'trapcodeParticles' ? '' : 'trapcodeParticles')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-100 text-xs">Trapcode Particular</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.trapcodeParticles.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('trapcodeParticles', { enabled: e.target.checked });
                    }}
                    className="accent-amber-400 cursor-pointer"
                  />
                  {expandedPlugin === 'trapcodeParticles' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'trapcodeParticles' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-medium">EMITTER PRESET</label>
                    <select
                      value={plugins.trapcodeParticles.type}
                      onChange={(e) => updatePlugin('trapcodeParticles', { type: e.target.value as any, enabled: true })}
                      className="w-full bg-[#131d3d] text-white px-2 py-1 rounded border border-[#202f64] outline-none text-xs"
                    >
                      <option value="floating-embers">Fire Embers (Upward Chimney Drift)</option>
                      <option value="golden-stardust">Golden Stardust (Cosmic Shimmer)</option>
                      <option value="cyber-sparks">Cyber High-Speed Sparks</option>
                      <option value="cosmic-snow">Atmospheric Snow Drift</option>
                      <option value="bokeh-orbs">Cinematic Bokeh Halo Orbs</option>
                      <option value="matrix-rain">Digital Matrix Glyph Stream</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Particle Count</span>
                      <span className="font-mono text-amber-400">{plugins.trapcodeParticles.count}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="5"
                      value={plugins.trapcodeParticles.count}
                      onChange={(e) => updatePlugin('trapcodeParticles', { count: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-amber-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Simulation Speed</span>
                      <span className="font-mono text-amber-400">{plugins.trapcodeParticles.speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={plugins.trapcodeParticles.speed}
                      onChange={(e) => updatePlugin('trapcodeParticles', { speed: parseFloat(e.target.value), enabled: true })}
                      className="w-full accent-amber-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Flow Direction</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {['up', 'down', 'float', 'swirl'].map((dir) => (
                        <button
                          key={dir}
                          onClick={() => updatePlugin('trapcodeParticles', { direction: dir as any, enabled: true })}
                          className={`py-1 rounded text-[10px] capitalize cursor-pointer border ${
                            plugins.trapcodeParticles.direction === dir
                              ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                              : 'bg-[#131d3d] border-[#202f64] text-slate-400'
                          }`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Deep Glow (Anamorphic Radiance) */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'deepGlow' ? '' : 'deepGlow')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold text-slate-100 text-xs">Deep Glow Studio</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.deepGlow.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('deepGlow', { enabled: e.target.checked });
                    }}
                    className="accent-blue-400 cursor-pointer"
                  />
                  {expandedPlugin === 'deepGlow' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'deepGlow' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Glow Radiance Intensity</span>
                      <span className="font-mono text-blue-400">{plugins.deepGlow.intensity.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={plugins.deepGlow.intensity}
                      onChange={(e) => updatePlugin('deepGlow', { intensity: parseFloat(e.target.value), enabled: true })}
                      className="w-full accent-blue-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Glow Radius (Falloff)</span>
                      <span className="font-mono text-blue-400">{plugins.deepGlow.radius}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="2"
                      value={plugins.deepGlow.radius}
                      onChange={(e) => updatePlugin('deepGlow', { radius: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-blue-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Chromatic Aberration & RGB Split */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'chromaticAberration' ? '' : 'chromaticAberration')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold text-slate-100 text-xs">Chromatic Aberration</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.chromaticAberration.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('chromaticAberration', { enabled: e.target.checked });
                    }}
                    className="accent-rose-400 cursor-pointer"
                  />
                  {expandedPlugin === 'chromaticAberration' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'chromaticAberration' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Channel Offset Dispersion</span>
                      <span className="font-mono text-rose-400">{plugins.chromaticAberration.offset}px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="30"
                      step="1"
                      value={plugins.chromaticAberration.offset}
                      onChange={(e) => updatePlugin('chromaticAberration', { offset: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-rose-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Prism Angle</span>
                      <span className="font-mono text-rose-400">{plugins.chromaticAberration.angle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={plugins.chromaticAberration.angle}
                      onChange={(e) => updatePlugin('chromaticAberration', { angle: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-rose-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. VHS Glitch & Retro CRT */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'vhsGlitch' ? '' : 'vhsGlitch')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Tv className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-slate-100 text-xs">VHS Tape & CRT Damage</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.vhsGlitch.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('vhsGlitch', { enabled: e.target.checked });
                    }}
                    className="accent-emerald-400 cursor-pointer"
                  />
                  {expandedPlugin === 'vhsGlitch' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'vhsGlitch' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <label className="flex items-center justify-between p-1.5 rounded bg-[#131d3d] border border-[#202f64] cursor-pointer">
                    <span>CRT Interlaced Scanlines</span>
                    <input
                      type="checkbox"
                      checked={plugins.vhsGlitch.scanlines}
                      onChange={(e) => updatePlugin('vhsGlitch', { scanlines: e.target.checked, enabled: true })}
                      className="accent-emerald-400"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded bg-[#131d3d] border border-[#202f64] cursor-pointer">
                    <span>VCR OSD Timestamp (PLAY ▶ SP)</span>
                    <input
                      type="checkbox"
                      checked={plugins.vhsGlitch.vcrTimestamp}
                      onChange={(e) => updatePlugin('vhsGlitch', { vcrTimestamp: e.target.checked, enabled: true })}
                      className="accent-emerald-400"
                    />
                  </label>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Tape Static Noise</span>
                      <span className="font-mono text-emerald-400">{plugins.vhsGlitch.tapeNoise}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={plugins.vhsGlitch.tapeNoise}
                      onChange={(e) => updatePlugin('vhsGlitch', { tapeNoise: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-emerald-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Tracking Head Jitter</span>
                      <span className="font-mono text-emerald-400">{plugins.vhsGlitch.trackingJitter}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="2"
                      value={plugins.vhsGlitch.trackingJitter}
                      onChange={(e) => updatePlugin('vhsGlitch', { trackingJitter: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-emerald-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Wave Displacement / Heat Shimmer */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'waveDisplacement' ? '' : 'waveDisplacement')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Waves className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-semibold text-slate-100 text-xs">Turbulent Wave Warp</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.waveDisplacement.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('waveDisplacement', { enabled: e.target.checked });
                    }}
                    className="accent-teal-400 cursor-pointer"
                  />
                  {expandedPlugin === 'waveDisplacement' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'waveDisplacement' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Displacement Amplitude</span>
                      <span className="font-mono text-teal-400">{plugins.waveDisplacement.amplitude}px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="40"
                      step="1"
                      value={plugins.waveDisplacement.amplitude}
                      onChange={(e) => updatePlugin('waveDisplacement', { amplitude: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-teal-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Wave Frequency</span>
                      <span className="font-mono text-teal-400">{plugins.waveDisplacement.frequency}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={plugins.waveDisplacement.frequency}
                      onChange={(e) => updatePlugin('waveDisplacement', { frequency: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-teal-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 7. CC Light Rays (God Rays) */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'lightRays' ? '' : 'lightRays')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="font-semibold text-slate-100 text-xs">CC Light Rays (God Rays)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.lightRays.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('lightRays', { enabled: e.target.checked });
                    }}
                    className="accent-yellow-300 cursor-pointer"
                  />
                  {expandedPlugin === 'lightRays' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'lightRays' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Ray Intensity</span>
                      <span className="font-mono text-yellow-300">{plugins.lightRays.intensity.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={plugins.lightRays.intensity}
                      onChange={(e) => updatePlugin('lightRays', { intensity: parseFloat(e.target.value), enabled: true })}
                      className="w-full accent-yellow-300 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Ray Length</span>
                      <span className="font-mono text-yellow-300">{Math.round(plugins.lightRays.rayLength * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={plugins.lightRays.rayLength}
                      onChange={(e) => updatePlugin('lightRays', { rayLength: parseFloat(e.target.value), enabled: true })}
                      className="w-full accent-yellow-300 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 8. Halftone & Pixelator */}
            <div className="bg-[#0e1633] rounded-lg border border-[#1b254a] overflow-hidden">
              <div 
                onClick={() => setExpandedPlugin(expandedPlugin === 'halftone' ? '' : 'halftone')}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#141f47] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CircleDot className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-semibold text-slate-100 text-xs">Halftone & Pixel Matrix</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plugins.halftone.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePlugin('halftone', { enabled: e.target.checked });
                    }}
                    className="accent-purple-400 cursor-pointer"
                  />
                  {expandedPlugin === 'halftone' ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {expandedPlugin === 'halftone' && (
                <div className="p-3 border-t border-[#1b254a] space-y-2.5 bg-[#0a0f24] text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Dot / Cell Size</span>
                      <span className="font-mono text-purple-400">{plugins.halftone.cellSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="32"
                      step="2"
                      value={plugins.halftone.cellSize}
                      onChange={(e) => updatePlugin('halftone', { cellSize: parseInt(e.target.value), enabled: true })}
                      className="w-full accent-purple-400 bg-[#172040] rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOTION SECTION */}
        {activeSubTab === 'motion' && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-200 flex items-center justify-between pb-1 border-b border-[#1b254a]">
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
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Position X / Y */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Position X / Y</span>
                <span className="font-mono tabular-nums text-slate-200">
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
                  className="accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
                />
                <input
                  type="range"
                  min="-400"
                  max="400"
                  value={selectedClip.transform.positionY}
                  onChange={(e) => updateTransform('positionY', Number(e.target.value))}
                  className="accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Scale</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {Math.round(selectedClip.transform.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={selectedClip.transform.scale}
                onChange={(e) => updateTransform('scale', Number(e.target.value))}
                className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Rotation</span>
                <span className="font-mono tabular-nums text-slate-200">{selectedClip.transform.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.transform.rotation}
                onChange={(e) => updateTransform('rotation', Number(e.target.value))}
                className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Opacity</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {Math.round(selectedClip.transform.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedClip.transform.opacity}
                onChange={(e) => updateTransform('opacity', Number(e.target.value))}
                className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Blend Mode */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Compositing Blend Mode</span>
              <select
                value={selectedClip.transform.blendMode}
                onChange={(e) => updateTransform('blendMode', e.target.value as BlendMode)}
                className="w-full bg-[#131d3d] text-slate-200 p-1.5 rounded border border-[#202f64] text-xs outline-none cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="screen">Screen (Light / Flares)</option>
                <option value="multiply">Multiply (Shadows)</option>
                <option value="overlay">Overlay (Contrast)</option>
                <option value="lighten">Lighten</option>
                <option value="darken">Darken</option>
              </select>
            </div>

            {/* Crop Boundaries Section */}
            <div className="space-y-2 pt-2 border-t border-[#1b254a]">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="text-[11px] flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-sky-400" />
                  <span>Crop Boundaries</span>
                </span>
                <button
                  onClick={() =>
                    onUpdateClip({
                      ...selectedClip,
                      transform: {
                        ...selectedClip.transform,
                        crop: { top: 0, bottom: 0, left: 0, right: 0 },
                      },
                    })
                  }
                  className="text-[10px] text-slate-400 hover:text-white"
                  title="Reset Crop"
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Left</span>
                    <span className="font-mono text-sky-300">{selectedClip.transform.crop?.left || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop?.left || 0}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        transform: {
                          ...selectedClip.transform,
                          crop: {
                            top: selectedClip.transform.crop?.top || 0,
                            bottom: selectedClip.transform.crop?.bottom || 0,
                            left: Number(e.target.value),
                            right: selectedClip.transform.crop?.right || 0,
                          },
                        },
                      })
                    }
                    className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Right</span>
                    <span className="font-mono text-sky-300">{selectedClip.transform.crop?.right || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop?.right || 0}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        transform: {
                          ...selectedClip.transform,
                          crop: {
                            top: selectedClip.transform.crop?.top || 0,
                            bottom: selectedClip.transform.crop?.bottom || 0,
                            left: selectedClip.transform.crop?.left || 0,
                            right: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Top</span>
                    <span className="font-mono text-sky-300">{selectedClip.transform.crop?.top || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop?.top || 0}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        transform: {
                          ...selectedClip.transform,
                          crop: {
                            top: Number(e.target.value),
                            bottom: selectedClip.transform.crop?.bottom || 0,
                            left: selectedClip.transform.crop?.left || 0,
                            right: selectedClip.transform.crop?.right || 0,
                          },
                        },
                      })
                    }
                    className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Bottom</span>
                    <span className="font-mono text-sky-300">{selectedClip.transform.crop?.bottom || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop?.bottom || 0}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        transform: {
                          ...selectedClip.transform,
                          crop: {
                            top: selectedClip.transform.crop?.top || 0,
                            bottom: Number(e.target.value),
                            left: selectedClip.transform.crop?.left || 0,
                            right: selectedClip.transform.crop?.right || 0,
                          },
                        },
                      })
                    }
                    className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COLOR SECTION */}
        {activeSubTab === 'lumetri' && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-200 flex items-center justify-between pb-1 border-b border-[#1b254a]">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Lumetri Color Grading</span>
              </span>
              <button
                onClick={() => applyLutPreset('none')}
                title="Reset Color"
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* 3D LUT Cinematic Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">Cinematic Look LUTs</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'none', label: 'Default' },
                  { id: 'teal-orange', label: 'Teal & Orange' },
                  { id: 'cyberpunk', label: 'Cyberpunk' },
                  { id: 'vintage-film', label: 'Vintage 35mm' },
                  { id: 'monochrome', label: 'Monochrome' },
                  { id: 'warm-sunset', label: 'Warm Sunset' },
                ].map((lut) => (
                  <button
                    key={lut.id}
                    onClick={() => applyLutPreset(lut.id as any)}
                    className={`px-2 py-1 rounded text-[11px] border truncate transition-all cursor-pointer ${
                      selectedClip.colorGrading.lutPreset === lut.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-[#131d3d] border-[#202f64] text-slate-400 hover:bg-[#18254f] hover:text-slate-200'
                    }`}
                  >
                    {lut.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-2 pt-2 border-t border-[#1b254a]">
              {/* Exposure */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Exposure</span>
                  <span className="font-mono tabular-nums text-slate-200">{selectedClip.colorGrading.exposure}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.exposure}
                  onChange={(e) => updateLumetri('exposure', Number(e.target.value))}
                  className="w-full accent-amber-500 bg-[#172040] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Contrast</span>
                  <span className="font-mono tabular-nums text-slate-200">{selectedClip.colorGrading.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.contrast}
                  onChange={(e) => updateLumetri('contrast', Number(e.target.value))}
                  className="w-full accent-amber-500 bg-[#172040] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>White Balance (Temp)</span>
                  <span className="font-mono tabular-nums text-slate-200">{selectedClip.colorGrading.temperature}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.temperature}
                  onChange={(e) => updateLumetri('temperature', Number(e.target.value))}
                  className="w-full accent-amber-500 bg-[#172040] rounded h-1 cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Saturation</span>
                  <span className="font-mono tabular-nums text-slate-200">{selectedClip.colorGrading.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={selectedClip.colorGrading.saturation}
                  onChange={(e) => updateLumetri('saturation', Number(e.target.value))}
                  className="w-full accent-sky-500 bg-[#172040] rounded h-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* FILTERS & EFFECTS */}
        {activeSubTab === 'fx' && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-200 flex items-center justify-between pb-1 border-b border-[#1b254a]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Video Filters & FX</span>
              </span>
            </div>

            {/* Gaussian Blur */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Gaussian Blur</span>
                <span className="font-mono tabular-nums text-slate-200">{selectedClip.effects.gaussianBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={selectedClip.effects.gaussianBlur}
                onChange={(e) => updateEffect('gaussianBlur', Number(e.target.value))}
                className="w-full accent-purple-500 bg-[#172040] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Effect Toggles */}
            <div className="space-y-2 pt-2 border-t border-[#1b254a]">
              {[
                { key: 'blackAndWhite', label: 'Black & White (Monochrome)' },
                { key: 'invert', label: 'Invert Color Negative' },
                { key: 'edgeGlow', label: 'Cyan Anamorphic Glow' },
              ].map(({ key, label }) => {
                const isActive = (selectedClip.effects as any)[key];
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between p-2 rounded bg-[#0e1633] border border-[#1b254a] cursor-pointer hover:bg-[#141f47]"
                  >
                    <span className="text-xs text-slate-300">{label}</span>
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
            <div className="font-semibold text-slate-200 flex items-center justify-between pb-1 border-b border-[#1b254a]">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <span>Title & Text Graphic</span>
              </span>
            </div>

            {/* Text Input */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Headline Text</span>
              <input
                type="text"
                value={selectedClip.titleSettings.text}
                onChange={(e) => updateTitle('text', e.target.value)}
                className="w-full bg-[#131d3d] text-slate-100 p-2 rounded border border-[#202f64] text-xs outline-none focus:border-amber-400"
              />
            </div>

            {/* Subtext Input */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Subtext / Secondary Line</span>
              <input
                type="text"
                value={selectedClip.titleSettings.subtext || ''}
                onChange={(e) => updateTitle('subtext', e.target.value)}
                className="w-full bg-[#131d3d] text-slate-100 p-2 rounded border border-[#202f64] text-xs outline-none focus:border-amber-400"
              />
            </div>

            {/* Font Size */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Font Size</span>
                <span className="font-mono tabular-nums text-slate-200">{selectedClip.titleSettings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="72"
                value={selectedClip.titleSettings.fontSize}
                onChange={(e) => updateTitle('fontSize', Number(e.target.value))}
                className="w-full accent-amber-500 bg-[#172040] rounded h-1 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
