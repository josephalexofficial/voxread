'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiClientError } from '@/common/utils/api-client';
import { roundSetting } from '@/common/utils/format';
import { SAMPLE_DOCUMENT_ID } from '@/features/reader/constants/limits';
import { SAMPLE_PASSAGE, SAMPLE_TITLE } from '@/features/reader/constants/sample-passage';
import {
  deleteAudioCacheForDocument,
  findCachedKeys,
  readAudioCache,
  retainObjectUrl,
  revokeAllObjectUrls,
  saveAudioCache,
} from '@/features/reader/services/audio-cache.repository';
import { annotateChunkPlans, planSynthesisChunks } from '@/features/reader/services/chunk-plan.service';
import { decodeAudioBase64 } from '@/features/reader/services/decode-audio';
import { DeviceSpeechPlayer, type PlayerListener } from '@/features/reader/services/device-speech-player';
import { deleteDocument, listDocuments, saveDocument } from '@/features/reader/services/document.repository';
import { importReadingFile } from '@/features/reader/services/import-file.service';
import { readPreferences, savePreferences } from '@/features/reader/services/preferences.repository';
import { buildReadingDocument } from '@/features/reader/services/segment-text.service';
import { StudioAudioPlayer } from '@/features/reader/services/studio-audio-player';
import type {
  AnnotatedChunkPlan,
  DocumentOrigin,
  PlaybackEngine,
  PlaybackStatus,
  ReaderPreferences,
  ReadingDocument,
  StudioChunk,
} from '@/features/reader/types/reader.types';
import type { SynthesisModelId } from '@/features/synthesis/constants/models';
import { fetchUsage, fetchVoices, requestSynthesis } from '@/features/synthesis/services/synthesis-client.service';
import type { VoiceSummary } from '@/features/synthesis/types/synthesis.dto';

export interface StudioAvailability {
  status: 'loading' | 'ready' | 'unconfigured' | 'unavailable';
  message: string | null;
}

export interface RenderProgress {
  current: number;
  total: number;
}

/**
 * Owns the reading library, appearance, and both playback engines.
 *
 * @returns The view model for the reader shell.
 */
