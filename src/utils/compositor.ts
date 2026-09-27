import { Clip, MediaItem, Track } from '../types/editor';

// Image cache for instantaneous canvas rendering
const imageCache: Map<string, HTMLImageElement> = new Map();

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

  // Group video tracks from bottom (V1) to top (V3, V4...)
  const videoTracks = tracks
    .filter((t) => t.type === 'video' && t.visible && !t.muted)
    .sort((a, b) => {
      // Track order: V1 at bottom, V2 above V1, V3 above V2
      const orderA = parseInt(a.name.replace(/\D/g, '') || '0', 10);
      const orderB = parseInt(b.name.replace(/\D/g, '') || '0', 10);
      return orderA - orderB;
    });

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

    ctx.save();

    // Set blend mode & overall opacity
    const blendMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      screen: 'screen',
      multiply: 'multiply',
      overlay: 'overlay',
      lighten: 'lighten',
      darken: 'darken',
    };
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

    // Apply Lumetri CSS filter string
    const lg = activeClip.colorGrading;
    const eff = activeClip.effects;

    const brightness = 1 + lg.exposure * 0.008;
    const contrast = 1 + lg.contrast * 0.008;
    const saturate = (lg.saturation / 100) * (eff.blackAndWhite ? 0 : 1);
    const hueRotate = lg.temperature * 0.25; // warm/cool shift
    const blur = eff.gaussianBlur > 0 ? `blur(${eff.gaussianBlur}px) ` : '';
    const invert = eff.invert ? 'invert(1) ' : '';

    ctx.filter = `${blur}${invert}brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`;

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
        // Subtle cinematic camera pan/zoom motion based on clipOffset
        renderAnimatedCinematicShot(ctx, img, media.generatorType, clipOffset, renderWidth, renderHeight);
      } else if (media.url) {
        preloadImage(media.url);
        // Fallback backdrop while loading
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
      }
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

  // Center crosshair
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.setLineDash([]);
  const cx = width / 2;
  const cy = height / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy);
  ctx.lineTo(cx + 15, cy);
  ctx.moveTo(cx, cy - 15);
  ctx.lineTo(cx, cy + 15);
  ctx.stroke();

  ctx.restore();
}
