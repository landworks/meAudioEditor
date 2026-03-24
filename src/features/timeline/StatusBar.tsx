import { useProjectStore } from '../../state/project-store';
import { useTimelineStore } from '../../state/timeline-store';
import { formatTimeShort } from '../../utils/format-time';
import { APP_VERSION } from '../../constants';

export function StatusBar() {
  const project = useProjectStore((s) => s.project);
  const getProjectDuration = useProjectStore((s) => s.getProjectDuration);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);

  const totalClips = project.tracks.reduce((sum, t) => sum + t.clips.length, 0);
  const duration = getProjectDuration();

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-surface-950 border-t border-surface-700 text-[11px] text-slate-500 shrink-0 gap-2 flex-wrap">
      <div className="flex items-center gap-3">
        <span>{project.tracks.length} track{project.tracks.length !== 1 ? 's' : ''}</span>
        <span className="hidden xs:inline">{totalClips} clip{totalClips !== 1 ? 's' : ''}</span>
        <span>{formatTimeShort(duration)}</span>
        <span className="hidden sm:inline">{Math.round(pixelsPerSecond)}px/s</span>
        <span className="hidden sm:inline">{project.sampleRate / 1000} kHz</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-600">
        <span>Developed by <span className="text-slate-500">Michael Kintner</span> of <span className="text-slate-500">CNerd Inc</span> / <span className="text-slate-500">LandWorks Services LLC</span></span>
        <span className="text-slate-700">|</span>
        <span>v{APP_VERSION}</span>
      </div>
    </div>
  );
}