export function useReaderSession() {
  const [isReady, setIsReady] = useState(false);
  const [documents, setDocuments] = useState<ReadingDocument[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences | null>(null);
  const [cursor, setCursor] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [plans, setPlans] = useState<AnnotatedChunkPlan[]>([]);
  const [voices, setVoices] = useState<VoiceSummary[]>([]);
  const [studioAvailability, setStudioAvailability] = useState<StudioAvailability>({
    status: 'loading',
    message: null,
  });
  const [cachedCharacterCount, setCachedCharacterCount] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [rendering, setRendering] = useState<RenderProgress | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'create' | 'edit'>('create');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  const deviceRef = useRef<DeviceSpeechPlayer | null>(null);
  const studioRef = useRef<StudioAudioPlayer | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const plansRef = useRef<AnnotatedChunkPlan[]>([]);
  const preferencesRef = useRef<ReaderPreferences | null>(null);
  const documentRef = useRef<ReadingDocument | null>(null);
  const loadChunkRef = useRef<(plan: AnnotatedChunkPlan) => Promise<StudioChunk>>(async () => {
    throw new Error('Studio audio is not ready.');
  });
  const inflightRef = useRef<Map<string, Promise<StudioChunk>>>(new Map());
  const consentKeyRef = useRef<string | null>(null);
  const pendingSentenceRef = useRef<number | null>(null);
  const skipPreferenceSaveRef = useRef(true);

  const activeDocument = useMemo(() => {
    if (!preferences?.activeDocumentId) {
      return null;
    }

    return documents.find((document) => document.id === preferences.activeDocumentId) ?? null;
  }, [documents, preferences?.activeDocumentId]);

  const planSignature = plans.map((plan) => plan.cacheKey).join('|');
  const totalCharacterCount = plans.reduce((sum, plan) => sum + plan.characterCount, 0);
  const uncachedCharacterCount = Math.max(0, totalCharacterCount - cachedCharacterCount);

  plansRef.current = plans;
  preferencesRef.current = preferences;
  documentRef.current = activeDocument;

  const refreshCoverage = useCallback(async (nextPlans: readonly AnnotatedChunkPlan[]): Promise<void> => {
    const keys = await findCachedKeys(nextPlans.map((plan) => plan.cacheKey));
    const cached = nextPlans
      .filter((plan) => keys.has(plan.cacheKey))
      .reduce((sum, plan) => sum + plan.characterCount, 0);
    setCachedCharacterCount(cached);
  }, []);

  useEffect(() => {
    const listener: PlayerListener = {
      onStatus: (nextStatus) => setStatus(nextStatus),
      onSentence: (sentenceIndex) => {
        setCursor((current) => (current === sentenceIndex ? current : sentenceIndex));
      },
      onEnded: () => setStatus('idle'),
      onError: (message) => setBanner(message),
    };

    const devicePlayer = new DeviceSpeechPlayer(listener);
    const studioPlayer = new StudioAudioPlayer((plan) => loadChunkRef.current(plan), listener);
    deviceRef.current = devicePlayer;
    studioRef.current = studioPlayer;

    return () => {
      devicePlayer.dispose();
      studioPlayer.dispose();
      sampleAudioRef.current?.pause();
      revokeAllObjectUrls();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary(): Promise<void> {
      const [storedDocuments, storedPreferences] = await Promise.all([listDocuments(), readPreferences()]);

      if (cancelled) {
        return;
      }

      const activeStillExists = storedDocuments.some((document) => document.id === storedPreferences.activeDocumentId);
      setDocuments(storedDocuments);
      setPreferences(
        activeStillExists ? storedPreferences : { ...storedPreferences, activeDocumentId: null },
      );
      setIsReady(true);
    }

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStudio(): Promise<void> {
      try {
        const [nextVoices, nextUsage] = await Promise.all([fetchVoices(), fetchUsage()]);

        if (cancelled) {
          return;
        }

        setVoices(nextVoices);
        setStudioAvailability(
          nextUsage.remainingCharacters <= 0
            ? {
                status: 'unavailable',
                message: 'Studio voices are not available right now. Preview on this device still works.',
              }
            : { status: 'ready', message: null },
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiClientError && error.code === 'SERVICE_NOT_CONFIGURED') {
          setVoices([]);
          setStudioAvailability({ status: 'unconfigured', message: null });
          return;
        }

        const message = error instanceof Error ? error.message : 'Studio voices are unavailable.';
        setStudioAvailability({ status: 'unavailable', message });
      }
    }

    void loadStudio();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !preferences) {
      return;
    }

    if (skipPreferenceSaveRef.current) {
      skipPreferenceSaveRef.current = false;
      return;
    }

    void savePreferences(preferences);
  }, [isReady, preferences]);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    const root = document.documentElement;

    if (preferences.theme === 'system') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = preferences.theme;
    }

    root.dataset.contrast = preferences.isHighContrast ? 'high' : 'normal';
    root.dataset.font = preferences.isDyslexiaFont ? 'accessible' : 'editorial';
    root.dataset.scale = preferences.textScale;
    root.dataset.leading = preferences.lineHeight;
    deviceRef.current?.setRate(preferences.speed);
  }, [preferences]);

  useEffect(() => {
    if (!isReady || voices.length === 0) {
      return;
    }

    setPreferences((current) => {
      if (!current) {
        return current;
      }

      if (current.voiceId && voices.some((voice) => voice.id === current.voiceId)) {
        return current;
      }

      const firstVoice = voices[0];

      if (!firstVoice) {
        return current;
      }

      return { ...current, voiceId: firstVoice.id };
    });
  }, [isReady, voices]);

  const sentencesRef = useRef(activeDocument?.sentences ?? []);
  sentencesRef.current = activeDocument?.sentences ?? [];

  useEffect(() => {
    deviceRef.current?.setSentences(sentencesRef.current);
    setCursor(0);
    setStatus('idle');
  }, [activeDocument?.id, activeDocument?.updatedAt]);

  useEffect(() => {
    let cancelled = false;

    async function annotate(): Promise<void> {
      if (!activeDocument || !preferences?.voiceId) {
        setPlans([]);
        setCachedCharacterCount(0);
        return;
      }

      const nextPlans = await annotateChunkPlans(
        activeDocument.id,
        {
          voiceId: preferences.voiceId,
          modelId: preferences.modelId,
          stability: preferences.stability,
          similarityBoost: preferences.similarityBoost,
          speed: preferences.speed,
        },
        planSynthesisChunks(activeDocument.sentences),
      );

      if (cancelled) {
        return;
      }

      setPlans(nextPlans);
      await refreshCoverage(nextPlans);
    }

    void annotate();

    return () => {
      cancelled = true;
    };
  }, [
    activeDocument,
    preferences?.voiceId,
    preferences?.modelId,
    preferences?.stability,
    preferences?.similarityBoost,
    preferences?.speed,
    refreshCoverage,
  ]);

  useEffect(() => {
    studioRef.current?.setPlans(plansRef.current);

    if (preferencesRef.current?.playbackEngine === 'studio') {
      setStatus('idle');
    }
  }, [planSignature]);

  loadChunkRef.current = async (plan: AnnotatedChunkPlan): Promise<StudioChunk> => {
    const existing = inflightRef.current.get(plan.cacheKey);

    if (existing) {
      return existing;
    }

    const promise = loadStudioChunk(plan, documentRef.current, preferencesRef.current, () => {
      setRendering({ current: plan.chunkIndex + 1, total: plansRef.current.length });
    }).finally(() => {
      inflightRef.current.delete(plan.cacheKey);
      setRendering(null);
    });

    inflightRef.current.set(plan.cacheKey, promise);
    const chunk = await promise;
    await refreshCoverage(plansRef.current);
    return chunk;
  };

  const stopSample = useCallback((): void => {
    sampleAudioRef.current?.pause();
    sampleAudioRef.current = null;
  }, []);

  const playFrom = useCallback(
    async (sentenceIndex: number): Promise<void> => {
      if (!activeDocument || !preferences) {
        return;
      }

      stopSample();
      setBanner(null);

      if (preferences.playbackEngine === 'device') {
        studioRef.current?.stop({ silent: true });
        deviceRef.current?.playFromSentence(sentenceIndex);
        return;
      }

      if (studioAvailability.status === 'unconfigured' || !preferences.voiceId) {
        setBanner('Add ELEVENLABS_API_KEY to .env.local for studio voices. Device preview works without it.');
        return;
      }

      if (studioAvailability.status !== 'ready') {
        setBanner(studioAvailability.message ?? 'Studio voices are unavailable.');
        return;
      }

      const consentKey = `${activeDocument.id}:${planSignature}`;

      if (uncachedCharacterCount > 0 && consentKeyRef.current !== consentKey) {
        pendingSentenceRef.current = sentenceIndex;
        setIsConfirmOpen(true);
        return;
      }

      deviceRef.current?.stop({ silent: true });
      await studioRef.current?.playFromSentence(sentenceIndex);
    },
    [activeDocument, planSignature, preferences, stopSample, studioAvailability, uncachedCharacterCount],
  );

  const togglePlayback = useCallback((): void => {
    if (!activeDocument || !preferences) {
      return;
    }

    if (status === 'playing' || status === 'loading') {
      if (preferences.playbackEngine === 'device') {
        deviceRef.current?.pause();
        studioRef.current?.stop({ silent: true });
      } else {
        studioRef.current?.pause();
        deviceRef.current?.stop({ silent: true });
      }
      return;
    }

    if (status === 'paused') {
      if (preferences.playbackEngine === 'device') {
        deviceRef.current?.resume();
        return;
      }

      if (studioRef.current?.canResume()) {
        void studioRef.current.resume();
        return;
      }
    }

    void playFrom(cursor);
  }, [activeDocument, cursor, playFrom, preferences, status]);

  const stopReading = useCallback((): void => {
    stopSample();
    deviceRef.current?.stop({ silent: true });
    studioRef.current?.stop({ silent: true });
    setStatus('idle');
    setCursor(0);
  }, [stopSample]);

  const stepSentence = useCallback(
    (direction: -1 | 1): void => {
      if (!activeDocument) {
        return;
      }

      const nextIndex = Math.min(activeDocument.sentences.length - 1, Math.max(0, cursor + direction));

      if (status === 'playing' || status === 'loading') {
        void playFrom(nextIndex);
        return;
      }

      setCursor(nextIndex);
    },
    [activeDocument, cursor, playFrom, status],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isComposerOpen || isConfirmOpen || isShortcutsOpen || pendingDeleteId) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      if (event.key === 'Escape' && (status === 'playing' || status === 'paused' || status === 'loading')) {
        event.preventDefault();
        stopReading();
        return;
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepSentence(1);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepSentence(-1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComposerOpen, isConfirmOpen, isShortcutsOpen, pendingDeleteId, status, stepSentence, stopReading, togglePlayback]);

  function updatePreferences(patch: Partial<ReaderPreferences>): void {
    setPreferences((current) => (current ? { ...current, ...patch } : current));
  }

  function selectDocument(documentId: string): void {
    deviceRef.current?.stop({ silent: true });
    studioRef.current?.stop({ silent: true });
    setStatus('idle');
    setBanner(null);
    updatePreferences({ activeDocumentId: documentId });
    setIsLibraryOpen(false);
  }

  function storeDocument(document: ReadingDocument): string | null {
    void saveDocument(document);
    setDocuments((current) =>
      [document, ...current.filter((item) => item.id !== document.id)].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    );
    selectDocument(document.id);
    return null;
  }

  function createFromText(sourceText: string, title: string, origin: DocumentOrigin): string | null {
    const nowIso = new Date().toISOString();
    const built = buildReadingDocument({
      id: globalThis.crypto.randomUUID(),
      title,
      sourceText,
      origin,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (!built.ok) {
      return built.message;
    }

    setIsComposerOpen(false);
    return storeDocument(built.document);
  }

  function replaceActiveText(sourceText: string, title: string): string | null {
    if (!activeDocument) {
      return 'Open a reading first.';
    }

    const built = buildReadingDocument({
      id: activeDocument.id,
      title,
      sourceText,
      origin: activeDocument.origin,
      createdAt: activeDocument.createdAt,
      updatedAt: new Date().toISOString(),
    });

    if (!built.ok) {
      return built.message;
    }

    consentKeyRef.current = null;
    void deleteAudioCacheForDocument(activeDocument.id);
    setIsComposerOpen(false);
    return storeDocument(built.document);
  }

  function openSample(): void {
    const existing = documents.find((document) => document.id === SAMPLE_DOCUMENT_ID);

    if (existing) {
      selectDocument(existing.id);
      return;
    }

    const nowIso = new Date().toISOString();
    const built = buildReadingDocument({
      id: SAMPLE_DOCUMENT_ID,
      title: SAMPLE_TITLE,
      sourceText: SAMPLE_PASSAGE,
      origin: 'sample',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (!built.ok) {
      setBanner(built.message);
      return;
    }

    storeDocument(built.document);
  }

  async function importFile(file: File): Promise<void> {
    setIsImporting(true);
    setBanner(null);

    try {
      const imported = await importReadingFile(file);
      const message = createFromText(imported.text, imported.titleHint, imported.origin);

      if (message) {
        setBanner(message);
      }
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'That file could not be imported.');
    } finally {
      setIsImporting(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDeleteId) {
      return;
    }

    const documentId = pendingDeleteId;
    setPendingDeleteId(null);
    await deleteAudioCacheForDocument(documentId);
    await deleteDocument(documentId);
    setDocuments((current) => current.filter((document) => document.id !== documentId));

    if (preferencesRef.current?.activeDocumentId === documentId) {
      updatePreferences({ activeDocumentId: null });
      setStatus('idle');
    }
  }

  function confirmStudioRender(): void {
    if (!activeDocument) {
      setIsConfirmOpen(false);
      return;
    }

    consentKeyRef.current = `${activeDocument.id}:${planSignature}`;
    setIsConfirmOpen(false);
    const sentenceIndex = pendingSentenceRef.current ?? cursor;
    pendingSentenceRef.current = null;
    void playFrom(sentenceIndex);
  }

  function playVoiceSample(previewUrl: string): void {
    deviceRef.current?.stop({ silent: true });
    studioRef.current?.pause();
    setStatus('idle');
    stopSample();
    const audio = new Audio(previewUrl);
    sampleAudioRef.current = audio;
    void audio.play().catch(() => {
      setBanner('The voice sample could not play.');
    });
  }

  const selectedVoice = voices.find((voice) => voice.id === preferences?.voiceId) ?? null;

  return {
    isReady,
    documents,
    activeDocument,
    cursor,
    status,
    preferences,
    voices,
    selectedVoice,
    studioAvailability,
    cachedCharacterCount,
    totalCharacterCount,
    uncachedCharacterCount,
    rendering,
    banner,
    isImporting,
    isLibraryOpen,
    isStudioOpen,
    isComposerOpen,
    composerMode,
    isConfirmOpen,
    isShortcutsOpen,
    pendingDeleteId,
    dismissBanner: () => setBanner(null),
    setLibraryOpen: setIsLibraryOpen,
    setStudioOpen: setIsStudioOpen,
    openComposer: () => {
      setComposerMode('create');
      setIsComposerOpen(true);
    },
    openEditor: () => {
      setComposerMode('edit');
      setIsComposerOpen(true);
    },
    closeComposer: () => setIsComposerOpen(false),
    closeConfirm: () => {
      pendingSentenceRef.current = null;
      setIsConfirmOpen(false);
    },
    openShortcuts: () => setIsShortcutsOpen(true),
    closeShortcuts: () => setIsShortcutsOpen(false),
    askDelete: (documentId: string) => setPendingDeleteId(documentId),
    cancelDelete: () => setPendingDeleteId(null),
    confirmDelete,
    confirmStudioRender,
    selectDocument,
    createFromText,
    replaceActiveText,
    openSample,
    importFile,
    togglePlayback,
    stopReading,
    playFrom,
    stepSentence,
    placeCursor: (sentenceIndex: number) => setCursor(sentenceIndex),
    previewOnDevice: () => {
      const sentenceIndex = pendingSentenceRef.current ?? cursor;
      pendingSentenceRef.current = null;
      setIsConfirmOpen(false);
      studioRef.current?.stop({ silent: true });
      setPreferences((current) => (current ? { ...current, playbackEngine: 'device' } : current));
      deviceRef.current?.playFromSentence(sentenceIndex);
    },
    setEngine: (playbackEngine: PlaybackEngine) => {
      deviceRef.current?.stop({ silent: true });
      studioRef.current?.stop({ silent: true });
      setStatus('idle');
      updatePreferences({ playbackEngine });
    },
    setVoiceId: (voiceId: string) => updatePreferences({ voiceId }),
    setModelId: (modelId: SynthesisModelId) => updatePreferences({ modelId }),
    setStability: (stability: number) => updatePreferences({ stability: roundSetting(stability) }),
    setSimilarity: (similarityBoost: number) => updatePreferences({ similarityBoost: roundSetting(similarityBoost) }),
    setSpeed: (speed: number) => updatePreferences({ speed: roundSetting(speed) }),
    setTheme: (theme: ReaderPreferences['theme']) => updatePreferences({ theme }),
    setHighContrast: (isHighContrast: boolean) => updatePreferences({ isHighContrast }),
    setDyslexiaFont: (isDyslexiaFont: boolean) => updatePreferences({ isDyslexiaFont }),
    setTextScale: (textScale: ReaderPreferences['textScale']) => updatePreferences({ textScale }),
    setLineHeight: (lineHeight: ReaderPreferences['lineHeight']) => updatePreferences({ lineHeight }),
    playVoiceSample,
  };
}

async function loadStudioChunk(
  plan: AnnotatedChunkPlan,
  document: ReadingDocument | null,
  preferences: ReaderPreferences | null,
  onMiss: () => void,
): Promise<StudioChunk> {
  const cached = await readAudioCache(plan.cacheKey);

  if (cached) {
    return {
      chunkIndex: plan.chunkIndex,
      audioUrl: retainObjectUrl(plan.cacheKey, cached.documentId, cached.blob),
      alignment: cached.alignment,
      textLength: cached.textLength,
    };
  }

  if (!document || !preferences?.voiceId) {
    throw new Error('Choose a studio voice first.');
  }

  onMiss();
  const result = await requestSynthesis(
    {
      text: plan.text,
      voiceId: preferences.voiceId,
      modelId: preferences.modelId,
      voiceSettings: {
        stability: roundSetting(preferences.stability),
        similarityBoost: roundSetting(preferences.similarityBoost),
        speed: roundSetting(preferences.speed),
      },
    },
    plan.cacheKey,
  );
  const blob = decodeAudioBase64(result.audioBase64);

  await saveAudioCache({
    cacheKey: plan.cacheKey,
    documentId: document.id,
    blob,
    alignment: result.alignment,
    textLength: plan.text.length,
    createdAt: new Date().toISOString(),
  });

  return {
    chunkIndex: plan.chunkIndex,
    audioUrl: retainObjectUrl(plan.cacheKey, document.id, blob),
    alignment: result.alignment,
    textLength: plan.text.length,
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable;
}
