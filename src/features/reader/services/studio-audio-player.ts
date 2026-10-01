import { findSentenceIndexAtTime, findStartTimeForSentence } from '@/features/reader/services/alignment.service';
import type { AnnotatedChunkPlan, PlaybackStatus, StudioChunk } from '@/features/reader/types/reader.types';
import type { PlayerListener } from '@/features/reader/services/device-speech-player';

/**
 * Plays rendered chunks and moves the highlight from character timings.
 * In-flight renders are not aborted: once ElevenLabs accepts a section, the credit is spent,
 * so the result is cached even if the listener has already moved on.
 */
export class StudioAudioPlayer {
  private readonly audio = new Audio();
  private plans: AnnotatedChunkPlan[] = [];
  private chunks = new Map<number, StudioChunk>();
  private chunkIndex = 0;
  private token = 0;
  private disposed = false;
  private status: PlaybackStatus = 'idle';
  private prefetchFailure: string | null = null;

  constructor(
    private readonly loadChunk: (plan: AnnotatedChunkPlan) => Promise<StudioChunk>,
    private readonly listener: PlayerListener,
  ) {
    this.audio.preload = 'auto';
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.addEventListener('ended', this.handleEnded);
    this.audio.addEventListener('error', this.handleError);
  }

  /**
   * Replaces the chunk map. Playback stops because the previous audio may belong to another voice.
   *
   * @param plans - Annotated plans for the active document and voice.
   */
  setPlans(plans: readonly AnnotatedChunkPlan[]): void {
    this.plans = [...plans];
    this.chunks.clear();
    this.stop({ silent: true });
  }

  /**
   * Loads the chunk that contains the sentence, seeks to it, and plays.
   *
   * @param sentenceIndex - Target sentence in the document.
   */
  async playFromSentence(sentenceIndex: number): Promise<void> {
    const plan = this.plans.find((item) => item.spans.some((span) => span.sentenceIndex === sentenceIndex));

    if (!plan) {
      this.listener.onError('That sentence is not in this reading.');
      return;
    }

    const token = this.nextToken();
    this.listener.onStatus('loading');

    try {
      const chunk = await this.ensureChunk(plan);

      if (this.disposed || token !== this.token) {
        return;
      }

      this.chunkIndex = plan.chunkIndex;
      this.audio.src = chunk.audioUrl;
      await waitForMetadata(this.audio);

      if (this.disposed || token !== this.token) {
        return;
      }

      const durationSeconds = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
      this.audio.currentTime = findStartTimeForSentence(
        chunk.textLength,
        chunk.alignment,
        plan.spans,
        sentenceIndex,
        durationSeconds,
      );
      await this.audio.play();

      if (this.disposed || token !== this.token) {
        this.audio.pause();
        return;
      }

      this.status = 'playing';
      this.listener.onStatus('playing');
      this.listener.onSentence(sentenceIndex);
      void this.prefetch(plan.chunkIndex + 1);
    } catch (error) {
      if (this.disposed || token !== this.token) {
        return;
      }

      this.status = 'idle';
      this.listener.onStatus('idle');
      this.listener.onError(readPlaybackMessage(error));
    }
  }

  /**
   * Pauses the current chunk and drops any section that has not started playing yet.
   * The in-flight render is still cached, because the provider charges once generation starts.
   */
  pause(): void {
    this.nextToken();
    this.audio.pause();
    this.status = 'paused';
    this.listener.onStatus('paused');
  }

  /**
   * Reports whether resume can continue the buffered audio instead of starting the sentence again.
   *
   * @returns True when a chunk is loaded and paused mid-playback.
   */
  canResume(): boolean {
    return this.status === 'paused' && this.audio.readyState >= 1 && this.audio.src.length > 0;
  }

  /**
   * Continues the current chunk.
   */
  async resume(): Promise<void> {
    try {
      await this.audio.play();
      this.status = 'playing';
      this.listener.onStatus('playing');
    } catch (error) {
      this.listener.onError(readPlaybackMessage(error));
    }
  }

  /**
   * Stops playback and ignores any chunk load that has not reached the audio element yet.
   *
   * @param options.silent - When true, listeners are not notified.
   */
  stop(options?: { silent?: boolean }): void {
    this.nextToken();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.status = 'idle';

    if (!options?.silent) {
      this.listener.onStatus('idle');
    }
  }

  /**
   * Detaches media listeners.
   */
  dispose(): void {
    this.disposed = true;
    this.stop({ silent: true });
    this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('error', this.handleError);
  }

  private async ensureChunk(plan: AnnotatedChunkPlan): Promise<StudioChunk> {
    const existing = this.chunks.get(plan.chunkIndex);

    if (existing) {
      return existing;
    }

    const loaded = await this.loadChunk(plan);
    this.chunks.set(plan.chunkIndex, loaded);
    return loaded;
  }

  private async prefetch(chunkIndex: number): Promise<void> {
    const plan = this.plans.find((item) => item.chunkIndex === chunkIndex);

    if (!plan || this.chunks.has(chunkIndex)) {
      return;
    }

    try {
      await this.ensureChunk(plan);
      this.prefetchFailure = null;
    } catch (error) {
      // Playback keeps going. The failure is stored so a later section can report it
      // instead of cutting off the audio that is already speaking.
      this.prefetchFailure = error instanceof Error ? error.message : 'The next section could not be prepared.';
    }
  }

  private handleTimeUpdate = (): void => {
    if (this.status !== 'playing') {
      return;
    }

    const plan = this.plans.find((item) => item.chunkIndex === this.chunkIndex);
    const chunk = this.chunks.get(this.chunkIndex);

    if (!plan || !chunk) {
      return;
    }

    const sentenceIndex = findSentenceIndexAtTime(
      chunk.textLength,
      chunk.alignment,
      plan.spans,
      this.audio.currentTime,
      Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
    );

    if (sentenceIndex !== null) {
      this.listener.onSentence(sentenceIndex);
    }
  };

  private handleEnded = (): void => {
    const nextPlan = this.plans.find((item) => item.chunkIndex === this.chunkIndex + 1);
    const firstSpan = nextPlan?.spans[0];

    if (!nextPlan || !firstSpan) {
      this.status = 'idle';
      this.listener.onStatus('idle');
      this.listener.onEnded();
      return;
    }

    void this.playFromSentence(firstSpan.sentenceIndex);
  };

  private handleError = (): void => {
    if (this.status === 'idle') {
      return;
    }

    this.status = 'idle';
    this.listener.onStatus('idle');
    this.listener.onError('Studio audio could not be played.');
  };

  private nextToken(): number {
    this.token += 1;
    return this.token;
  }
}

function waitForMetadata(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= 1) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      audio.removeEventListener('loadedmetadata', handleReady);
      audio.removeEventListener('error', handleError);
    };
    const handleReady = (): void => {
      cleanup();
      resolve();
    };
    const handleError = (): void => {
      cleanup();
      reject(new Error('Studio audio failed to load.'));
    };

    audio.addEventListener('loadedmetadata', handleReady);
    audio.addEventListener('error', handleError);
  });
}

function readPlaybackMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Press play again to start the audio.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Studio audio could not play.';
}
