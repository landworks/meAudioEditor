import express from 'express';
import cors from 'cors';
import { YtDlp } from 'ytdlp-nodejs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, unlink, readdir } from 'fs/promises';
import { randomUUID } from 'crypto';

const app = express();
const PORT = 3001;
const ytdlp = new YtDlp();

app.use(cors({ origin: true }));

app.get('/api/youtube/info/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdlp.getInfoAsync(url);

    const audioFormats = (info.formats || []).filter(
      (f) => f.resolution === 'audio only',
    );

    res.json({
      title: info.title || videoId,
      duration: info.duration || 0,
      channelName: info.channel || info.uploader || '',
      audioFormats: audioFormats.length,
    });
  } catch (err) {
    console.error('Info error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/youtube/audio/:videoId', async (req, res) => {
  const jobId = randomUUID().slice(0, 8);
  const outBase = join(tmpdir(), `meaudio-${jobId}`);

  try {
    const { videoId } = req.params;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const info = await ytdlp.getInfoAsync(url);
    const title = (info.title || videoId).replace(/[^a-zA-Z0-9 _-]/g, '').trim();

    // Prefer m4a (AAC) — universally supported by all browsers'
    // decodeAudioData(), unlike webm/opus which Safari can't handle.
    // Falls back to best available format if m4a isn't offered.
    await ytdlp.downloadAsync(url, {
      format: 'bestaudio[ext=m4a]/bestaudio',
      output: `${outBase}.%(ext)s`,
      noPlaylist: true,
    });

    // yt-dlp may append a different extension if m4a wasn't available
    const files = await readdir(tmpdir());
    const match = files.find((f) => f.startsWith(`meaudio-${jobId}`));
    if (!match) throw new Error('Download produced no output file');

    const finalPath = join(tmpdir(), match);
    const data = await readFile(finalPath);
    if (data.length < 1000) throw new Error('Downloaded file is too small');

    const ext = match.split('.').pop() || 'm4a';
    const mimeMap = {
      m4a: 'audio/mp4',
      webm: 'audio/webm',
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      ogg: 'audio/ogg',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'audio/mp4');
    res.setHeader('Content-Length', data.length);
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${ext}"`);
    res.setHeader('X-Audio-Title', encodeURIComponent(title));
    res.send(data);

    unlink(finalPath).catch(() => {});
  } catch (err) {
    console.error('Audio error:', err.message);

    // Clean up temp files on error
    const files = await readdir(tmpdir()).catch(() => []);
    for (const f of files) {
      if (f.startsWith(`meaudio-${jobId}`)) {
        unlink(join(tmpdir(), f)).catch(() => {});
      }
    }

    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
