import { Clip, MediaItem, Track, AEPlugins } from '../types/editor';

// Image cache for instantaneous canvas rendering
const imageCache: Map<string, HTMLImageElement> = new Map();

// Reusable offscreen canvas for non-destructive Adjustment Layer grading
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

function getOffscreenCanvas(width: number, height: number) {
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
  }
  if (offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext('2d');
  }
  return { canvas: offscreenCanvas, ctx: offscreenCtx };
}

export function preloadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      // Return empty image on error to prevent crashes
      imageCache.set(src, img);
      resolve(img);
    };
  });
}

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  currentTime: number;
  tracks: Track[];
  clips: Clip[];
  mediaMap: Map<string, MediaItem>;
  showSafeMargins?: boolean;
  activeLut?: string;
  renderWidth?: number;
  renderHeight?: number;
}

export function renderTimelineFrame({
  canvas,
  currentTime,
  tracks,
  clips,
  mediaMap,
  showSafeMargins = false,
  renderWidth = 1920,
  renderHeight = 1080,
}: RenderOptions) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set internal resolution
  if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
    canvas.width = renderWidth;
    canvas.height = renderHeight;
  }

  // Clear canvas to sequence black
  ctx.save();
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, renderWidth, renderHeight);

  // Group video tracks from bottom (base layers) to top (adjustment/overlays/effects)
  const allVideoTracks = tracks.filter((t) => t.type === 'video' && t.visible);
  // Reverse so the lowest track in the stack renders first, and upper tracks render over it
  const videoTracks = [...allVideoTracks].reverse();

  // Render each video track layer
  for (const track of videoTracks) {
    // Find active clip on this track at currentTime
    const activeClip = clips.find(
      (c) => c.trackId === track.id && currentTime >= c.startTime && currentTime < c.startTime + c.duration
    );

    if (!activeClip) continue;

    const media = mediaMap.get(activeClip.mediaId);
    const clipOffset = (currentTime - activeClip.startTime) * activeClip.speed;
    const clipDuration = activeClip.duration;
    const progressInClip = (currentTime - activeClip.startTime) / clipDuration;

    // Calculate transition alpha and wipe offsets
    let transitionAlpha = 1;
    let wipeProgress = 0; // 0 to 1

    // Transition In
    if (activeClip.transitionIn && activeClip.transitionIn.type !== 'none') {
      const transDur = activeClip.transitionIn.duration;
      const timeSinceStart = currentTime - activeClip.startTime;
      if (timeSinceStart < transDur) {
        const transProg = timeSinceStart / transDur;
        if (activeClip.transitionIn.type === 'cross-dissolve' || activeClip.transitionIn.type === 'fade') {
          transitionAlpha *= transProg;
        } else if (activeClip.transitionIn.type === 'wipe-left') {
          wipeProgress = transProg;
        } else if (activeClip.transitionIn.type === 'dip-to-black') {
          transitionAlpha *= Math.min(1, transProg * 1.5);
        }
      }
    }

    // Transition Out
    if (activeClip.transitionOut && activeClip.transitionOut.type !== 'none') {
      const transDur = activeClip.transitionOut.duration;
      const timeLeft = activeClip.startTime + clipDuration - currentTime;
      if (timeLeft < transDur) {
        const transProg = timeLeft / transDur;
        if (activeClip.transitionOut.type === 'cross-dissolve' || activeClip.transitionOut.type === 'fade') {
          transitionAlpha *= transProg;
        } else if (activeClip.transitionOut.type === 'dip-to-black') {
          transitionAlpha *= Math.min(1, transProg * 1.5);
        }
      }
    }

    const isAdjustmentLayer = activeClip.type === 'adjustment-layer' || track.layerType === 'adjustment';
    const isEffectsLayer = activeClip.type === 'effects-layer' || track.layerType === 'effects';

    const blendMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      screen: 'screen',
      multiply: 'multiply',
      overlay: 'overlay',
      lighten: 'lighten',
      darken: 'darken',
    };

    const lg = activeClip.colorGrading;
    const eff = activeClip.effects;

    const brightness = 1 + lg.exposure * 0.008;
    const contrast = 1 + lg.contrast * 0.008;
    const saturate = (lg.saturation / 100) * (eff.blackAndWhite ? 0 : 1);
    const hueRotate = lg.temperature * 0.25; // warm/cool shift
    const blur = eff.gaussianBlur > 0 ? `blur(${eff.gaussianBlur}px) ` : '';
    const invert = eff.invert ? 'invert(1) ' : '';
    const filterString = `${blur}${invert}brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`;

    // CASE 1: NON-DESTRUCTIVE ADJUSTMENT LAYER (Transforms & grades all layers underneath)
    if (isAdjustmentLayer) {
      const { canvas: offCanvas, ctx: offCtx } = getOffscreenCanvas(renderWidth, renderHeight);
      if (offCtx) {
        offCtx.clearRect(0, 0, renderWidth, renderHeight);
        offCtx.drawImage(canvas, 0, 0);

        ctx.clearRect(0, 0, renderWidth, renderHeight);
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, renderWidth, renderHeight);

        ctx.save();
        ctx.globalCompositeOperation = blendMap[activeClip.transform.blendMode] || 'source-over';
        ctx.globalAlpha = Math.max(0, Math.min(1, activeClip.transform.opacity * transitionAlpha));

        ctx.translate(renderWidth / 2 + activeClip.transform.positionX, renderHeight / 2 + activeClip.transform.positionY);
        ctx.rotate((activeClip.transform.rotation * Math.PI) / 180);
        ctx.scale(activeClip.transform.scale, activeClip.transform.scale);

        ctx.filter = filterString;
        ctx.drawImage(offCanvas, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);

        if (activeClip.plugins) {
          renderAEPlugins(ctx, activeClip.plugins, clipOffset, renderWidth, renderHeight);
        }

        ctx.restore();

        if (lg.vignette > 0 || lg.filmGrain > 0) {
          renderPostGradingOverlays(ctx, renderWidth, renderHeight, lg.vignette, lg.filmGrain);
        }
      }
      continue;
    }

    // CASE 2: DEDICATED EFFECTS & PROCEDURAL LAYER (Screen/Overlay blend over timeline)
    if (isEffectsLayer) {
      ctx.save();
      ctx.globalCompositeOperation = blendMap[activeClip.transform.blendMode] || 'screen';
      ctx.globalAlpha = Math.max(0, Math.min(1, activeClip.transform.opacity * transitionAlpha));

      ctx.translate(renderWidth / 2 + activeClip.transform.positionX, renderHeight / 2 + activeClip.transform.positionY);
      ctx.rotate((activeClip.transform.rotation * Math.PI) / 180);
      ctx.scale(activeClip.transform.scale, activeClip.transform.scale);

      ctx.filter = filterString;

      if (activeClip.plugins) {
        renderAEPlugins(ctx, activeClip.plugins, clipOffset, renderWidth, renderHeight);
      }

      ctx.restore();

      if (lg.vignette > 0 || lg.filmGrain > 0) {
        renderPostGradingOverlays(ctx, renderWidth, renderHeight, lg.vignette, lg.filmGrain);
      }
      continue;
    }

    // CASE 3: STANDARD VIDEO / MEDIA / TITLE / GENERATOR LAYER
    ctx.save();
    ctx.globalCompositeOperation = blendMap[activeClip.transform.blendMode] || 'source-over';
    ctx.globalAlpha = Math.max(0, Math.min(1, activeClip.transform.opacity * transitionAlpha));

    // Handle wipe transitions via clipping
    if (wipeProgress > 0 && activeClip.transitionIn.type === 'wipe-left') {
      ctx.beginPath();
      ctx.rect(0, 0, renderWidth * wipeProgress, renderHeight);
      ctx.clip();
    }

    // Transform setup (Center origin)
    ctx.translate(renderWidth / 2 + activeClip.transform.positionX, renderHeight / 2 + activeClip.transform.positionY);
    ctx.rotate((activeClip.transform.rotation * Math.PI) / 180);
    ctx.scale(activeClip.transform.scale, activeClip.transform.scale);

    ctx.filter = filterString;

    // Draw Content based on clip type
    if (activeClip.type === 'title' && activeClip.titleSettings) {
      renderTitleGraphic(ctx, activeClip.titleSettings, renderWidth, renderHeight, progressInClip);
    } else if (media && (media.type === 'video' || media.type === 'image' || media.type === 'generator')) {
      if (media.generatorType === 'smpte-bars') {
        renderSMPTEColorBars(ctx, renderWidth, renderHeight);
      } else if (media.generatorType === 'countdown') {
        renderCountdownLeader(ctx, renderWidth, renderHeight, clipOffset);
      } else if (media.url && imageCache.has(media.url)) {
        const img = imageCache.get(media.url)!;
        renderAnimatedCinematicShot(ctx, img, media.generatorType, clipOffset, renderWidth, renderHeight);
      } else if (media.url) {
        preloadImage(media.url);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
      }
    }

    // Render After Effects Plugins attached to this clip
    if (activeClip.plugins) {
      renderAEPlugins(ctx, activeClip.plugins, clipOffset, renderWidth, renderHeight);
    }

    ctx.restore();

    // Post-grading effects (Vignette & Film Grain)
    if (lg.vignette > 0 || lg.filmGrain > 0) {
      renderPostGradingOverlays(ctx, renderWidth, renderHeight, lg.vignette, lg.filmGrain);
    }
  }

  // Draw Safe Margins if enabled (Broadcast Action Safe 90% and Title Safe 80%)
  if (showSafeMargins) {
    drawSafeMargins(ctx, renderWidth, renderHeight);
  }

  ctx.restore();
}

