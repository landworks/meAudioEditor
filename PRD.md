# meAudioEditor — Product Requirements Document

**Version:** 1.16.4
**Author:** Michael Kintner — [CNerd Inc](https://cnerd.us) / [LandWorks Services LLC](https://landworkspro.com)
**Last Updated:** 2026-03-24
**Live URL:** [cnerd.us/projects/meaudioeditor](https://cnerd.us/projects/meaudioeditor/index.html)

---

## 1. Product Overview

meAudioEditor is a browser-based, multi-track audio editor that enables users to import audio files (or extract audio from video), arrange clips on a timeline, perform non-destructive edits, and export the final mix as MP3 — all without leaving the browser or installing native software.

### 1.1 Vision

Provide a free, zero-install, privacy-first audio editing experience that runs entirely client-side, targeting podcasters, content creators, musicians, and casual editors who need quick multi-track editing without the overhead of a desktop DAW.

### 1.2 Target Users

| Persona | Description |
|---------|-------------|
| **Podcaster** | Needs to combine multiple audio tracks (intro, conversation, outro), trim silence, adjust volumes, apply fades, and export to MP3 for distribution. |
| **Content Creator** | Wants to extract audio from video files, rearrange segments, and produce polished audio for social media or YouTube. |
| **Musician / Producer** | Requires a lightweight tool for quick rough edits, layering stems, and exporting demos without launching a full DAW. |
| **Student / Casual User** | Needs a simple, approachable tool for school projects, presentations, or personal recordings with no signup or download. |

### 1.3 Design Principles

- **Client-only by default** — No server, no account, no data leaves the browser unless the user explicitly saves/exports.
- **Non-destructive** — Source audio is never modified; all edits (trim, volume, fades) are metadata applied at playback and export time.
- **Professional-feeling UX** — Timeline, transport, and keyboard shortcuts inspired by industry DAWs (Adobe Premiere, Audacity) but with a simpler learning curve.
- **Offline-capable** — After initial load, the editor functions without a network connection (excluding YouTube import and FFmpeg CDN first-load).

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| UI Framework | React + TypeScript | 19.2.4 / ~5.9.3 |
| Build Tool | Vite | 8.x |
| Styling | Tailwind CSS | 4.x |
| State Management | Zustand | 5.x |
| Audio Playback | Web Audio API (`AudioContext`, `AudioBufferSourceNode`) | Native |
| Offline Rendering | `OfflineAudioContext` | Native |
| Video Demux / MP3 Encoding | FFmpeg.wasm (`@ffmpeg/ffmpeg` 0.12.x, core loaded from unpkg CDN) | 0.12.15 |
| Icons | Lucide React | 0.577.x |
| YouTube Proxy (optional) | Express 5 + `ytdlp-nodejs` | — |
| Linting | ESLint 9 + typescript-eslint | — |

### 2.1 Browser Requirements

- **SharedArrayBuffer** support required (enforced via `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers in Vite config).
- Modern Chromium-based browsers (Chrome, Edge, Brave), Firefox, and Safari 16.4+.

---

## 3. Architecture

### 3.1 High-Level Data Flow

```
[File Import / Drag-Drop]
        │
        ▼
[Web Audio API: decode → AudioBuffer]  ──or──  [FFmpeg.wasm: video → WAV → decode]
        │
        ▼
[Peak Extractor: AudioBuffer → Float32Array peaks]
        │
        ▼
[Zustand Project Store: AudioSource + AudioClip + Track]
        │                           │
        ▼                           ▼
[Canvas Waveform Renderer]   [Web Audio API: real-time playback]
                                    │
                                    ▼
                          [OfflineAudioContext: full mix render]
                                    │
                                    ▼
                          [FFmpeg.wasm: PCM → MP3 encode]
                                    │
                                    ▼
                          [Browser Download: .mp3 file]
```

### 3.2 State Architecture

Four Zustand stores manage all application state:

| Store | Responsibility |
|-------|---------------|
| **`project-store`** | Project metadata, tracks, clips, audio sources (`Map<string, AudioSource>`), all CRUD operations, and undo/redo integration. |
| **`timeline-store`** | Viewport state: `pixelsPerSecond`, `scrollLeft`, snap guide line, `zoomAtPoint` logic. |
| **`playback-store`** | Transport state: `status` (stopped/playing/paused), `currentTime`, loop start/end. |
| **`history-store`** | Undo/redo stacks (max 50 snapshots) using `structuredClone` for immutable snapshots. |

### 3.3 Audio Engine

A singleton `AudioEngine` class wraps the Web Audio API and provides:

- **Real-time playback** — Schedules `AudioBufferSourceNode` per clip with per-clip gain nodes, per-track gain nodes, and a master gain node. Supports fade-in/fade-out via `linearRampToValueAtTime`. Respects mute/solo per track.
- **Scrub preview** — Short (60ms) audio snippets at the scrub position for audible feedback.
- **Offline rendering** — `OfflineAudioContext`-based full-mix render for export, with the same clip/track/master gain chain.
- **Decoding** — `decodeAudioData` for native audio formats; FFmpeg.wasm pipeline for video-to-audio extraction.

### 3.4 Binary Project File Format (`.meaudio`)

```
Offset   Size       Description
──────── ────────── ──────────────────────────────
0        4 bytes    Magic: "MEAE"
4        4 bytes    Format version: uint32 LE (currently 1)
8        4 bytes    JSON header length: uint32 LE
12       N bytes    JSON header (UTF-8): project metadata + source descriptors
12+N     ...        Concatenated WAV payloads for each audio source
```

The JSON header contains the full project structure (tracks, clips, fades, volumes, pan) and a `sources[]` array where each entry records `byteOffset` and `byteLength` into the WAV data region.

---

## 4. Domain Model

### 4.1 Core Entities

```
Project
├── id: string (UUID)
├── name: string
├── sampleRate: number (default 44100)
├── masterVolume: number (0–2)
├── createdAt: number (epoch ms)
├── updatedAt: number (epoch ms)
└── tracks: Track[]

Track
├── id: string (UUID)
├── name: string
├── volume: number (0–2)
├── pan: number (-1 to 1)
├── isMuted: boolean
├── isSolo: boolean
├── color: string (from 8-color palette)
└── clips: AudioClip[]

AudioClip
├── id: string (UUID)
├── trackId: string
├── sourceId: string → AudioSource
├── name: string
├── startTime: number (seconds, position on timeline)
├── duration: number (seconds, after trim)
├── trimStart: number (seconds, from beginning of source)
├── trimEnd: number (seconds, from end of source)
├── volume: number (0–2, unity = 1)
├── fadeIn: FadeSettings
├── fadeOut: FadeSettings
└── isSelected: boolean

FadeSettings
├── duration: number (seconds)
└── curve: 'linear' | 'exponential' | 'equal-power'

AudioSource
├── id: string (UUID)
├── name: string
├── fileName: string
├── sampleRate: number
├── numberOfChannels: number
├── duration: number (seconds)
├── peaks: Float32Array (pre-computed waveform data)
└── buffer: AudioBuffer (decoded audio)
```

### 4.2 Constants & Limits

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_VOLUME` | 2.0 | Maximum volume multiplier (+6 dB boost) |
| `MAX_FILE_SIZE_MB` | 500 | Maximum import file size |
| `WAVEFORM_PEAKS_PER_SECOND` | 4000 | Resolution of waveform peak data |
| `DEFAULT_SAMPLE_RATE` | 44100 | Default project sample rate |
| `DEFAULT_BITRATE` | 192 | Default MP3 export bitrate (kbps) |
| `MIN_PIXELS_PER_SECOND` | 1 | Minimum timeline zoom |
| `MAX_PIXELS_PER_SECOND` | 1476 | Maximum timeline zoom |
| `DEFAULT_PIXELS_PER_SECOND` | 50 | Default timeline zoom |
| `TRACK_HEIGHT` | 100px | Track lane height |
| `TRACK_HEADER_WIDTH` | 180px / 60px (mobile) | Track header sidebar width |
| `MAX_UNDO` | 50 | Maximum undo history depth |
| `TRACK_COLORS` | 8 colors | Cycling color palette for new tracks |

---

## 5. Feature Specifications

### 5.1 Audio Import

**FR-5.1.1: Local file import**
- Users can import audio via file picker dialog or drag-and-drop onto the timeline.
- Supported audio MIME types: `audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/ogg`, `audio/webm`.
- Files are validated for type and size (max 500 MB) before processing.
- Audio is decoded using the Web Audio API's `decodeAudioData`.
- Waveform peaks are extracted at 4000 peaks/second for rendering.
- Imported audio is placed as a clip on the first empty track, or a new track is created.

**FR-5.1.2: Video-to-audio extraction**
- Supported video MIME types: `video/mp4`, `video/webm`, `video/quicktime`, `video/x-matroska`.
- Video files are processed through FFmpeg.wasm to extract audio as WAV (PCM 16-bit, 44.1 kHz, stereo).
- The extracted WAV is then decoded via Web Audio API like a normal audio import.

**FR-5.1.3: YouTube audio import (optional)**
- An optional local Express proxy server (`server/youtube-proxy.js`, port 3001) enables downloading audio from YouTube using `yt-dlp`.
- API endpoints: `GET /api/youtube/info/:videoId` (metadata) and `GET /api/youtube/audio/:videoId` (stream audio).
- Prefers m4a (AAC) format for browser compatibility; falls back to best available.
- Requires `yt-dlp` installed on the host system.
- The main app links to an external YouTube downloader tool at `https://meyoutubedownloader.cnerd.ai/`.

**FR-5.1.4: Project file import**
- Users can open `.meaudio` project files via file picker or drag-and-drop.
- The binary format is parsed, audio sources are decoded, waveforms are regenerated, and the full project state is restored.

### 5.2 Multi-Track Timeline

**FR-5.2.1: Track management**
- Projects start with one default track.
- Users can add unlimited tracks via the "Add Track" button.
- Tracks can be deleted (minimum 1 track must remain).
- Tracks can be renamed inline.
- Each track has an auto-assigned color from an 8-color rotating palette.

**FR-5.2.2: Track mixing controls**
- Per-track volume slider (0–200%).
- Per-track mute toggle.
- Per-track solo toggle (when any track is soloed, only soloed tracks are audible).
- Pan control (data model supports -1 to +1; UI implementation pending).

**FR-5.2.3: Clip arrangement**
- Clips can be dragged horizontally to reposition on the timeline.
- Clips can be dragged vertically to move between tracks.
- Snap guide lines appear when clip edges align with other clip edges.
- Click to select a clip; click empty area to deselect.

**FR-5.2.4: Timeline viewport**
- Horizontal scrolling via scroll wheel, Shift+scroll, or trackpad horizontal gesture.
- Zoom via Ctrl/Cmd+scroll, Alt+scroll, or pinch-to-zoom (trackpad).
- Zoom anchors at the cursor position (Premiere Pro-style).
- Zoom range: 1–1476 pixels per second.
- Zoom slider in the transport bar for manual control.
- Auto-scroll to keep the playhead visible during playback.

**FR-5.2.5: Time ruler**
- Displays time markers scaled to the current zoom level.
- Click on the ruler to scrub/seek the playhead.
- Playhead is rendered as a red vertical line across all tracks.

### 5.3 Non-Destructive Editing

**FR-5.3.1: Clip trimming**
- `trimStart` and `trimEnd` values determine the visible/audible portion of the source audio.
- Trimming never modifies the underlying `AudioBuffer`.

**FR-5.3.2: Clip volume**
- Per-clip volume (0–200%) adjustable via the Clip Inspector.
- Values above 100% are highlighted in amber as a visual warning.

**FR-5.3.3: Fade in / Fade out**
- Per-clip fade-in and fade-out with adjustable duration (0–5 seconds, capped at half the clip duration).
- Currently uses `linear` curve; data model supports `exponential` and `equal-power`.
- Fades are applied in the audio engine via `linearRampToValueAtTime` during both playback and export.

**FR-5.3.4: Split at playhead**
- Splits the selected clip at the current playhead position.
- Creates two new clips preserving all properties (volume, fades reset at the split point, trim adjusted).
- Recorded as a single undoable action.

**FR-5.3.5: Delete clip**
- Selected clips can be deleted via the Clip Inspector's delete button, the Delete/Backspace key, or programmatically.
- Recorded as an undoable action.

### 5.4 Clip Inspector

**FR-5.4.1: Inspector panel**
- Appears at the bottom of the screen when any clip is selected.
- Displays: clip name, time range (start — end), volume slider, fade-in slider, fade-out slider, and a delete button.
- All changes are applied in real time.

### 5.5 Playback & Transport

**FR-5.5.1: Transport controls**
- Play / Pause toggle (Space bar or button).
- Stop (resets to 0).
- Current time display in `MM:SS.ms` format.

**FR-5.5.2: Playback engine**
- Playback uses the Web Audio API with per-clip `AudioBufferSourceNode` scheduling.
- Gain chain: clip gain → track gain → master gain → destination.
- Playback respects mute/solo state, per-clip volume, per-track volume, master volume, and fade envelopes.
- `requestAnimationFrame` loop updates the playhead position in real time.
- Playback ends automatically when the last clip finishes.

**FR-5.5.3: Scrubbing**
- Click or drag on the ruler or empty timeline area to scrub the playhead.
- Short audio preview (~60ms) is played at the scrub position for audible feedback.

### 5.6 Undo / Redo

**FR-5.6.1: History system**
- Full project snapshot-based undo/redo (not action-based).
- Uses `structuredClone` for immutable snapshots.
- Up to 50 undo levels.
- Redo stack is cleared when a new action is performed.
- History is cleared when a project file is loaded.
- Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y (redo).
- Undo/redo buttons in the transport bar with enabled/disabled state.

### 5.7 Export

**FR-5.7.1: MP3 export**
- Export dialog with selectable bitrate: 128, 192 (default/recommended), 256, 320 kbps.
- Two-phase export with progress indicator:
  1. **Rendering** — Full mix rendered via `OfflineAudioContext` (stereo, 44.1 kHz).
  2. **Encoding** — PCM-to-MP3 encoding via FFmpeg.wasm.
- Exported file auto-downloads as `{projectName}.mp3`.
- Error handling with retry option.

**FR-5.7.2: Project save**
- Save dialog prompts for a project name (defaults to current name or "Untitled").
- Serializes the full project + all referenced audio sources into a `.meaudio` binary file.
- Only audio sources referenced by at least one clip are included (dead sources are excluded).
- Auto-downloads as `{filename}.meaudio`.

### 5.8 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Toggle play/pause |
| `Delete` / `Backspace` | Delete selected clip |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + Y` | Redo (alternate) |

Shortcuts are suppressed when focus is on input, textarea, select, or contentEditable elements.

### 5.9 Waveform Visualization

**FR-5.9.1: Peak-based rendering**
- Waveform peaks are pre-computed at 4000 samples/second during import.
- Rendered on a `<canvas>` element that scales with zoom level.
- Clip color matches the parent track's assigned color.
- Waveforms update in real time as clips are moved, trimmed, or zoomed.

### 5.10 Responsive UI

**FR-5.10.1: Layout**
- Vertical stack: TopBar → TransportBar → Timeline (or EmptyState) → ClipInspector → StatusBar.
- Track header sidebar narrows from 180px to 60px on screens < 640px wide.
- "Add Track" label hidden on mobile; icon-only.
- Dark theme (surface-900/950 palette).

**FR-5.10.2: Empty state**
- When no clips exist, a full-page call-to-action encourages the user to import audio.
- Supports click-to-browse and drag-and-drop.

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Time to interactive | < 3 seconds on modern hardware |
| Audio decode (60s WAV) | < 500ms |
| Waveform peak extraction (60s) | < 200ms |
| Playback latency (click → audio) | < 50ms |
| Export render (5 min mix) | < 30 seconds |
| Undo/redo | < 16ms (synchronous, single frame) |

### 6.2 Reliability

- No data loss: all edits are preserved in Zustand state until the user explicitly closes the tab.
- Graceful error handling for unsupported file types, oversized files, FFmpeg failures, and corrupt project files.
- Import/export overlays prevent user interaction during async operations.

### 6.3 Privacy & Security

- All audio processing happens client-side. No audio data is sent to any server.
- The optional YouTube proxy runs only on localhost and is not required for core functionality.
- No analytics, cookies, or tracking.
- No user accounts or authentication.
- COOP/COEP headers configured for SharedArrayBuffer isolation.

### 6.4 Accessibility

- Semantic HTML structure.
- Keyboard-navigable transport controls.
- All interactive elements have proper labels (slider inputs with labels, buttons with text/icons).
- High-contrast dark theme with legible text.

---

## 7. Deployment

### 7.1 Build

```bash
npm run build    # TypeScript type-check + Vite production build → dist/
```

### 7.2 Hosting

- Static site deployed to Hostinger via FTP (credentials in `.env`).
- `base: '/'` in Vite config (adjustable for subdirectory deploys).
- COOP/COEP headers must be served by the hosting provider for FFmpeg.wasm to function.

### 7.3 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run dev:full` | Vite + YouTube proxy concurrently |
| `npm run server` | YouTube proxy only (port 3001) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |

---

## 8. Project Structure

```
meAudioEditor/
├── public/                          Static assets
│   └── favicon.svg
├── server/
│   └── youtube-proxy.js             Optional Express proxy for YouTube audio
├── src/
│   ├── main.tsx                     React entry point
│   ├── App.tsx                      Root component: layout, routing, overlays
│   ├── index.css                    Global Tailwind styles
│   ├── constants.ts                 Version, layout, audio, file-type constants
│   ├── types/
│   │   └── index.ts                 Domain model interfaces and factory functions
│   ├── components/
│   │   ├── layout/TopBar.tsx        App chrome: file actions, branding
│   │   └── ui/Button.tsx            Shared button (variants, sizes, icon support)
│   ├── features/
│   │   ├── editing/ClipInspector.tsx Selected-clip properties panel
│   │   ├── export/
│   │   │   ├── ExportDialog.tsx     MP3 export with bitrate selection + progress
│   │   │   └── SaveDialog.tsx       Project name prompt for .meaudio save
│   │   ├── import/
│   │   │   ├── EmptyState.tsx       No-clips CTA screen
│   │   │   └── ImportOverlay.tsx    Blocking overlay during import/load
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx         Main timeline: scroll, zoom, scrub, playhead
│   │   │   ├── TimelineRuler.tsx    Time markers and ruler click-to-scrub
│   │   │   ├── TrackLane.tsx        Per-track clip container
│   │   │   ├── ClipView.tsx         Individual clip: drag, trim, waveform
│   │   │   └── StatusBar.tsx        Version display footer
│   │   ├── tracks/
│   │   │   └── TrackHeader.tsx      Track name, mute, solo, volume controls
│   │   ├── transport/
│   │   │   └── TransportBar.tsx     Play/stop, time, zoom, split, undo/redo
│   │   └── waveform/
│   │       └── WaveformCanvas.tsx   Canvas-based waveform rendering
│   ├── hooks/
│   │   ├── useImportAudio.ts        File validation, decode, peak extract, clip creation
│   │   ├── usePlayback.ts           Bridges audio engine ↔ playback store
│   │   └── useKeyboardShortcuts.ts  Global keyboard shortcut handler
│   ├── services/
│   │   ├── audio-engine.ts          AudioContext wrapper: play, pause, scrub, render
│   │   ├── ffmpeg-service.ts        FFmpeg.wasm: video extraction + MP3 encoding
│   │   ├── peak-extractor.ts        AudioBuffer → Float32Array peak data
│   │   └── project-file.ts          .meaudio binary format read/write
│   ├── state/
│   │   ├── project-store.ts         Zustand: project, sources, tracks, clips, history
│   │   ├── timeline-store.ts        Zustand: viewport, zoom, scroll, snap
│   │   ├── playback-store.ts        Zustand: transport status, current time, loop
│   │   └── history-store.ts         Zustand: undo/redo stacks (max 50)
│   └── utils/
│       ├── file-helpers.ts          File type categorization and validation
│       ├── format-time.ts           Seconds → MM:SS.ms string
│       └── wav-encoder.ts           AudioBuffer → WAV ArrayBuffer (for project save)
├── .env.example                     FTP deployment credentials template
├── index.html                       Vite HTML shell
├── vite.config.ts                   Vite: React plugin, Tailwind, COOP/COEP headers
├── tsconfig.json                    TypeScript project references
├── eslint.config.js                 ESLint flat config
├── package.json                     Dependencies and scripts
└── LICENSE                          MIT
```

---

## 9. Version History

The application version is tracked in three synchronized locations:

1. `package.json` → `"version"`
2. `src/constants.ts` → `APP_VERSION`
3. Displayed in `StatusBar` as `v{APP_VERSION}`

The `.meaudio` binary file format has its own `FORMAT_VERSION` (currently `1`), independent of the app version.

**Current Version:** 1.16.4

---

## 10. Future Considerations

The following are not currently implemented but are structurally supported or natural extensions:

| Area | Description |
|------|-------------|
| **Pan control UI** | The `Track.pan` field exists in the data model but has no UI control yet. |
| **Fade curve selection** | `FadeSettings.curve` supports `exponential` and `equal-power` but the UI only exposes `linear`. |
| **Waveform zoom optimization** | Canvas redraws could be memoized or offscreen-rendered for large projects. |
| **Loop playback** | `PlaybackState` has `isLooping`, `loopStart`, `loopEnd` fields but no UI. |
| **Multi-select clips** | Only single-clip selection is implemented. |
| **Copy / paste clips** | Not implemented. |
| **Audio effects (EQ, compression, reverb)** | Would require additional Web Audio API nodes in the gain chain. |
| **Cloud save / collaboration** | Currently fully offline; would require a backend and auth layer. |
| **WAV / FLAC export** | Export currently only supports MP3 via FFmpeg.wasm. |
| **PWA / offline install** | No service worker; adding one would enable full offline-first behavior. |
| **Automated testing** | No test framework is configured. |

---

## 11. License

MIT License — see [LICENSE](LICENSE).
