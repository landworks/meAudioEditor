import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useProjectStore } from '../../state/project-store';
import { MAX_VOLUME } from '../../constants';
import { formatTime } from '../../utils/format-time';

export function ClipInspector() {
  const getSelectedClip = useProjectStore((s) => s.getSelectedClip);
  const updateClip = useProjectStore((s) => s.updateClip);
  const removeClip = useProjectStore((s) => s.removeClip);
  const setClipFadeIn = useProjectStore((s) => s.setClipFadeIn);
  const setClipFadeOut = useProjectStore((s) => s.setClipFadeOut);

  const selected = getSelectedClip();
  if (!selected) return null;

  const { track, clip } = selected;

  return (
    <div className="shrink-0 bg-surface-900 border-t border-surface-700 px-3 py-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-white">{clip.name}</span>
          <span className="text-slate-500">
            {formatTime(clip.startTime)} — {formatTime(clip.startTime + clip.duration)}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            Volume
            <input
              id="clip-volume"
              type="range"
              min="0"
              max={MAX_VOLUME}
              step="0.01"
              value={clip.volume}
              onChange={(e) => updateClip(track.id, clip.id, { volume: parseFloat(e.target.value) })}
              className="w-16"
            />
            <span className={`w-8 text-right tabular-nums ${clip.volume > 1 ? 'text-amber-400' : ''}`}>
              {Math.round(clip.volume * 100)}%
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            Fade In
            <input
              id="clip-fade-in"
              type="range"
              min="0"
              max={Math.min(5, clip.duration / 2)}
              step="0.05"
              value={clip.fadeIn.duration}
              onChange={(e) =>
                setClipFadeIn(track.id, clip.id, { duration: parseFloat(e.target.value), curve: 'linear' })
              }
              className="w-16"
            />
            <span className="w-8 text-right tabular-nums">{clip.fadeIn.duration.toFixed(1)}s</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            Fade Out
            <input
              id="clip-fade-out"
              type="range"
              min="0"
              max={Math.min(5, clip.duration / 2)}
              step="0.05"
              value={clip.fadeOut.duration}
              onChange={(e) =>
                setClipFadeOut(track.id, clip.id, { duration: parseFloat(e.target.value), curve: 'linear' })
              }
              className="w-16"
            />
            <span className="w-8 text-right tabular-nums">{clip.fadeOut.duration.toFixed(1)}s</span>
          </label>

          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => removeClip(track.id, clip.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