/**
 * Animated camera movement for cinematic stills (Parallax / Pan / Subtle Zoom)
 */
function renderAnimatedCinematicShot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  generatorType: string | undefined,
  clipOffset: number,
  renderWidth: number,
  renderHeight: number
) {
  const w = renderWidth;
  const h = renderHeight;

  let zoom = 1.0;
  let panX = 0;
  let panY = 0;

  if (generatorType === 'nature-drone') {
    // Smooth cinematic forward drift & slow tilt
    zoom = 1.0 + clipOffset * 0.018;
    panY = -clipOffset * 4;
  } else if (generatorType === 'neon-city') {
    // Cinematic night dolly in
    zoom = 1.05 + clipOffset * 0.022;
    panX = Math.sin(clipOffset * 0.5) * 6;
  } else if (generatorType === 'studio-interview') {
    // Subtle handheld breathing camera
    zoom = 1.02 + Math.sin(clipOffset * 0.8) * 0.005;
    panX = Math.sin(clipOffset * 0.6) * 4;
    panY = Math.cos(clipOffset * 0.5) * 3;
  } else if (generatorType === 'abstract-motion') {
    // Dynamic floating scale
    zoom = 1.0 + Math.sin(clipOffset * 1.2) * 0.03;
  } else if (generatorType === 'ai-video') {
    // Dynamic cinematic AI video camera drift & subtle dolly zoom
    zoom = 1.0 + clipOffset * 0.022;
    panX = Math.sin(clipOffset * 0.45) * 8;
    panY = -clipOffset * 3;
  }

  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(panX, panY);

  // Draw image centered
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  // Subtle anamorphic streak light for neon city
  if (generatorType === 'neon-city') {
    const streakGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    streakGrad.addColorStop(0, 'rgba(14, 165, 233, 0)');
    streakGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
    streakGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(-w / 2, -40, w, 80);
  }

  ctx.restore();
}

