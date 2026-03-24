import { Volume2, VolumeX, Headphones, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../state/project-store';
import { TRACK_HEIGHT, MAX_VOLUME } from '../../constants';
import type { Track } from '../../types';

interface TrackHeaderProps {
  track: Track;
}

export function TrackHeader({ track }: TrackHeaderProps) {
  const setTrackVolume = useProjectStore((s) => s.setTrackVolume);
  const captureSnapshot = useProjectStore((s) => s.captureSnapshot);
  const toggleMute = useProjectStore((s) => s.toggleMute);
  const toggleSolo = useProjectStore((s) => s.toggleSolo);
  const deleteTrack = useProjectStore((s) => s.deleteTrack);
  const trackCount = useProjectStore((s) => s.project.tracks.length);

  const pct = Math.round(track.volume * 100);
  const isLastTrack = trackCount <= 1;

  return (
    <div
      className="flex flex-col justify-center gap-1 px-2 py-1 border-b border-surface-700 bg-surface-900 shrink-0"
      style={{ height: TRACK_HEIGHT }}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="text-xs font-medium text-slate-300 truncate">{track.name}</div>
        <button
          className={`p-0.5 rounded text-xs transition-colors ${
            isLastTrack
              ? 'text-surface-600 cursor-not-allowed'
              : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
          }`}
          onClick={() => deleteTrack(track.id)}
          disabled={isLastTrack}
          aria-label="Delete track"
          title={isLastTrack ? 'Cannot delete last track' : 'Delete track'}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          className={`p-1 rounded text-xs transition-colors ${
            track.isMuted ? 'bg-red-500/30 text-red-400' : 'text-slate-500 hover:text-slate-300'
          }`}
          onClick={() => toggleMute(track.id)}
          aria-label="Mute"
          title="Mute"
        >
          {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <button
          className={`p-1 rounded text-xs transition-colors ${
            track.isSolo ? 'bg-amber-500/30 text-amber-400' : 'text-slate-500 hover:text-slate-300'
          }`}
          onClick={() => toggleSolo(track.id)}
          aria-label="Solo"
          title="Solo"
        >
          <Headphones className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          id={`track-volume-${track.id}`}
          type="range"
          min="0"
          max={MAX_VOLUME}
          step="0.01"
          value={track.volume}
          onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
          onMouseDown={captureSnapshot}
          onTouchStart={captureSnapshot}
          className="flex-1 h-1.5"
          aria-label="Track volume"
          title={`${pct}%`}
        />
        <span
          className={`text-[10px] tabular-nums w-7 text-right shrink-0 ${
            pct > 100 ? 'text-amber-400' : 'text-slate-500'
          }`}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}
