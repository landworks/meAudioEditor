import { useRef, useEffect, useCallback } from 'react';
import { WAVEFORM_PEAKS_PER_SECOND } from '../../constants';
import type { AudioClip, AudioSource } from '../../types';

const MAX_CANVAS_PX = 16384;
const DETAIL_THRESHOLD = 200;

interface WaveformCanvasProps {
  clip: AudioClip;
  source: AudioSource;
  pixelsPerSecond: number;
  height: number;
  color: string;
  isSelected: boolean;
}

export function WaveformCanvas({ clip, source, pixelsPerSecond, height, color, isSelected }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const fullCssWidth = clip.duration * pixelsPerSecond;

    // When the full clip would exceed the canvas pixel cap, only render
    // the visible portion plus a one-viewport buffer on each side.
    let viewStart = 0;
    let viewEnd = fullCssWidth;
    const needsViewport = fullCssWidth * dpr > MAX_CANVAS_PX;

    if (needsViewport) {
      const scrollParent = wrapper.closest('[data-scroll-container]') as HTMLElement | null;
      if (scrollParent) {
        const wrapperRect = wrapper.getBoundingClientRect();
        const containerRect = scrollParent.getBoundingClientRect();
        const viewportW = scrollParent.clientWidth;

        const visStart = Math.max(0, containerRect.left - wrapperRect.left);
        const visEnd = Math.min(fullCssWidth, containerRect.right - wrapperRect.left);

        const buffer = viewportW;
        viewStart = Math.max(0, visStart - buffer);
        viewEnd = Math.min(fullCssWidth, visEnd + buffer);
      }
    }

    const regionWidth = Math.max(1, viewEnd - viewStart);
    const physicalWidth = Math.min(Math.ceil(regionWidth * dpr), MAX_CANVAS_PX);
    const physicalHeight = Math.ceil(height * dpr);

    canvas.width = physicalWidth;
    canvas.height = physicalHeight;
    canvas.style.width = `${regionWidth}px`;
    canvas.style.height = `${height}px`;

    if (needsViewport) {
      canvas.style.position = 'absolute';
      canvas.style.left = `${viewStart}px`;
      canvas.style.top = '0';
    } else {
      canvas.style.position = '';
      canvas.style.left = '';
      canvas.style.top = '';
    }

    // Transform so we draw in clip-local CSS coordinates.
    // The offset shifts so that clip x=viewStart maps to physical x=0.
    const scaleX = physicalWidth / regionWidth;
    const scaleY = physicalHeight / height;
    ctx.setTransform(scaleX, 0, 0, scaleY, -viewStart * scaleX, 0);

    ctx.clearRect(viewStart, 0, regionWidth, height);

    // Background
    ctx.fillStyle = isSelected ? `${color}22` : `${color}11`;
    ctx.fillRect(viewStart, 0, regionWidth, height);

    const centerY = height / 2;
    const amp = (height / 2) * 0.85;
    const drawStart = Math.floor(Math.max(0, viewStart));
    const drawEnd = Math.ceil(Math.min(fullCssWidth, viewEnd));

    if (pixelsPerSecond >= DETAIL_THRESHOLD && source.buffer) {
      drawDetailWaveform(ctx, source, clip, pixelsPerSecond, drawStart, drawEnd, centerY, amp, color, isSelected);
    } else {
      drawBarWaveform(ctx, source, clip, pixelsPerSecond, drawStart, drawEnd, regionWidth, physicalWidth, centerY, amp, color, isSelected);
    }

    // Fade overlay triangles (clip-local coords; canvas clips automatically)
    if (clip.fadeIn.duration > 0) {
      const fadeW = clip.fadeIn.duration * pixelsPerSecond;
      ctx.fillStyle = 'rgba(255, 200, 0, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(fadeW, 0);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    }

    if (clip.fadeOut.duration > 0) {
      const fadeW = clip.fadeOut.duration * pixelsPerSecond;
      ctx.fillStyle = 'rgba(255, 200, 0, 0.35)';
      ctx.beginPath();
      ctx.moveTo(fullCssWidth, 0);
      ctx.lineTo(fullCssWidth - fadeW, 0);
      ctx.lineTo(fullCssWidth, height);
      ctx.closePath();
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = isSelected ? color : `${color}66`;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(0, 0, fullCssWidth, height);
  }, [clip, source, pixelsPerSecond, height, color, isSelected]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Re-render on scroll when in viewport-aware mode
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const fullCssWidth = clip.duration * pixelsPerSecond;
    if (fullCssWidth * dpr <= MAX_CANVAS_PX) return;

    const scrollParent = wrapper.closest('[data-scroll-container]') as HTMLElement | null;
    if (!scrollParent) return;

    const handleScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(draw);
    };

    scrollParent.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollParent.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [clip.duration, pixelsPerSecond, draw]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

/**
 * High-zoom mode: reads actual samples from the AudioBuffer and draws the
 * waveform as a filled polygon showing the true audio shape (min/max envelope).
 */
function drawDetailWaveform(
  ctx: CanvasRenderingContext2D,
  source: AudioSource,
  clip: AudioClip,
  pixelsPerSecond: number,
  drawStart: number,
  drawEnd: number,
  centerY: number,
  amp: number,
  color: string,
  isSelected: boolean,
) {
  const buf = source.buffer;
  const sr = buf.sampleRate;
  const numCh = buf.numberOfChannels;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buf.getChannelData(ch));

  const cols = drawEnd - drawStart;
  if (cols <= 0) return;

  const topEnv = new Float32Array(cols);
  const botEnv = new Float32Array(cols);

  for (let i = 0; i < cols; i++) {
    const x = drawStart + i;
    const t0 = clip.trimStart + x / pixelsPerSecond;
    const t1 = clip.trimStart + (x + 1) / pixelsPerSecond;
    const s0 = Math.max(0, Math.floor(t0 * sr));
    const s1 = Math.min(buf.length, Math.ceil(t1 * sr));

    let hi = -2, lo = 2;
    for (let s = s0; s < s1; s++) {
      let v = 0;
      for (let ch = 0; ch < numCh; ch++) v += channels[ch][s];
      v /= numCh;
      if (v > hi) hi = v;
      if (v < lo) lo = v;
    }
    if (hi < lo) { hi = 0; lo = 0; }

    const clipTime = x / pixelsPerSecond;
    let gain = clip.volume;
    if (clip.fadeIn.duration > 0 && clipTime < clip.fadeIn.duration) {
      gain *= clipTime / clip.fadeIn.duration;
    }
    const timeFromEnd = clip.duration - clipTime;
    if (clip.fadeOut.duration > 0 && timeFromEnd < clip.fadeOut.duration) {
      gain *= timeFromEnd / clip.fadeOut.duration;
    }

    topEnv[i] = centerY - hi * amp * gain;
    botEnv[i] = centerY - lo * amp * gain;
  }

  // Filled waveform polygon: forward pass (top), backward pass (bottom)
  ctx.fillStyle = isSelected ? color : `${color}cc`;
  ctx.beginPath();
  ctx.moveTo(drawStart, topEnv[0]);
  for (let i = 1; i < cols; i++) {
    ctx.lineTo(drawStart + i, topEnv[i]);
  }
  for (let i = cols - 1; i >= 0; i--) {
    ctx.lineTo(drawStart + i, botEnv[i]);
  }
  ctx.closePath();
  ctx.fill();

  // Zero-crossing center line
  ctx.strokeStyle = `${color}40`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(drawStart, centerY);
  ctx.lineTo(drawEnd, centerY);
  ctx.stroke();
}

