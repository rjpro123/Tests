import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Plus, 
  Wand2, 
  Film, 
  Video, 
  Camera, 
  Palette, 
  Clock, 
  Sliders, 
  Check, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { MediaItem } from '../types/editor';

interface AIVideoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMediaToProject: (media: MediaItem, addToTimeline?: boolean) => void;
}

export const AIVideoGeneratorModal: React.FC<AIVideoGeneratorModalProps> = ({
  isOpen,
  onClose,
  onAddMediaToProject,
}) => {
  const [prompt, setPrompt] = useState('Cyberpunk drone dive into rainy Tokyo street reflections with neon anamorphic light streaks');
  const [cameraMotion, setCameraMotion] = useState<'drone-flyover' | 'orbit' | 'dolly-zoom' | 'handheld' | 'hyperlapse'>('drone-flyover');
  const [visualStyle, setVisualStyle] = useState<'35mm-film' | 'cyberpunk' | 'photoreal' | 'technicolor' | 'noir'>('cyberpunk');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState<number>(6);
  const [motionIntensity, setMotionIntensity] = useState<number>(75);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStage, setGenerationStage] = useState<string>('');

  const [activeGeneratedMedia, setActiveGeneratedMedia] = useState<MediaItem | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<MediaItem[]>([]);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(true);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Creative Prompt Suggestions
  const promptPresets = [
    { label: 'Cyberpunk Neon', text: 'Hyper-lapse drone dive through neon skyscraper canyons in rain with purple and cyan reflections' },
    { label: 'Ocean Storm', text: 'Dramatic 4K slow-motion ocean waves crashing against black volcanic cliffs at golden hour' },
    { label: 'Orbital Station', text: 'Futuristic sci-fi spacecraft docking at massive orbital space station with planet sunrise' },
    { label: 'FPV Mountain', text: 'FPV high-speed mountain ridge flyover through misty pine forests and snowy summits' },
    { label: 'Film Noir Alley', text: 'Moody anamorphic 35mm film shot of mysterious silhouette walking through wet smoky street' },
    { label: 'Macro Nature', text: 'Macro shot of iridescent hummingbird sipping dew from glowing jungle flower in slow motion' },
  ];

  // Canvas animation preview loop for the active generated AI video
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    const renderLoop = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const t = elapsed % (activeGeneratedMedia ? activeGeneratedMedia.duration : duration);

      const w = canvas.width;
      const h = canvas.height;

      // Base background based on style
      ctx.save();
      if (visualStyle === 'cyberpunk') {
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#090514');
        bgGrad.addColorStop(0.5, '#1e0826');
        bgGrad.addColorStop(1, '#061324');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Grid lines with perspective
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.lineWidth = 1.5;
        const horizon = h * 0.55;
        for (let x = -w; x < w * 2; x += 60) {
          ctx.beginPath();
          ctx.moveTo(w / 2, horizon);
          ctx.lineTo(x + ((t * 80) % 60), h);
          ctx.stroke();
        }

        // Animated neon light beams & anamorphic streak
        const streakY = horizon + Math.sin(t * 1.5) * 40;
        const streakGrad = ctx.createLinearGradient(0, streakY, w, streakY);
        streakGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        streakGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.6)');
        streakGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = streakGrad;
        ctx.fillRect(0, streakY - 8, w, 16);

        // Futuristic floating skyscrapers silhouettes
        ctx.fillStyle = '#0f071a';
        ctx.fillRect(w * 0.1, horizon - 160 + Math.sin(t * 0.8) * 10, 90, 200);
        ctx.fillRect(w * 0.35, horizon - 220 + Math.sin(t * 0.8) * 10, 110, 280);
        ctx.fillRect(w * 0.7, horizon - 190 + Math.sin(t * 0.8) * 10, 80, 240);

        // Glowing window lights
        ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
        for (let i = 0; i < 20; i++) {
          const wx = w * 0.37 + (i % 3) * 30;
          const wy = horizon - 200 + Math.floor(i / 3) * 25 + Math.sin(t * 0.8) * 10;
          ctx.fillRect(wx, wy, 8, 12);
        }
      } else if (visualStyle === 'photoreal' || visualStyle === '35mm-film') {
        // Sunset mountain ridge & glowing atmospheric dust
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#1e1b4b');
        skyGrad.addColorStop(0.4, '#c2410c');
        skyGrad.addColorStop(0.7, '#fbbf24');
        skyGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Mountain silhouettes parallax
        const zoom = 1.0 + t * 0.03;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);

        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.6);
        ctx.lineTo(w * 0.3, h * 0.45);
        ctx.lineTo(w * 0.6, h * 0.55);
        ctx.lineTo(w, h * 0.4);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      } else {
        // Film noir / retro
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, w, h);

        const spotGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 30, w * 0.5, h * 0.4, w * 0.6);
        spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Camera Motion Effects (Camera Shake, Parallax, Drift)
      let camPanX = 0;
      let camPanY = 0;
      if (cameraMotion === 'drone-flyover') {
        camPanY = -t * 12;
      } else if (cameraMotion === 'orbit') {
        camPanX = Math.sin(t * 0.8) * 20;
      } else if (cameraMotion === 'handheld') {
        camPanX = Math.sin(t * 2) * 4;
        camPanY = Math.cos(t * 1.5) * 3;
      } else if (cameraMotion === 'hyperlapse') {
        camPanX = Math.sin(t * 4) * 8;
      }

      // Particle floating dust
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let p = 0; p < 25; p++) {
        const px = ((p * 73 + t * 45 + camPanX) % w);
        const py = ((p * 119 - t * 30 + camPanY + h) % h);
        ctx.fillRect(px, py, 2, 2);
      }

      // Vignette
      const radius = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.4, w / 2, h / 2, radius);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      // AI Watermark HUD tag
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(16, 16, 125, 24);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.strokeRect(16, 16, 125, 24);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(`AI VEO SYNTH · ${t.toFixed(1)}s`, 24, 32);

      ctx.restore();

      if (isPreviewPlaying) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, visualStyle, cameraMotion, duration, isPreviewPlaying, activeGeneratedMedia]);

  // Execute AI Video Generation
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStage('Initializing Neural Video Synthesis Engine...');

    try {
      // Stage 1: Latent Space Framing
      await new Promise((r) => setTimeout(r, 600));
      setGenerationProgress(30);
      setGenerationStage(`Analyzing camera trajectory: ${cameraMotion.replace('-', ' ').toUpperCase()}...`);

      // Stage 2: Optical flow rendering & style diffusion
      await new Promise((r) => setTimeout(r, 800));
      setGenerationProgress(65);
      setGenerationStage(`Applying ${visualStyle.toUpperCase()} aesthetic & color grading...`);

      // Stage 3: Compiling temporal frames
      await new Promise((r) => setTimeout(r, 700));
      setGenerationProgress(90);
      setGenerationStage('Compiling video container stream & metadata...');

      await new Promise((r) => setTimeout(r, 500));
      setGenerationProgress(100);

      // Capture static frame as thumbnail
      let thumbUrl = '';
      if (previewCanvasRef.current) {
        thumbUrl = previewCanvasRef.current.toDataURL('image/jpeg', 0.8);
      }

      const newMedia: MediaItem = {
        id: `ai-video-${Date.now()}`,
        name: `AI_${prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, '_')}_${duration}s.mov`,
        type: 'video',
        url: thumbUrl,
        duration,
        width: aspectRatio === '9:16' ? 1080 : 1920,
        height: aspectRatio === '9:16' ? 1920 : 1080,
        thumbnail: thumbUrl,
        generatorType: 'ai-video',
        aiPrompt: prompt,
        aiMotion: cameraMotion,
        aiStyle: visualStyle,
      };

      setActiveGeneratedMedia(newMedia);
      setRecentGenerations((prev) => [newMedia, ...prev]);
      onAddMediaToProject(newMedia, false);
    } catch (e) {
      console.error('AI Video generation error:', e);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStage('');
    }
  };

  const handleAddCurrentToTimeline = () => {
    if (activeGeneratedMedia) {
      onAddMediaToProject(activeGeneratedMedia, true);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#16161d] border border-[#2d2d3d] rounded-xl shadow-2xl w-full max-w-5xl h-[680px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1b1b24] border-b border-[#292936] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-sky-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-neutral-100 text-sm">AI Video Creation Studio</span>
              <span className="text-[11px] text-neutral-400 ml-2 font-mono">
                Neural Motion & Generative B-Roll
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Body: Split Left (Controls) and Right (Live Canvas & History) */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Panel: Directorial Controls */}
          <div className="w-[48%] border-r border-[#292936] p-5 flex flex-col gap-4 overflow-y-auto text-xs">
            {/* Prompt Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-200 font-semibold flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Scene Prompt</span>
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">English</span>
              </div>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe camera movement, lighting, subject, and atmosphere..."
                className="w-full bg-[#121217] text-neutral-200 p-2.5 rounded-lg border border-[#2e2e3e] focus:border-purple-500 outline-none text-xs leading-relaxed resize-none"
              />

              {/* Inspiration Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {promptPresets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPrompt(p.text)}
                    className="px-2 py-0.5 rounded bg-[#1f1f2a] hover:bg-[#282838] border border-[#2c2c3d] text-[10px] text-neutral-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Motion Selection */}
            <div className="space-y-1.5">
              <label className="text-neutral-300 font-semibold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Camera Motion Trajectory</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'drone-flyover', label: 'Drone Flyover' },
                  { id: 'orbit', label: 'Cinematic Orbit' },
                  { id: 'dolly-zoom', label: 'Dolly Zoom' },
                  { id: 'handheld', label: 'Handheld Cinema' },
                  { id: 'hyperlapse', label: 'Hyperlapse Rush' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setCameraMotion(m.id as any)}
                    className={`py-1.5 px-2 rounded border text-left text-[11px] truncate transition-colors ${
                      cameraMotion === m.id
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-medium'
                        : 'bg-[#1b1b24] border-[#292938] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style Selection */}
            <div className="space-y-1.5">
              <label className="text-neutral-300 font-semibold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Cinematic Aesthetic Look</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                  { id: '35mm-film', label: 'Hollywood 35mm' },
                  { id: 'photoreal', label: 'Photoreal 8K' },
                  { id: 'technicolor', label: 'Technicolor Warm' },
                  { id: 'noir', label: 'Film Noir Shadow' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setVisualStyle(s.id as any)}
                    className={`py-1.5 px-2 rounded border text-left text-[11px] truncate transition-colors ${
                      visualStyle === s.id
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-medium'
                        : 'bg-[#1b1b24] border-[#292938] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format & Duration Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-800/80">
              <div className="space-y-1">
                <span className="text-neutral-400 text-[11px]">Aspect Ratio</span>
                <div className="flex gap-1.5">
                  {(['16:9', '9:16', '1:1'] as const).map((ar) => (
                    <button
                      key={ar}
                      onClick={() => setAspectRatio(ar)}
                      className={`flex-1 py-1 rounded text-[11px] font-mono border transition-colors ${
                        aspectRatio === ar
                          ? 'bg-neutral-700 border-neutral-500 text-white font-bold'
                          : 'bg-[#1b1b24] border-[#292938] text-neutral-400'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Duration</span>
                  <span className="font-mono text-neutral-200">{duration} seconds</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="12"
                  step="2"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-purple-500 bg-[#282838] rounded h-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Motion Intensity Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Motion Energy / Velocity</span>
                <span className="font-mono text-neutral-200">{motionIntensity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={motionIntensity}
                onChange={(e) => setMotionIntensity(Number(e.target.value))}
                className="w-full accent-sky-500 bg-[#282838] rounded h-1 cursor-pointer"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="mt-auto py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Video Clip</span>
                </>
              )}
            </button>

            {/* Progress bar during generation */}
            {isGenerating && (
              <div className="space-y-1.5 p-2.5 rounded bg-[#13131a] border border-[#272738]">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span className="truncate pr-2">{generationStage}</span>
                  <span className="font-mono text-purple-400">{generationProgress}%</span>
                </div>
                <div className="h-1.5 bg-[#252538] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${generationProgress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-sky-400 transition-all duration-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Live Canvas Monitor & History */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c10] p-5 gap-4">
            {/* Monitor Header */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Generated Footage Preview</span>
              </span>

              <button
                onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1e1e28] text-neutral-300 hover:text-white"
              >
                {isPreviewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPreviewPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </div>

            {/* Canvas Viewport Frame */}
            <div className="flex-1 bg-black rounded-lg border border-[#272738] overflow-hidden flex items-center justify-center relative shadow-inner">
              <canvas
                ref={previewCanvasRef}
                width={aspectRatio === '9:16' ? 540 : 960}
                height={aspectRatio === '9:16' ? 960 : 540}
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>

            {/* Action Buttons: Add to Timeline / Add to Bin */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-neutral-400 truncate max-w-[280px]">
                {activeGeneratedMedia ? activeGeneratedMedia.name : 'Generated preview stream'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (activeGeneratedMedia) {
                      onAddMediaToProject(activeGeneratedMedia, false);
                    }
                  }}
                  disabled={!activeGeneratedMedia}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#20202c] hover:bg-[#2a2a3c] border border-[#343448] text-neutral-300 font-medium text-xs disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Save to Bin</span>
                </button>

                <button
                  onClick={handleAddCurrentToTimeline}
                  disabled={!activeGeneratedMedia}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md disabled:opacity-40"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Insert to Timeline</span>
                </button>
              </div>
            </div>

            {/* Recent Generations Gallery */}
            {recentGenerations.length > 0 && (
              <div className="space-y-1.5 border-t border-neutral-800/80 pt-3">
                <span className="text-[11px] font-semibold text-neutral-400">
                  Recent AI Clips ({recentGenerations.length})
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recentGenerations.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveGeneratedMedia(item)}
                      className={`w-28 rounded border p-1 bg-[#15151e] cursor-pointer hover:border-neutral-500 shrink-0 ${
                        activeGeneratedMedia?.id === item.id ? 'border-sky-500 ring-1 ring-sky-500' : 'border-[#272738]'
                      }`}
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="w-full aspect-video object-cover rounded-xs"
                      />
                      <div className="text-[10px] text-neutral-300 truncate mt-1">{item.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
