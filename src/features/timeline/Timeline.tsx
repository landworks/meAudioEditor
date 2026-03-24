import { useRef, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { TimelineRuler } from './TimelineRuler';
import { TrackLane } from './TrackLane';
import { TrackHeader } from '../tracks/TrackHeader';
import { useProjectStore } from '../../state/project-store';
import { useTimelineStore } from '../../state/timeline-store';
import { usePlayback } from '../../hooks/usePlayback';
import { TRACK_HEIGHT, RULER_HEIGHT, TRACK_HEADER_WIDTH, TRACK_HEADER_WIDTH_MOBILE } from '../../constants';
import { Button } from '../../components/ui/Button';

export function Timeline() {
  const project = useProjectStore((s) => s.project);
  const getProjectDuration = useProjectStore((s) => s.getProjectDuration);
  const addTrack = useProjectStore((s) => s.addTrack);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const zoomAtPoint = useTimelineStore((s) => s.zoomAtPoint);
  const snapLineTime = useTimelineStore((s) => s.snapLineTime);
  const { status, currentTime, scrub } = usePlayback();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const trackLanesRef = useRef<HTMLDivElement>(null);
  const isDraggingScrub = useRef(false);

  const projectDuration = getProjectDuration();
  const totalDuration = Math.max(30, projectDuration + 10);
  const totalWidth = totalDuration * pixelsPerSecond;

  // --- Click-and-drag scrubbing on empty timeline area ---
  const xToTime = useCallback(
    (clientX: number, rect: DOMRect) => {
      const x = clientX - rect.left + (scrollContainerRef.current?.scrollLeft ?? 0);
      return Math.max(0, x / pixelsPerSecond);
    },
    [pixelsPerSecond],
  );

  const handleTimelinePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== e.currentTarget) return;
      const rect = e.currentTarget.getBoundingClientRect();
      scrub(xToTime(e.clientX, rect));

      isDraggingScrub.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [xToTime, scrub],
  );

  const handleTimelinePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingScrub.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      scrub(xToTime(e.clientX, rect));
    },
    [xToTime, scrub],
  );

  const handleTimelinePointerUp = useCallback(() => {
    isDraggingScrub.current = false;
  }, []);

  // --- Premiere-style scroll wheel zoom ---
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom (ctrlKey is set by trackpad pinch) or Cmd/Ctrl + scroll
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const direction = e.deltaY < 0 ? 'in' : 'out';
        zoomAtPoint(direction, cursorX, container);
        return;
      }

      // Alt + scroll = horizontal zoom (matches Premiere Alt-scroll)
      if (e.altKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const direction = e.deltaY < 0 ? 'in' : 'out';
        zoomAtPoint(direction, cursorX, container);
        return;
      }

      // Shift + scroll = horizontal scroll (or native horizontal scroll from trackpad)
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Let the browser handle native horizontal scroll from trackpad deltaX,
        // but convert shift+vertical-scroll into horizontal scroll
        if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
        return;
      }

      // Plain scroll = horizontal scroll (Premiere behavior)
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomAtPoint]);

  // --- Auto-scroll to keep playhead visible during playback ---
  useEffect(() => {
    if (status !== 'playing') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const playheadX = currentTime * pixelsPerSecond;
    const viewWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;

    if (playheadX > scrollLeft + viewWidth * 0.9 || playheadX < scrollLeft) {
      container.scrollLeft = playheadX - viewWidth * 0.15;
    }
  }, [status, currentTime, pixelsPerSecond]);

  const resolveTrackAtY = useCallback(
    (clientY: number): string | null => {
      const container = trackLanesRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      const relY = clientY - rect.top + container.scrollTop;

      let accumulated = 0;
      for (let i = 0; i < project.tracks.length; i++) {
        accumulated += TRACK_HEIGHT;
        if (relY < accumulated) {
          return project.tracks[i].id;
        }
      }
      return null;
    },
    [project.tracks],
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const headerWidth = isMobile ? TRACK_HEADER_WIDTH_MOBILE : TRACK_HEADER_WIDTH;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {/* Track headers column */}
        <div
          className="shrink-0 bg-surface-900 border-r border-surface-700 overflow-hidden"
          style={{ width: headerWidth }}
        >
          {/* Ruler spacer */}
          <div className="border-b border-surface-700" style={{ height: RULER_HEIGHT }} />

          {project.tracks.map((track) => (
            <TrackHeader key={track.id} track={track} />
          ))}

          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={addTrack}
              className="w-full"
            >
              <span className="hidden sm:inline text-xs">Add Track</span>
            </Button>
          </div>
        </div>

        {/* Timeline scroll area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto min-h-0"
          data-scroll-container
        >
          {/* Ruler */}
          <div className="sticky top-0 z-20">
            <TimelineRuler
              pixelsPerSecond={pixelsPerSecond}
              totalWidth={totalWidth}
              currentTime={currentTime}
              onScrub={scrub}
              scrollContainerRef={scrollContainerRef}
            />
          </div>

          {/* Track lanes */}
          <div
            ref={trackLanesRef}
            className="relative"
            style={{ minHeight: `calc(100% - ${RULER_HEIGHT}px)` }}
            onPointerDown={handleTimelinePointerDown}
            onPointerMove={handleTimelinePointerMove}
            onPointerUp={handleTimelinePointerUp}
            onPointerCancel={handleTimelinePointerUp}
          >
            {project.tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                pixelsPerSecond={pixelsPerSecond}
                totalWidth={totalWidth}
                resolveTrackAtY={resolveTrackAtY}
              />
            ))}

            {/* Snap guide line */}
            {snapLineTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-px pointer-events-none z-20"
                style={{
                  left: snapLineTime * pixelsPerSecond,
                  borderLeft: '1px dashed #facc15',
                }}
              />
            )}

            {/* Playhead line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
              style={{ left: currentTime * pixelsPerSecond }}
            />

            {/* Empty area below tracks to allow scrolling */}
            <div style={{ height: 200, width: totalWidth }} />
          </div>
        </div>
      </div>
    </div>
  );
}
