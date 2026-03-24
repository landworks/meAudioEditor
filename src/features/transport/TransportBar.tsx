import { Play, Pause, Square, ZoomIn, ZoomOut, Scissors, Undo2, Redo2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { usePlayback } from '../../hooks/usePlayback';
import { useTimelineStore } from '../../state/timeline-store';
import { useProjectStore } from '../../state/project-store';
import { usePlaybackStore } from '../../state/playback-store';
import { useHistoryStore } from '../../state/history-store';
import { formatTime } from '../../utils/format-time';
import { MIN_PIXELS_PER_SECOND, MAX_PIXELS_PER_SECOND, DEFAULT_PIXELS_PER_SECOND } from '../../constants';

const LOG_MIN = Math.log(MIN_PIXELS_PER_SECOND);
const LOG_MAX = Math.log(MAX_PIXELS_PER_SECOND);

function ppsToSlider(pps: number): number {
  return ((Math.log(pps) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}

function sliderToPps(val: number): number {
  return Math.exp(LOG_MIN + (val / 100) * (LOG_MAX - LOG_MIN));
}

export function TransportBar() {
  const { status, currentTime, togglePlayPause, stop } = usePlayback();
  const zoomIn = useTimelineStore((s) => s.zoomIn);
  const zoomOut = useTimelineStore((s) => s.zoomOut);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const setPixelsPerSecond = useTimelineStore((s) => s.setPixelsPerSecond);
  const getProjectDuration = useProjectStore((s) => s.getProjectDuration);
  const getSelectedClip = useProjectStore((s) => s.getSelectedClip);
  const splitClipAtTime = useProjectStore((s) => s.splitClipAtTime);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const playbackTime = usePlaybackStore((s) => s.currentTime);

  const duration = getProjectDuration();

  const handleSplit = () => {
    const selected = getSelectedClip();
    if (!selected) return;
    const { track, clip } = selected;
    splitClipAtTime(track.id, clip.id, playbackTime);
  };

  const sliderValue = ppsToSlider(pixelsPerSecond);

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPixelsPerSecond(sliderToPps(parseFloat(e.target.value)));
  };

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-surface-850 border-b border-surface-700 shrink-0 gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon={status === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          onClick={togglePlayPause}
          aria-label={status === 'playing' ? 'Pause' : 'Play'}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Square className="w-3.5 h-3.5" />}
          onClick={stop}
          disabled={status === 'stopped'}
          aria-label="Stop"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Scissors className="w-4 h-4" />}
          onClick={handleSplit}
          aria-label="Split at playhead"
          title="Split at playhead"
        />

        <div className="w-px h-4 bg-surface-600 mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          icon={<Undo2 className="w-4 h-4" />}
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Cmd+Z)"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Redo2 className="w-4 h-4" />}
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Cmd+Shift+Z)"
        />
      </div>

      <div className="text-xs font-mono text-slate-300 tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<ZoomOut className="w-4 h-4" />}
          onClick={zoomOut}
          aria-label="Zoom out"
        />
        <input
          id="zoom-slider"
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={sliderValue}
          onChange={handleZoomSlider}
          className="w-20 sm:w-28 h-1.5"
          aria-label="Zoom level"
          title={`Zoom: ${Math.round(pixelsPerSecond)} px/s`}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<ZoomIn className="w-4 h-4" />}
          onClick={zoomIn}
          aria-label="Zoom in"
        />
        <span className="text-[10px] font-mono text-slate-400 tabular-nums min-w-[3.5rem] text-right">
          {Math.round((pixelsPerSecond / DEFAULT_PIXELS_PER_SECOND) * 100)}%
        </span>
      </div>
    </div>
  );
}
