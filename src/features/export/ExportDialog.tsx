import { useState, useCallback } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { audioEngine } from '../../services/audio-engine';
import { encodeToMp3 } from '../../services/ffmpeg-service';
import { useProjectStore } from '../../state/project-store';
import { DEFAULT_SAMPLE_RATE } from '../../constants';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportPhase = 'idle' | 'rendering' | 'encoding' | 'done' | 'error';

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const project = useProjectStore((s) => s.project);
  const sources = useProjectStore((s) => s.sources);
  const getProjectDuration = useProjectStore((s) => s.getProjectDuration);

  const [bitrate, setBitrate] = useState<number>(192);
  const [phase, setPhase] = useState<ExportPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleExport = useCallback(async () => {
    try {
      setPhase('rendering');
      setProgress(0);

      const duration = getProjectDuration();
      if (duration === 0) {
        setError('No audio to export');
        setPhase('error');
        return;
      }

      const rendered = await audioEngine.renderOffline(
        project.tracks,
        sources,
        project.masterVolume,
        duration,
        DEFAULT_SAMPLE_RATE,
        (p) => setProgress(p * 0.4),
      );

      setPhase('encoding');
      const blob = await encodeToMp3(rendered, bitrate, (p) => setProgress(0.4 + p * 0.6));

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'export'}.mp3`;
      a.click();
      URL.revokeObjectURL(url);

      setPhase('done');
      setProgress(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setPhase('error');
    }
  }, [project, sources, getProjectDuration, bitrate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Export MP3</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'idle' && (
          <>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Bitrate</label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value))}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value={128}>128 kbps</option>
                <option value={192}>192 kbps (recommended)</option>
                <option value={256}>256 kbps</option>
                <option value={320}>320 kbps (highest)</option>
              </select>
            </div>

            <Button variant="primary" className="w-full" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
              Export
            </Button>
          </>
        )}

        {(phase === 'rendering' || phase === 'encoding') && (
          <div className="text-center py-4">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300 mb-2">
              {phase === 'rendering' ? 'Mixing tracks...' : 'Encoding MP3...'}
            </p>
            <div className="w-full bg-surface-800 rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">{Math.round(progress * 100)}%</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center py-4">
            <p className="text-sm text-green-400 mb-3">Export complete! Your download should start automatically.</p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-4">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <Button variant="secondary" onClick={() => setPhase('idle')}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
