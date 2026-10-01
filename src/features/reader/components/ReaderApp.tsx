'use client';

import { useRef } from 'react';

import { BrandMark } from '@/common/components/BrandMark';
import { LibraryRail } from '@/features/reader/components/LibraryRail';
import { PlayerDock } from '@/features/reader/components/PlayerDock';
import { ReadingSurface } from '@/features/reader/components/ReadingSurface';
import {
  ComposerDialog,
  ConfirmDeleteDialog,
  ConfirmRenderDialog,
  ShortcutsDialog,
} from '@/features/reader/components/ReaderDialogs';
import { StudioPanel } from '@/features/reader/components/StudioPanel';
import { useReaderSession } from '@/features/reader/hooks/useReaderSession';

/**
 * The VoxRead shell: library, reading surface, studio controls, and player.
 *
 * @returns The application.
 */
export function ReaderApp() {
  const session = useReaderSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preferences = session.preferences;

  if (!session.isReady || !preferences) {
    return (
      <div className="shell">
        <p className="pane-loading">Opening your library…</p>
      </div>
    );
  }

  function openFilePicker(): void {
    fileInputRef.current?.click();
  }

  async function handleFileChange(fileList: FileList | null): Promise<void> {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    await session.importFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const deleteTarget = session.documents.find((document) => document.id === session.pendingDeleteId) ?? null;

  return (
    <div className="shell">
      <a className="skip-link" href="#reading">
        Skip to reading
      </a>
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <div>
            <p className="brand-name">VoxRead</p>
            <p className="brand-kicker">Audio reader</p>
          </div>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className="button button-ghost show-compact"
            aria-expanded={session.isLibraryOpen}
            onClick={() => session.setLibraryOpen(!session.isLibraryOpen)}
          >
            Library
          </button>
          <button
            type="button"
            className="button button-ghost show-compact"
            aria-expanded={session.isStudioOpen}
            onClick={() => session.setStudioOpen(!session.isStudioOpen)}
          >
            Voice
          </button>
          <button type="button" className="button button-ghost" onClick={session.openShortcuts}>
            Shortcuts
          </button>
        </div>
      </header>

      {session.banner ? (
        <div className="banner" role="alert">
          <p>{session.banner}</p>
          <button type="button" className="text-button" onClick={session.dismissBanner}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="workspace">
        {session.isLibraryOpen ? (
          <button type="button" className="backdrop show-compact" aria-label="Close library" onClick={() => session.setLibraryOpen(false)} />
        ) : null}
        <aside className={session.isLibraryOpen ? 'drawer drawer-left is-open' : 'drawer drawer-left'} aria-label="Library">
          <LibraryRail
            documents={session.documents}
            activeDocumentId={session.activeDocument?.id ?? null}
            isImporting={session.isImporting}
            onCreate={session.openComposer}
            onUpload={openFilePicker}
            onSample={session.openSample}
            onSelect={session.selectDocument}
            onDelete={session.askDelete}
          />
        </aside>
        <main className="stage" id="reading">
          <ReadingSurface
            document={session.activeDocument}
            cursor={session.cursor}
            status={session.status}
            isImporting={session.isImporting}
            onSelectSentence={(sentenceIndex) => {
              void session.playFrom(sentenceIndex);
            }}
            onCreate={session.openComposer}
            onUpload={openFilePicker}
            onSample={session.openSample}
            onEdit={session.openEditor}
          />
        </main>
        {session.isStudioOpen ? (
          <button type="button" className="backdrop show-compact" aria-label="Close voice settings" onClick={() => session.setStudioOpen(false)} />
        ) : null}
        <aside className={session.isStudioOpen ? 'drawer drawer-right is-open' : 'drawer drawer-right'} aria-label="Voice and display">
          <StudioPanel
              preferences={preferences}
              voices={session.voices}
              selectedVoice={session.selectedVoice}
              studioAvailability={session.studioAvailability}
              cachedCharacterCount={session.cachedCharacterCount}
              totalCharacterCount={session.totalCharacterCount}
              onVoiceChange={session.setVoiceId}
              onModelChange={session.setModelId}
              onStability={session.setStability}
              onSimilarity={session.setSimilarity}
              onSpeed={session.setSpeed}
              onTheme={session.setTheme}
              onHighContrast={session.setHighContrast}
              onDyslexiaFont={session.setDyslexiaFont}
              onTextScale={session.setTextScale}
              onLineHeight={session.setLineHeight}
              onPlaySample={session.playVoiceSample}
            />
        </aside>
      </div>

      <PlayerDock
        title={session.activeDocument?.title ?? null}
        sentenceCount={session.activeDocument?.sentences.length ?? 0}
        cursor={session.cursor}
        status={session.status}
        engine={preferences.playbackEngine}
        rendering={session.rendering}
        onToggle={session.togglePlayback}
        onStop={session.stopReading}
        onPrevious={() => session.stepSentence(-1)}
        onNext={() => session.stepSentence(1)}
        onSeek={(sentenceIndex) => {
          void session.playFrom(sentenceIndex);
        }}
        onPlace={session.placeCursor}
        onEngine={session.setEngine}
      />

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
        onChange={(event) => {
          void handleFileChange(event.target.files);
        }}
      />

      <ComposerDialog
        isOpen={session.isComposerOpen}
        mode={session.composerMode}
        document={session.activeDocument}
        onClose={session.closeComposer}
        onCreate={(sourceText, title) => session.createFromText(sourceText, title, 'paste')}
        onReplace={session.replaceActiveText}
      />
      <ConfirmRenderDialog
        isOpen={session.isConfirmOpen}
        uncachedCharacterCount={session.uncachedCharacterCount}
        onClose={session.closeConfirm}
        onConfirm={session.confirmStudioRender}
        onPreview={session.previewOnDevice}
      />
      <ConfirmDeleteDialog
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.title ?? ''}
        onClose={session.cancelDelete}
        onConfirm={() => {
          void session.confirmDelete();
        }}
      />
      <ShortcutsDialog isOpen={session.isShortcutsOpen} onClose={session.closeShortcuts} />
    </div>
  );
}