/**
 * Normal zoom mode: draws rectangular bars from pre-computed peak data.
 */
function drawBarWaveform(
  ctx: CanvasRenderingContext2D,
  source: AudioSource,
  clip: AudioClip,
  pixelsPerSecond: number,
  drawStart: number,
  drawEnd: number,
  regionWidth: number,
  physicalWidth: number,
  centerY: number,
  amp: number,
  color: string,
  isSelected: boolean,
) {
  const { peaks } = source;
  const fullCssWidth = clip.duration * pixelsPerSecond;
  const peaksOffset = Math.floor(clip.trimStart * WAVEFORM_PEAKS_PER_SECOND);
  const peaksCount = Math.floor(clip.duration * WAVEFORM_PEAKS_PER_SECOND);
  const samplesPerPixel = peaksCount / fullCssWidth;

  ctx.fillStyle = isSelected ? color : `${color}cc`;

  const step = Math.max(1, regionWidth / physicalWidth);

  for (let x = drawStart; x < drawEnd; x += step) {
    const peakStart = peaksOffset + Math.floor(x * samplesPerPixel);
    const peakEnd = peaksOffset + Math.floor((x + step) * samplesPerPixel);

    let max = 0;
    for (let p = peakStart; p < peakEnd && p < peaks.length; p++) {
      if (peaks[p] > max) max = peaks[p];
    }

    const clipTimeAtX = x / pixelsPerSecond;
    let gain = clip.volume;

    if (clip.fadeIn.duration > 0 && clipTimeAtX < clip.fadeIn.duration) {
      gain *= clipTimeAtX / clip.fadeIn.duration;
    }

    const timeFromEnd = clip.duration - clipTimeAtX;
    if (clip.fadeOut.duration > 0 && timeFromEnd < clip.fadeOut.duration) {
      gain *= timeFromEnd / clip.fadeOut.duration;
    }

    const barHeight = Math.min(centerY, Math.max(1, max * amp * gain));
    ctx.fillRect(x, centerY - barHeight, Math.ceil(step), barHeight * 2);
  }
}