/**
 * Standard SMPTE Color Bars Generator
 */
function renderSMPTEColorBars(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const w = width;
  const h = height;
  const x = -w / 2;
  const y = -h / 2;

  // Top 67% 7 color bars: White, Yellow, Cyan, Green, Magenta, Red, Blue
  const topColors = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'];
  const barWidth = w / 7;
  const topH = h * 0.67;

  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = topColors[i];
    ctx.fillRect(x + i * barWidth, y, barWidth, topH);
  }

  // Middle 8% reverse bars
  const midColors = ['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'];
  const midH = h * 0.08;
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = midColors[i];
    ctx.fillRect(x + i * barWidth, y + topH, barWidth, midH);
  }

  // Bottom 25% PLUGE and color blocks
  const botY = y + topH + midH;
  const botH = h - (topH + midH);
  const botBarW = w / 6;

  ctx.fillStyle = '#00214c'; // I signal
  ctx.fillRect(x, botY, botBarW, botH);

  ctx.fillStyle = '#ffffff'; // White 100%
  ctx.fillRect(x + botBarW, botY, botBarW, botH);

  ctx.fillStyle = '#32006a'; // Q signal
  ctx.fillRect(x + botBarW * 2, botY, botBarW, botH);

  // Black level PLUGE pulses (-2%, 0%, +2%)
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + botBarW * 3, botY, botBarW * 3, botH);

  ctx.fillStyle = '#141414';
  ctx.fillRect(x + botBarW * 3 + botBarW * 0.8, botY, botBarW * 0.4, botH);
}

