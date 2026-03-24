import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Scissors, AudioLines } from 'lucide-react';
import { WaveformCanvas } from '../waveform/WaveformCanvas';
import { useProjectStore } from '../../state/project-store';
import { usePlaybackStore } from '../../state/playback-store';
import { useTimelineStore } from '../../state/timeline-store';
import { TRACK_HEIGHT } from '../../constants';
import type { AudioClip, AudioSource, Track } from '../../types';

interface ClipViewProps {
  clip: AudioClip;
  source: AudioSource;
  track: Track;
  pixelsPerSecond: number;
  /** Given a clientY, returns the track id at that position (or null) */
  resolveTrackAtY: (clientY: number) => string | null;
}

type DragMode = 'move' | 'trim-left' | 'trim-right' | null;

const HANDLE_WIDTH = 8;
const VERTICAL_DRAG_THRESHOLD = 8;
const SNAP_THRESHOLD_PX = 10;

export function ClipView({ clip, source, track, pixelsPerSecond, resolveTrackAtY }: ClipViewProps) {
  const updateClip = useProjectStore((s) => s.updateClip);
  const selectClip = useProjectStore((s) => s.selectClip);
  const removeClip = useProjectStore((s) => s.removeClip);
  const splitClipAtTime = useProjectStore((s) => s.splitClipAtTime);
  const setClipFadeIn = useProjectStore((s) => s.setClipFadeIn);
  const setClipFadeOut = useProjectStore((s) => s.setClipFadeOut);
  const moveClipToTrack = useProjectStore((s) => s.moveClipToTrack);
  const allTracks = useProjectStore((s) => s.project.tracks);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const pixelsPerSec = useTimelineStore((s) => s.pixelsPerSecond);
  const setSnapLine = useTimelineStore((s) => s.setSnapLine);

  const snapPoints = useMemo(() => {
    const points: number[] = [currentTime];
    for (const t of allTracks) {
      for (const c of t.clips) {
        if (c.id === clip.id) continue;
        points.push(c.startTime);
        points.push(c.startTime + c.duration);
      }
    }
    return points;
  }, [allTracks, currentTime, clip.id]);

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef({
    x: 0,
    y: 0,
    startTime: 0,
    trimStart: 0,
    trimEnd: 0,
    isDraggingVertically: false,
  });

  const clipWidth = clip.duration * pixelsPerSecond;
  const sourceDuration = source.duration;

  const getDragMode = (clientX: number, rect: DOMRect): DragMode => {
    const relX = clientX - rect.left;
    if (relX < HANDLE_WIDTH) return 'trim-left';
    if (relX > rect.width - HANDLE_WIDTH) return 'trim-right';
    return 'move';
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      selectClip(track.id, clip.id);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mode = getDragMode(e.clientX, rect);
      setDragMode(mode);
      setVerticalOffset(0);

      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        startTime: clip.startTime,
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd,
        isDraggingVertically: false,
      };

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
    },
    [clip, track.id, selectClip],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragMode) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const dt = dx / pixelsPerSecond;

      if (dragMode === 'move') {
        const rawStart = Math.max(0, dragStart.current.startTime + dt);
        const rawEnd = rawStart + clip.duration;
        const threshold = SNAP_THRESHOLD_PX / pixelsPerSec;

        let snappedStart = rawStart;
        let bestDist = threshold;
        let snappedTo: number | null = null;

        for (const point of snapPoints) {
          const distLeft = Math.abs(rawStart - point);
          if (distLeft < bestDist) {
            bestDist = distLeft;
            snappedStart = point;
            snappedTo = point;
          }
          const distRight = Math.abs(rawEnd - point);
          if (distRight < bestDist) {
            bestDist = distRight;
            snappedStart = point - clip.duration;
            snappedTo = point;
          }
        }

        updateClip(track.id, clip.id, { startTime: Math.max(0, snappedStart) });
        setSnapLine(snappedTo);

        if (Math.abs(dy) > VERTICAL_DRAG_THRESHOLD) {
          dragStart.current.isDraggingVertically = true;
        }
        if (dragStart.current.isDraggingVertically) {
          setVerticalOffset(dy);
        }
      } else if (dragMode === 'trim-left') {
        const maxTrim = sourceDuration - clip.trimEnd - 0.05;
        const newTrimStart = Math.max(0, Math.min(maxTrim, dragStart.current.trimStart + dt / 1));
        const trimDelta = newTrimStart - clip.trimStart;
        updateClip(track.id, clip.id, {
          trimStart: newTrimStart,
          startTime: clip.startTime + trimDelta,
          duration: clip.duration - trimDelta,
        });
      } else if (dragMode === 'trim-right') {
        const maxDuration = sourceDuration - clip.trimStart - clip.trimEnd;
        const newDuration = Math.max(0.05, Math.min(maxDuration, clip.duration + dt));
        updateClip(track.id, clip.id, { duration: newDuration });
        dragStart.current.x = e.clientX;
      }
    },
    [dragMode, pixelsPerSecond, clip, track.id, sourceDuration, updateClip],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragMode === 'move' && dragStart.current.isDraggingVertically) {
        const targetTrackId = resolveTrackAtY(e.clientY);
        if (targetTrackId && targetTrackId !== track.id) {
          moveClipToTrack(track.id, clip.id, targetTrackId);
        }
      }

      setDragMode(null);
      setVerticalOffset(0);
      setSnapLine(null);
      dragStart.current.isDraggingVertically = false;
    },
    [dragMode, track.id, clip.id, resolveTrackAtY, moveClipToTrack, setSnapLine],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectClip(track.id, clip.id);
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [track.id, clip.id, selectClip],
  );

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const timer = requestAnimationFrame(() => {
      window.addEventListener('pointerdown', close);
      window.addEventListener('contextmenu', close);
    });
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  const handleDoubleClick = useCallback(() => {
    const newFadeIn = clip.fadeIn.duration > 0 ? 0 : Math.min(0.5, clip.duration / 4);
    const newFadeOut = clip.fadeOut.duration > 0 ? 0 : Math.min(0.5, clip.duration / 4);
    setClipFadeIn(track.id, clip.id, { duration: newFadeIn, curve: 'linear' });
    setClipFadeOut(track.id, clip.id, { duration: newFadeOut, curve: 'linear' });
  }, [clip, track.id, setClipFadeIn, setClipFadeOut]);

  const isDraggingToOtherTrack = dragMode === 'move' && dragStart.current.isDraggingVertically && verticalOffset !== 0;

  return (
    <div
      className="absolute top-1 select-none touch-none"
      style={{
        left: clip.startTime * pixelsPerSecond,
        width: clipWidth,
        height: TRACK_HEIGHT - 2,
        cursor: dragMode === 'move' ? 'grabbing' : dragMode ? 'ew-resize' : 'grab',
        transform: isDraggingToOtherTrack ? `translateY(${verticalOffset}px)` : undefined,
        zIndex: isDraggingToOtherTrack ? 50 : undefined,
        opacity: isDraggingToOtherTrack ? 0.85 : 1,
        transition: dragMode ? undefined : 'transform 0.15s ease, opacity 0.15s ease',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* Clip name */}
      <div className="absolute top-0 left-1 right-1 text-[10px] text-white/70 truncate z-10 pointer-events-none leading-4">
        {clip.name}
      </div>

      <WaveformCanvas
        clip={clip}
        source={source}
        pixelsPerSecond={pixelsPerSecond}
        height={TRACK_HEIGHT - 2}
        color={track.color}
        isSelected={clip.isSelected}
      />

      {/* Trim handles */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-white/20 hover:bg-white/40 rounded-l"
        style={{ width: HANDLE_WIDTH, cursor: 'ew-resize' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 bg-white/20 hover:bg-white/40 rounded-r"
        style={{ width: HANDLE_WIDTH, cursor: 'ew-resize' }}
      />

      {/* Visual indicator when dragging between tracks */}
      {isDraggingToOtherTrack && (
        <div className="absolute inset-0 border-2 border-brand-400 rounded pointer-events-none" />
      )}

      {/* Context menu */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-[100] bg-surface-800 border border-surface-700 rounded-lg shadow-2xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-700 hover:text-white transition-colors"
              onClick={() => {
                removeClip(track.id, clip.id);
                setContextMenu(null);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Clip
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration}
              onClick={() => {
                splitClipAtTime(track.id, clip.id, currentTime);
                setContextMenu(null);
              }}
            >
              <Scissors className="w-3.5 h-3.5" /> Split at Playhead
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-700 hover:text-white transition-colors"
              onClick={() => {
                const newFadeIn = clip.fadeIn.duration > 0 ? 0 : Math.min(0.5, clip.duration / 4);
                const newFadeOut = clip.fadeOut.duration > 0 ? 0 : Math.min(0.5, clip.duration / 4);
                setClipFadeIn(track.id, clip.id, { duration: newFadeIn, curve: 'linear' });
                setClipFadeOut(track.id, clip.id, { duration: newFadeOut, curve: 'linear' });
                setContextMenu(null);
              }}
            >
              <AudioLines className="w-3.5 h-3.5" /> Toggle Fades
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
