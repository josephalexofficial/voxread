import type { PlaybackStatus, ReadingSentence } from '@/features/reader/types/reader.types';

export interface PlayerListener {
  onStatus: (status: PlaybackStatus) => void;
  onSentence: (sentenceIndex: number) => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

/**
 * Speaks one sentence at a time with the browser voice.
 * Pause cancels the utterance instead of calling speechSynthesis.pause, because Chrome
 * can leave that paused engine silent after the tab has been in the background.
 */
export class DeviceSpeechPlayer {
  private sentences: ReadingSentence[] = [];
  private cursor = 0;
  private status: PlaybackStatus = 'idle';
  private rate = 1;
  private token = 0;
  private disposed = false;

  constructor(private readonly listener: PlayerListener) {}

  /**
   * Replaces the sentence list and stops any current preview.
   *
   * @param sentences - Sentences for the active reading.
   */
  setSentences(sentences: readonly ReadingSentence[]): void {
    this.stop({ silent: true });
    this.sentences = [...sentences];
  }

  /**
   * Sets the rate used by the next utterance.
   *
   * @param rate - Speech synthesis rate. 1 is normal speed.
   */
  setRate(rate: number): void {
    if (Number.isFinite(rate) && rate > 0) {
      this.rate = rate;
    }
  }

  /**
   * Starts preview at a sentence.
   *
   * @param sentenceIndex - Index inside the active document.
   */
  playFromSentence(sentenceIndex: number): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.listener.onError('This browser has no device voice. Studio rendering is the other path.');
      return;
    }

    this.token += 1;
    this.cursor = this.findCursor(sentenceIndex);
    this.speakCurrent(this.token);
  }

  /**
   * Stops the current utterance and keeps the cursor where it is.
   */
  pause(): void {
    this.status = 'paused';
    this.token += 1;
    window.speechSynthesis?.cancel();
    this.listener.onStatus('paused');
  }

  /**
   * Speaks the current sentence again. Restarting is more reliable than resume.
   */
  resume(): void {
    this.token += 1;
    this.speakCurrent(this.token);
  }

  /**
   * Stops preview and marks the player idle.
   *
   * @param options.silent - When true, listeners are not notified. Used while swapping documents.
   */
  stop(options?: { silent?: boolean }): void {
    this.token += 1;
    this.status = 'idle';

    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }

    if (!options?.silent) {
      this.listener.onStatus('idle');
    }
  }

  /**
   * Releases the player.
   */
  dispose(): void {
    this.disposed = true;
    this.stop({ silent: true });
  }

  private speakCurrent(token: number): void {
    if (this.disposed || token !== this.token) {
      return;
    }

    const sentence = this.sentences[this.cursor];

    if (!sentence || !window.speechSynthesis) {
      this.status = 'idle';
      this.listener.onStatus('idle');
      this.listener.onEnded();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentence.text);
    utterance.rate = this.rate;

    utterance.onstart = () => {
      if (token !== this.token) {
        return;
      }

      this.status = 'playing';
      this.listener.onStatus('playing');
      this.listener.onSentence(sentence.index);
    };

    utterance.onend = () => {
      if (this.disposed || token !== this.token || this.status !== 'playing') {
        return;
      }

      this.cursor += 1;
      this.speakCurrent(token);
    };

    utterance.onerror = (event) => {
      if (token !== this.token || event.error === 'canceled' || event.error === 'interrupted') {
        return;
      }

      this.status = 'idle';
      this.listener.onStatus('idle');
      this.listener.onError('The device voice stopped unexpectedly.');
    };

    this.status = 'loading';
    this.listener.onStatus('loading');
    window.speechSynthesis.cancel();

    // Chrome drops an utterance that is spoken in the same turn as cancel().
    window.setTimeout(() => {
      if (this.disposed || token !== this.token) {
        return;
      }

      window.speechSynthesis.speak(utterance);
    }, 40);
  }

  private findCursor(sentenceIndex: number): number {
    const found = this.sentences.findIndex((sentence) => sentence.index === sentenceIndex);
    return found >= 0 ? found : 0;
  }
}