/**
 * Universal Countdown Film Leader (5-4-3-2-1)
 */
function renderCountdownLeader(ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) {
  const num = Math.max(1, 5 - Math.floor(offset));
  const frac = offset % 1;
  const r = Math.min(width, height) * 0.32;

  ctx.fillStyle = '#333333';
  ctx.fillRect(-width / 2, -height / 2, width, height);

  // Concentric rings
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(-width / 2, 0);
  ctx.lineTo(width / 2, 0);
  ctx.moveTo(0, -height / 2);
  ctx.lineTo(0, height / 2);
  ctx.stroke();

  // Rotating radar arm
  const angle = frac * Math.PI * 2 - Math.PI / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -Math.PI / 2, angle);
  ctx.closePath();
  ctx.fill();

  // Countdown Number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 180px "JetBrains Mono", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num.toString(), 0, 10);
}

/**
 * Render Titles and Lower Thirds Graphic Overlays
 */
function renderTitleGraphic(
  ctx: CanvasRenderingContext2D,
  title: import('../types/editor').TitleSettings,
  width: number,
  height: number,
  _progress: number
) {
  const x = 0;
  const y = 0;

  if (title.presetStyle === 'lower-third') {
    // Professional lower-third banner card
    const bannerW = width * 0.58;
    const bannerH = 100;
    const startX = -width / 2 + 100;
    const startY = -bannerH / 2;

    // Background slab
    ctx.fillStyle = title.backgroundColor || 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(startX, startY, bannerW, bannerH);

    // Left accent bar
    ctx.fillStyle = '#38bdf8'; // Cyan accent
    ctx.fillRect(startX, startY, 6, bannerH);

    // Text content
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = title.color || '#ffffff';
    ctx.font = `700 ${title.fontSize || 24}px "${title.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
    ctx.fillText(title.text, startX + 28, startY + 18);

    if (title.subtext) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 15px "${title.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
      ctx.fillText(title.subtext, startX + 28, startY + 54);
    }
  } else if (title.presetStyle === 'cinematic-title') {
    // Large cinematic display title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = title.color || '#ffffff';
    ctx.font = `800 ${title.fontSize || 42}px "${title.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
    ctx.fillText(title.text, x, y - 18);

    if (title.subtext) {
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `600 16px "${title.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
      ctx.letterSpacing = '4px';
      ctx.fillText(title.subtext, x, y + 36);
    }
  } else {
    // Standard subtitle / text overlay
    ctx.textAlign = title.alignment || 'center';
    ctx.textBaseline = 'middle';

    if (title.hasBackground) {
      ctx.fillStyle = title.backgroundColor || 'rgba(0,0,0,0.6)';
      ctx.fillRect(-width * 0.35, -36, width * 0.7, 72);
    }

    if (title.strokeWidth > 0) {
      ctx.strokeStyle = title.strokeColor || '#000000';
      ctx.lineWidth = title.strokeWidth * 2;
      ctx.font = `700 ${title.fontSize || 32}px "${title.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
      ctx.strokeText(title.text, x, y);
    }

    ctx.fillStyle = title.color || '#ffffff';
    ctx.font = `700 ${title.fontSize || 32}px "${title.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
    ctx.fillText(title.text, x, y);
  }
}

/**
 * Vignette gradient and simulated 35mm film grain
 */
function renderPostGradingOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vignette: number,
  filmGrain: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Vignette
  if (vignette > 0) {
    const radius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
    const grad = ctx.createRadialGradient(width / 2, height / 2, radius * 0.4, width / 2, height / 2, radius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${(vignette / 100) * 0.85})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Film grain (procedural subtle noise)
  if (filmGrain > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    const grainDensity = Math.floor(filmGrain * 1.5);
    for (let i = 0; i < grainDensity * 40; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillRect(rx, ry, 2, 2);
    }
  }

  ctx.restore();
}

/**
 * Broadcast Safe Margins (Action Safe 90%, Title Safe 80%)
 */
function drawSafeMargins(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.6)'; // Blue outline
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Action Safe (90%)
  const asW = width * 0.9;
  const asH = height * 0.9;
  ctx.strokeRect((width - asW) / 2, (height - asH) / 2, asW, asH);

  // Title Safe (80%)
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)'; // Yellow outline
  const tsW = width * 0.8;
  const tsH = height * 0.8;
  ctx.strokeRect((width - tsW) / 2, (height - tsH) / 2, tsW, tsH);

  ctx.restore();
}

/**
 * After Effects Plugin Procedural Render Suite
 */
export function renderAEPlugins(
  ctx: CanvasRenderingContext2D,
  plugins: AEPlugins,
  time: number,
  width: number,
  height: number
) {
  const w = width;
  const h = height;

  // 1. Wave Displacement / Heat Shimmer
  if (plugins.waveDisplacement && plugins.waveDisplacement.enabled) {
    renderWaveDisplacement(ctx, plugins.waveDisplacement, time, w, h);
  }

  // 2. Chromatic Aberration / RGB Split
  if (plugins.chromaticAberration && plugins.chromaticAberration.enabled) {
    renderChromaticAberration(ctx, plugins.chromaticAberration, w, h);
  }

  // 3. Halftone & Pixelator
  if (plugins.halftone && plugins.halftone.enabled) {
    renderHalftone(ctx, plugins.halftone, w, h);
  }

  // 4. Deep Glow (Anamorphic Radiance)
  if (plugins.deepGlow && plugins.deepGlow.enabled) {
    renderDeepGlow(ctx, plugins.deepGlow, w, h);
  }

  // 5. CC Light Rays (Volumetric God Rays)
  if (plugins.lightRays && plugins.lightRays.enabled) {
    renderLightRays(ctx, plugins.lightRays, time, w, h);
  }

  // 6. Trapcode Particular (Particle Simulation Engine)
  if (plugins.trapcodeParticles && plugins.trapcodeParticles.enabled) {
    renderTrapcodeParticles(ctx, plugins.trapcodeParticles, time, w, h);
  }

  // 7. Optical Flares (Knoll Light Factory style)
  if (plugins.opticalFlares && plugins.opticalFlares.enabled) {
    renderOpticalFlares(ctx, plugins.opticalFlares, time, w, h);
  }

  // 8. VHS Glitch & Retro CRT
  if (plugins.vhsGlitch && plugins.vhsGlitch.enabled) {
    renderVhsGlitch(ctx, plugins.vhsGlitch, time, w, h);
  }
}

/**
 * Optical Flares Anamorphic Lens Flare Generator
 */
function renderOpticalFlares(
  ctx: CanvasRenderingContext2D,
  flare: import('../types/editor').OpticalFlaresPlugin,
  time: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const cx = -width / 2 + flare.posX * width;
  const cy = -height / 2 + flare.posY * height;
  const scale = flare.scale || 1.0;
  const intensity = flare.intensity || 1.0;
  const shimmerFactor = flare.shimmer ? 1 + Math.sin(time * 8) * 0.08 : 1;
  const effIntensity = intensity * shimmerFactor;

  // Preset Color Palettes
  let primaryColor = flare.color || '#00d2ff';
  let secondaryColor = '#ffffff';

  if (flare.preset === 'warm-solar') {
    primaryColor = '#ff9e00';
    secondaryColor = '#ffea00';
  } else if (flare.preset === 'scifi-violet') {
    primaryColor = '#c084fc';
    secondaryColor = '#f472b6';
  } else if (flare.preset === 'emerald-star') {
    primaryColor = '#34d399';
    secondaryColor = '#a7f3d0';
  } else if (flare.preset === 'golden-flare') {
    primaryColor = '#f59e0b';
    secondaryColor = '#fde68a';
  }

  // 1. Main Core Glow
  const coreRad = 120 * scale;
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRad);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, ' + Math.min(1, 0.95 * effIntensity) + ')');
  coreGrad.addColorStop(0.25, primaryColor + Math.round(Math.min(255, 220 * effIntensity)).toString(16).padStart(2, '0'));
  coreGrad.addColorStop(0.6, primaryColor + '44');
  coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRad, 0, Math.PI * 2);
  ctx.fill();

  // 2. Anamorphic Horizontal Streak (JJ Abrams style glare)
  if (flare.streakLength > 0) {
    const streakW = width * 1.2 * (flare.streakLength || 1.5) * scale;
    const streakH = 8 * scale;
    const streakGrad = ctx.createLinearGradient(cx - streakW / 2, cy, cx + streakW / 2, cy);
    streakGrad.addColorStop(0, 'rgba(0,0,0,0)');
    streakGrad.addColorStop(0.35, primaryColor + '66');
    streakGrad.addColorStop(0.5, '#ffffff');
    streakGrad.addColorStop(0.65, primaryColor + '66');
    streakGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = streakGrad;
    ctx.fillRect(cx - streakW / 2, cy - streakH / 2, streakW, streakH);

    // Thinner central laser streak
    ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.min(1, 0.8 * effIntensity) + ')';
    ctx.fillRect(cx - streakW * 0.4, cy - 1, streakW * 0.8, 2);
  }

  // 3. Multi-Element Aperture Ghosts & Rings
  const oppX = -cx * 0.6;
  const oppY = -cy * 0.6;

  // Aperture Ring
  const ringRad = 90 * scale;
  ctx.strokeStyle = primaryColor + '55';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(oppX, oppY, ringRad, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary Chromatic Orb
  const orbRad = 45 * scale;
  const orbGrad = ctx.createRadialGradient(oppX * 0.5, oppY * 0.5, 0, oppX * 0.5, oppY * 0.5, orbRad);
  orbGrad.addColorStop(0, secondaryColor + '66');
  orbGrad.addColorStop(0.8, primaryColor + '33');
  orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(oppX * 0.5, oppY * 0.5, orbRad, 0, Math.PI * 2);
  ctx.fill();

  // Starburst Cross Spikes
  ctx.strokeStyle = primaryColor + '88';
  ctx.lineWidth = 1.5;
  const spikeLen = 80 * scale;
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(angle) * spikeLen, cy - Math.sin(angle) * spikeLen);
    ctx.lineTo(cx + Math.cos(angle) * spikeLen, cy + Math.sin(angle) * spikeLen);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Trapcode Particular Particle Simulator
 */
function renderTrapcodeParticles(
  ctx: CanvasRenderingContext2D,
  part: import('../types/editor').TrapcodeParticlesPlugin,
  time: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const count = Math.min(250, part.count || 80);
  const baseColor = part.color || '#fbbf24';
  const speed = part.speed || 1.0;
  const baseSize = part.size || 6;
  const type = part.type || 'golden-stardust';

  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random seed per particle index
    const seed = i * 137.508;
    const initX = ((Math.sin(seed) * 10000) % 1) * width;
    const initY = ((Math.cos(seed) * 10000) % 1) * height;
    const pSpeed = (0.5 + ((seed % 100) / 100) * 1.5) * speed;
    const pSize = (0.4 + ((seed % 50) / 50) * 1.2) * baseSize;

    let posX = 0;
    let posY = 0;
    let alpha = 0.5 + Math.sin(time * 2 + seed) * 0.4;

    if (part.direction === 'up' || type === 'floating-embers') {
      // Floating upwards like camp embers
      posX = (initX + Math.sin(time * 1.5 + seed) * 40) % width - width / 2;
      posY = (height - ((initY + time * 60 * pSpeed) % height)) - height / 2;
    } else if (part.direction === 'down' || type === 'cosmic-snow' || type === 'matrix-rain') {
      // Falling down
      posX = (initX + Math.cos(time * 1.2 + seed) * 30) % width - width / 2;
      posY = ((initY + time * 70 * pSpeed) % height) - height / 2;
    } else if (part.direction === 'swirl') {
      // Swirling vortex
      const radius = (initX % (width * 0.45)) + Math.sin(time + seed) * 20;
      const angle = time * pSpeed * 0.8 + seed;
      posX = Math.cos(angle) * radius;
      posY = Math.sin(angle) * radius * 0.6;
    } else {
      // Floating / Drifting Brownian motion
      posX = (initX + Math.sin(time * pSpeed * 0.5 + seed) * 80) % width - width / 2;
      posY = (initY + Math.cos(time * pSpeed * 0.4 + seed) * 80) % height - height / 2;
    }

    if (type === 'bokeh-orbs') {
      // Soft blurred circle with halo
      const grad = ctx.createRadialGradient(posX, posY, 0, posX, posY, pSize * 4);
      grad.addColorStop(0, baseColor);
      grad.addColorStop(0.5, baseColor + '44');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(posX, posY, pSize * 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'cyber-sparks') {
      // Spark line with directional streak
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = Math.max(1, pSize * 0.6);
      ctx.beginPath();
      ctx.moveTo(posX, posY);
      ctx.lineTo(posX + Math.sin(seed) * 12 * pSpeed, posY - 10 * pSpeed);
      ctx.stroke();
    } else {
      // Glowing particle dot with core
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha)})`;
      ctx.beginPath();
      ctx.arc(posX, posY, Math.max(1, pSize * 0.5), 0, Math.PI * 2);
      ctx.fill();

      // Outer glow
      const grad = ctx.createRadialGradient(posX, posY, 0, posX, posY, pSize * 2.5);
      grad.addColorStop(0, baseColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(posX, posY, pSize * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Deep Glow Anamorphic Radiance Plugin
 */
function renderDeepGlow(
  ctx: CanvasRenderingContext2D,
  glow: import('../types/editor').DeepGlowPlugin,
  width: number,
  height: number
) {
  ctx.save();
  const blendOp: GlobalCompositeOperation = glow.blendMode === 'lighter' ? 'lighter' : glow.blendMode === 'overlay' ? 'overlay' : 'screen';
  ctx.globalCompositeOperation = blendOp;

  const intensity = glow.intensity || 1.4;
  const radius = glow.radius || 35;
  const color = glow.color || '#38bdf8';

  // Multi-tier bloom simulation
  const tiers = [
    { r: radius * 0.5, a: 0.18 * intensity },
    { r: radius * 1.2, a: 0.12 * intensity },
    { r: radius * 2.5, a: 0.06 * intensity },
  ];

  tiers.forEach((tier) => {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(width, height) * 0.6);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, color + Math.round(Math.min(255, tier.a * 255)).toString(16).padStart(2, '0'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-width / 2, -height / 2, width, height);
  });

  ctx.restore();
}

/**
 * Chromatic Aberration & RGB Channel Split
 */
function renderChromaticAberration(
  ctx: CanvasRenderingContext2D,
  chroma: import('../types/editor').ChromaticAberrationPlugin,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighten';

  const offset = chroma.offset || 10;
  const angle = ((chroma.angle || 45) * Math.PI) / 180;
  const dx = Math.cos(angle) * offset;
  const dy = Math.sin(angle) * offset;

  // Red channel displacement
  ctx.fillStyle = 'rgba(255, 0, 80, 0.12)';
  ctx.fillRect(-width / 2 + dx, -height / 2 + dy, width, height);

  // Cyan channel displacement opposite
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fillRect(-width / 2 - dx, -height / 2 - dy, width, height);

  ctx.restore();
}

/**
 * Volumetric Light Rays (God Rays)
 */
function renderLightRays(
  ctx: CanvasRenderingContext2D,
  rays: import('../types/editor').LightRaysPlugin,
  time: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const ox = -width / 2 + (rays.originX || 0.5) * width;
  const oy = -height / 2 + (rays.originY || 0.2) * height;
  const length = (rays.rayLength || 0.7) * Math.max(width, height);
  const intensity = rays.intensity || 1.2;
  const color = rays.color || '#ffffff';

  const rayCount = 24;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + Math.sin(time * 0.5 + i) * 0.05;
    const rayWidth = (0.04 + Math.sin(time * 2 + i * 2) * 0.02) * Math.PI;

    const grad = ctx.createRadialGradient(ox, oy, 10, ox, oy, length);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, color + Math.round(Math.min(255, 80 * intensity)).toString(16).padStart(2, '0'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, length, angle - rayWidth, angle + rayWidth);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * VHS Glitch & Retro CRT Scanlines
 */
function renderVhsGlitch(
  ctx: CanvasRenderingContext2D,
  vhs: import('../types/editor').VhsGlitchPlugin,
  time: number,
  width: number,
  height: number
) {
  ctx.save();

  // 1. CRT Interlaced Scanlines
  if (vhs.scanlines) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    const density = Math.max(2, vhs.scanlineDensity || 4);
    for (let y = -height / 2; y < height / 2; y += density) {
      ctx.fillRect(-width / 2, y, width, 1);
    }
  }

  // 2. Horizontal Tracking Sync Jitter
  if (vhs.trackingJitter > 0) {
    const jitterH = 20;
    const jitterY = -height / 2 + ((time * 120) % height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(-width / 2, jitterY, width, jitterH);
  }

  // 3. Analog Tape Noise
  if (vhs.tapeNoise > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    const noiseDots = (vhs.tapeNoise / 100) * 80;
    for (let i = 0; i < noiseDots; i++) {
      const rx = -width / 2 + Math.random() * width;
      const ry = -height / 2 + Math.random() * height;
      ctx.fillRect(rx, ry, Math.random() * 4 + 1, 1);
    }
  }

  // 4. Retro VCR On-Screen Display (OSD) Timestamp
  if (vhs.vcrTimestamp) {
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00ff66';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'left';
    ctx.fillText('PLAY ▶', -width / 2 + 30, -height / 2 + 40);
    ctx.fillText('SP 00:04:12', -width / 2 + 30, -height / 2 + 65);
    ctx.fillText('NTSC CH-03', width / 2 - 140, -height / 2 + 40);
  }

  ctx.restore();
}

/**
 * Turbulent Wave Warp / Heat Distortion
 */
function renderWaveDisplacement(
  ctx: CanvasRenderingContext2D,
  wave: import('../types/editor').WaveDisplacementPlugin,
  time: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';

  const amp = wave.amplitude || 12;
  const freq = wave.frequency || 6;
  const speed = wave.speed || 1.2;

  // Liquid heat shimmer lines
  const grad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let y = -height / 2; y < height / 2; y += 15) {
    const shift = Math.sin((y / height) * freq * Math.PI + time * speed * 3) * amp;
    ctx.rect(-width / 2 + shift, y, width, 6);
  }
  ctx.fill();

  ctx.restore();
}

/**
 * Halftone Dots & Retro Pixelator
 */
function renderHalftone(
  ctx: CanvasRenderingContext2D,
  half: import('../types/editor').HalftonePlugin,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  const size = Math.max(4, half.cellSize || 10);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

  for (let x = -width / 2; x < width / 2; x += size) {
    for (let y = -height / 2; y < height / 2; y += size) {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
