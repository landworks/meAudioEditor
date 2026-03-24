import type { AudioClip, AudioSource, Track } from '../types';

interface ScheduledNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduledNodes: ScheduledNode[] = [];
  private activeTrackGains: Map<string, GainNode> = new Map();
  private startedAt = 0;
  private pausedAt = 0;
  private animationFrame = 0;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private scrubNodes: { source: AudioBufferSourceNode; gain: GainNode }[] = [];

  getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 44100 });
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async ensureResumed(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  updateTrackVolume(trackId: string, volume: number): void {
    const gain = this.activeTrackGains.get(trackId);
    if (gain) {
      gain.gain.value = volume;
    }
  }

  async decodeAudioFile(file: File): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const arrayBuffer = await file.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }

  async decodeArrayBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = this.getContext();
    return ctx.decodeAudioData(arrayBuffer);
  }

  play(
    tracks: Track[],
    sources: Map<string, AudioSource>,
    masterVolume: number,
    fromTime: number,
    onTimeUpdate: (time: number) => void,
    onEnded: () => void,
  ): void {
    this.stop();
    const ctx = this.getContext();
    this.setMasterVolume(masterVolume);
    this.onTimeUpdate = onTimeUpdate;
    this.activeTrackGains.clear();

    const hasSolo = tracks.some((t) => t.isSolo);

    let maxEnd = 0;

    for (const track of tracks) {
      const isAudible = hasSolo ? track.isSolo : !track.isMuted;
      if (!isAudible) continue;

      const trackGain = ctx.createGain();
      trackGain.gain.value = track.volume;
      trackGain.connect(this.masterGain!);

      this.activeTrackGains.set(track.id, trackGain);

      for (const clip of track.clips) {
        const source = sources.get(clip.sourceId);
        if (!source) continue;

        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd <= fromTime) continue;
        if (clipEnd > maxEnd) maxEnd = clipEnd;

        this.scheduleClip(ctx, clip, source, trackGain, fromTime);
      }
    }

    this.startedAt = ctx.currentTime - fromTime;
    this.pausedAt = 0;

    const tick = () => {
      const current = ctx.currentTime - this.startedAt;
      if (this.onTimeUpdate) this.onTimeUpdate(current);

      if (current >= maxEnd) {
        onEnded();
        this.stopAnimation();
        return;
      }

      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private scheduleClip(
    ctx: AudioContext,
    clip: AudioClip,
    source: AudioSource,
    trackGain: GainNode,
    fromTime: number,
  ): void {
    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = source.buffer;

    const clipGain = ctx.createGain();
    clipGain.connect(trackGain);
    bufferSource.connect(clipGain);

    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;

    const offset = Math.max(0, clipStart - fromTime);
    const when = ctx.currentTime + offset;

    const sourceOffset = clip.trimStart + Math.max(0, fromTime - clipStart);
    const playDuration = clipEnd - Math.max(fromTime, clipStart);

    if (playDuration <= 0) return;

    if (clip.fadeIn.duration > 0) {
      const fadeStart = clipStart;
      const fadeEnd = clipStart + clip.fadeIn.duration;

      if (fromTime < fadeEnd) {
        const relStart = Math.max(0, fadeStart - fromTime);
        const relEnd = fadeEnd - fromTime;

        clipGain.gain.setValueAtTime(
          fromTime > fadeStart ? (fromTime - fadeStart) / clip.fadeIn.duration : 0,
          ctx.currentTime + relStart,
        );
        clipGain.gain.linearRampToValueAtTime(clip.volume, ctx.currentTime + relEnd);
      } else {
        clipGain.gain.setValueAtTime(clip.volume, when);
      }
    } else {
      clipGain.gain.setValueAtTime(clip.volume, when);
    }

    if (clip.fadeOut.duration > 0) {
      const fadeStart = clipEnd - clip.fadeOut.duration;
      const fadeEnd = clipEnd;

      if (fromTime < fadeEnd) {
        const relStart = Math.max(0, fadeStart - fromTime);
        const relEnd = fadeEnd - fromTime;

        clipGain.gain.setValueAtTime(clip.volume, ctx.currentTime + relStart);
        clipGain.gain.linearRampToValueAtTime(0, ctx.currentTime + relEnd);
      }
    }

    bufferSource.start(when, sourceOffset, playDuration);
    this.scheduledNodes.push({ source: bufferSource, gainNode: clipGain });
  }

  scrub(
    tracks: Track[],
    sources: Map<string, AudioSource>,
    masterVolume: number,
    time: number,
  ): void {
    const ctx = this.getContext();
    this.setMasterVolume(masterVolume);

    for (const node of this.scrubNodes) {
      try { node.source.stop(); } catch { /* already stopped */ }
      node.source.disconnect();
      node.gain.disconnect();
    }
    this.scrubNodes = [];

    const SCRUB_DURATION = 0.06;
    const hasSolo = tracks.some((t) => t.isSolo);

    for (const track of tracks) {
      const isAudible = hasSolo ? track.isSolo : !track.isMuted;
      if (!isAudible) continue;

      for (const clip of track.clips) {
        const source = sources.get(clip.sourceId);
        if (!source) continue;

        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        if (time < clipStart || time >= clipEnd) continue;

        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = source.buffer;

        const gain = ctx.createGain();
        gain.gain.value = track.volume * clip.volume;
        gain.connect(this.masterGain!);
        bufferSource.connect(gain);

        const sourceOffset = clip.trimStart + (time - clipStart);
        const playDuration = Math.min(SCRUB_DURATION, clipEnd - time);

        if (playDuration <= 0) continue;
        bufferSource.start(0, sourceOffset, playDuration);
        this.scrubNodes.push({ source: bufferSource, gain });
      }
    }
  }

  pause(): number {
    const ctx = this.ctx;
    if (!ctx) return 0;

    this.pausedAt = ctx.currentTime - this.startedAt;
    this.stopAllNodes();
    this.stopAnimation();
    return this.pausedAt;
  }

  stop(): void {
    this.stopAllNodes();
    this.stopAnimation();
    this.pausedAt = 0;
    this.startedAt = 0;
    this.activeTrackGains.clear();
  }

  getCurrentTime(): number {
    if (!this.ctx) return this.pausedAt;
    if (this.startedAt === 0) return this.pausedAt;
    return this.ctx.currentTime - this.startedAt;
  }

  private stopAllNodes(): void {
    for (const node of this.scheduledNodes) {
      try {
        node.source.stop();
        node.source.disconnect();
        node.gainNode.disconnect();
      } catch {
        // Node may already be stopped
      }
    }
    this.scheduledNodes = [];
  }

  private stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
  }

  async renderOffline(
    tracks: Track[],
    sources: Map<string, AudioSource>,
    masterVolume: number,
    duration: number,
    sampleRate: number,
    onProgress?: (progress: number) => void,
  ): Promise<AudioBuffer> {
    const length = Math.ceil(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    const master = offlineCtx.createGain();
    master.gain.value = masterVolume;
    master.connect(offlineCtx.destination);

    const hasSolo = tracks.some((t) => t.isSolo);

    for (const track of tracks) {
      const isAudible = hasSolo ? track.isSolo : !track.isMuted;
      if (!isAudible) continue;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume;
      trackGain.connect(master);

      for (const clip of track.clips) {
        const source = sources.get(clip.sourceId);
        if (!source) continue;

        const bufferSource = offlineCtx.createBufferSource();
        bufferSource.buffer = source.buffer;

        const clipGain = offlineCtx.createGain();
        clipGain.connect(trackGain);
        bufferSource.connect(clipGain);

        clipGain.gain.setValueAtTime(clip.volume, clip.startTime);

        if (clip.fadeIn.duration > 0) {
          clipGain.gain.setValueAtTime(0, clip.startTime);
          clipGain.gain.linearRampToValueAtTime(
            clip.volume,
            clip.startTime + clip.fadeIn.duration,
          );
        }

        if (clip.fadeOut.duration > 0) {
          const fadeStart = clip.startTime + clip.duration - clip.fadeOut.duration;
          clipGain.gain.setValueAtTime(clip.volume, fadeStart);
          clipGain.gain.linearRampToValueAtTime(0, clip.startTime + clip.duration);
        }

        bufferSource.start(clip.startTime, clip.trimStart, clip.duration);
      }
    }

    onProgress?.(0.1);

    const rendered = await offlineCtx.startRendering();
    onProgress?.(0.9);

    return rendered;
  }
}

export const audioEngine = new AudioEngine();
