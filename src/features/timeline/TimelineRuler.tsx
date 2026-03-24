import { useRef, useEffect, useCallback, type RefObject } from 'react';
import { RULER_HEIGHT } from '../../constants';
import { formatTimeShort, formatTimePrecise } from '../../utils/format-time';

interface TimelineRulerProps {
  pixelsPerSecond: number;
  totalWidth: number;
  currentTime: number;
  onScrub: (time: number) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function TimelineRuler({
  pixelsPerSecond,
  totalWidth,
  currentTime,
  onScrub,
  scrollContainerRef,
}: TimelineRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = totalWidth;
    const height = RULER_HEIGHT;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    let majorInterval: number;
    if (pixelsPerSecond >= 1500) majorInterval = 0.1;
    else if (pixelsPerSecond >= 800) majorInterval = 0.2;
    else if (pixelsPerSecond >= 400) majorInterval = 0.5;
    else if (pixelsPerSecond >= 200) majorInterval = 1;
    else if (pixelsPerSecond >= 80) majorInterval = 5;
    else if (pixelsPerSecond >= 30) majorInterval = 10;
    else if (pixelsPerSecond >= 10) majorInterval = 30;
    else majorInterval = 60;

    const minorInterval = majorInterval / 5;
    const totalSeconds = width / pixelsPerSecond;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let t = 0; t <= totalSeconds; t += minorInterval) {
      const x = Math.round(t * pixelsPerSecond) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, height - 6);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';

    for (let t = 0; t <= totalSeconds; t += majorInterval) {
      const x = Math.round(t * pixelsPerSecond) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, height - 14);
      ctx.lineTo(x, height);
      ctx.stroke();

      const label = majorInterval < 1 ? formatTimePrecise(t) : formatTimeShort(t);
      ctx.fillText(label, x, height - 16);
    }

    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();
  }, [pixelsPerSecond, totalWidth]);

  useEffect(() => {
    draw();
  }, [draw]);

  const clientXToTime = useCallback(
    (clientX: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const x = clientX - rect.left;
      return Math.max(0, x / pixelsPerSecond);
    },
    [pixelsPerSecond],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      onScrub(clientXToTime(e.clientX));
      isDragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clientXToTime, onScrub],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      onScrub(clientXToTime(e.clientX));

      const container = scrollContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const edgeZone = 40;
      if (e.clientX > rect.right - edgeZone) {
        container.scrollLeft += 8;
      } else if (e.clientX < rect.left + edgeZone) {
        container.scrollLeft -= 8;
      }
    },
    [clientXToTime, onScrub, scrollContainerRef],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="relative" style={{ width: totalWidth, height: RULER_HEIGHT }}>
      <canvas
        ref={canvasRef}
        className="block cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      {/* Playhead marker on ruler */}
      <div
        className="absolute top-0 w-0.5 bg-red-500 pointer-events-none"
        style={{
          left: currentTime * pixelsPerSecond,
          height: RULER_HEIGHT,
        }}
      />
    </div>
  );
}
