import { useRef, useState, useCallback } from 'react';
import { TopBar } from './components/layout/TopBar';
import { TransportBar } from './features/transport/TransportBar';
import { Timeline } from './features/timeline/Timeline';
import { StatusBar } from './features/timeline/StatusBar';
import { EmptyState } from './features/import/EmptyState';
import { ImportOverlay } from './features/import/ImportOverlay';
import { ExportDialog } from './features/export/ExportDialog';
import { SaveDialog } from './features/export/SaveDialog';
import { ClipInspector } from './features/editing/ClipInspector';
import { useImportAudio } from './hooks/useImportAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProjectStore } from './state/project-store';
import { saveProjectFile, loadProjectFile } from './services/project-file';
import { ACCEPTED_FILE_TYPES } from './constants';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const [showExport, setShowExport] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { isImporting, progress, error, importFile, clearError } = useImportAudio();
  useKeyboardShortcuts();
  const project = useProjectStore((s) => s.project);
  const sources = useProjectStore((s) => s.sources);
  const loadProject = useProjectStore((s) => s.loadProject);
  const setProjectName = useProjectStore((s) => s.setProjectName);

  const hasClips = project.tracks.some((t) => t.clips.length > 0);

  // --- Audio file import ---
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) await importFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [importFile],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (file.name.endsWith('.meaudio')) {
        await handleLoadProjectFile(file);
      } else {
        await importFile(file);
      }
    },
    [importFile], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // --- Save project ---
  const handleSaveClick = useCallback(() => {
    setShowSave(true);
  }, []);

  const handleSaveConfirm = useCallback(async (filename: string) => {
    setShowSave(false);
    setProjectName(filename);
    setIsSaving(true);
    try {
      const updatedProject = { ...project, name: filename };
      const blob = await saveProjectFile(updatedProject, sources);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.meaudio`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [project, sources, setProjectName]);

  // --- Open project ---
  const handleOpenClick = useCallback(() => {
    projectFileInputRef.current?.click();
  }, []);

  const handleLoadProjectFile = useCallback(
    async (file: File) => {
      setIsLoadingProject(true);
      setLoadError(null);
      try {
        const result = await loadProjectFile(file);
        loadProject(result.project, result.sources);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to open project file';
        setLoadError(msg);
      } finally {
        setIsLoadingProject(false);
      }
    },
    [loadProject],
  );

  const handleProjectFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) await handleLoadProjectFile(file);
      if (projectFileInputRef.current) projectFileInputRef.current.value = '';
    },
    [handleLoadProjectFile],
  );

  // Combine loading states for the overlay
  const isOverlayActive = isImporting || isLoadingProject;
  const overlayProgress = isLoadingProject ? 'Loading project...' : progress;
  const overlayError = loadError || error;

  const handleDismissOverlayError = useCallback(() => {
    clearError();
    setLoadError(null);
  }, [clearError]);

  return (
    <div
      className="flex flex-col h-full bg-surface-950"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Hidden file inputs */}
      <input
        id="audio-file-input"
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        id="project-file-input"
        ref={projectFileInputRef}
        type="file"
        accept=".meaudio"
        onChange={handleProjectFileChange}
        className="hidden"
      />

      <TopBar
        onImportClick={handleImportClick}
        onExportClick={() => setShowExport(true)}
        onSaveClick={handleSaveClick}
        onOpenClick={handleOpenClick}
        onYouTubeClick={() => window.open('https://meyoutubedownloader.cnerd.ai/', '_blank')}
        isImporting={isImporting}
        isSaving={isSaving}
        hasClips={hasClips}
        projectName={project.name}
      />

      <TransportBar />

      {hasClips ? <Timeline /> : <EmptyState onImportClick={handleImportClick} />}

      {hasClips && <ClipInspector />}

      <StatusBar />

      <ImportOverlay
        isImporting={isOverlayActive}
        progress={overlayProgress}
        error={overlayError}
        onDismissError={handleDismissOverlayError}
      />

      <ExportDialog isOpen={showExport} onClose={() => setShowExport(false)} />
      <SaveDialog
        isOpen={showSave}
        defaultName={project.name || 'Untitled'}
        onSave={handleSaveConfirm}
        onClose={() => setShowSave(false)}
      />
    </div>
  );
}
