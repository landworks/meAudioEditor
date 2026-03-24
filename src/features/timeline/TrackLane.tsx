import { ClipView } from './ClipView';
import { useProjectStore } from '../../state/project-store';
import { TRACK_HEIGHT } from '../../constants';
import type { Track } from '../../types';

interface TrackLaneProps {
  track: Track;
  pixelsPerSecond: number;
  totalWidth: number;
  resolveTrackAtY: (clientY: number) => string | null;
}

export function TrackLane({ track, pixelsPerSecond, totalWidth, resolveTrackAtY }: TrackLaneProps) {
  const sources = useProjectStore((s) => s.sources);
  const deselectAll = useProjectStore((s) => s.deselectAll);

  return (
    <div
      className="relative border-b border-surface-700"
      style={{ height: TRACK_HEIGHT, width: totalWidth, minWidth: '100%' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) deselectAll();
      }}
    >
      {/* Background grid lines */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-px bg-white absolute top-1/2" />
      </div>

      {track.clips.map((clip) => {
        const source = sources.get(clip.sourceId);
        if (!source) return null;
        return (
          <ClipView
            key={clip.id}
            clip={clip}
            source={source}
            track={track}
            pixelsPerSecond={pixelsPerSecond}
            resolveTrackAtY={resolveTrackAtY}
          />
        );
      })}
    </div>
  );
}
