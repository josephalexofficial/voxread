'use client';

import { useEffect, useRef } from 'react';

import { formatCount } from '@/common/utils/format';
import { groupSentencesByParagraph } from '@/features/reader/services/segment-text.service';
import type { PlaybackStatus, ReadingDocument } from '@/features/reader/types/reader.types';

interface ReadingSurfaceProps {
  document: ReadingDocument | null;
  cursor: number;
  status: PlaybackStatus;
  isImporting: boolean;
  onSelectSentence: (sentenceIndex: number) => void;
  onCreate: () => void;
  onUpload: () => void;
  onSample: () => void;
  onEdit: () => void;
}

const ORIGIN_LABELS: Record<ReadingDocument['origin'], string> = {
  paste: 'Pasted text',
  'text-file': 'Text file',
  pdf: 'PDF',
  sample: 'Sample passage',
};

/**
 * The page itself. The active sentence is highlighted and kept in view.
 *
 * @param props - Active reading and transport state.
 * @returns The reading column.
 */
export function ReadingSurface({
  document,
  cursor,
  status,
  isImporting,
  onSelectSentence,
  onCreate,
  onUpload,
  onSample,
  onEdit,
}: ReadingSurfaceProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const sentence = document?.sentences.find((item) => item.index === cursor);
    const node = sentence ? globalThis.document.getElementById(`sentence-${sentence.index}`) : null;

    if (!scroller || !node) {
      return;
    }

    const nodeRect = node.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const isVisible = nodeRect.top >= scrollerRect.top + 48 && nodeRect.bottom <= scrollerRect.bottom - 48;

    if (isVisible) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [cursor, document]);

  if (!document) {
    return (
      <div className="stage-scroller" ref={scrollerRef}>
        <section className="welcome">
          <p className="eyebrow">Accessible reading</p>
          <h1>Hear the page. Keep your place.</h1>
          <p className="welcome-copy">
            VoxRead turns text into speech and highlights each sentence as it is spoken. Preview with the voice
            already on this device, then render a studio voice only when you want to spend ElevenLabs credits.
          </p>
          <div className="welcome-actions">
            <button type="button" className="button button-primary" onClick={onCreate}>
              Paste text
            </button>
            <button type="button" className="button button-secondary" onClick={onUpload} disabled={isImporting}>
              {isImporting ? 'Reading file…' : 'Upload a file'}
            </button>
            <button type="button" className="button button-ghost" onClick={onSample}>
              Read the sample
            </button>
          </div>
          <p className="fine-print">Text files stay in this browser. Studio rendering is the only path that sends text to ElevenLabs.</p>
        </section>
      </div>
    );
  }

  const paragraphs = groupSentencesByParagraph(document.sentences);

  return (
    <div className="stage-scroller" ref={scrollerRef}>
      <article className="reading" aria-label={document.title}>
        <header className="reading-header">
          <p className="eyebrow">{ORIGIN_LABELS[document.origin]}</p>
          <div className="reading-title-row">
            <h1>{document.title}</h1>
            <button type="button" className="button button-ghost" onClick={onEdit}>
              Edit text
            </button>
          </div>
          <p className="reading-meta">
            {formatCount(document.sentences.length)} sentences · {formatCount(document.sourceText.length)} characters
          </p>
        </header>
        {paragraphs.map((paragraph) => (
          <p key={paragraph[0]?.index ?? 0} className="reading-paragraph">
            {paragraph.map((sentence) => {
              const isCurrent = sentence.index === cursor;

              return (
                <span
                  key={sentence.index}
                  id={`sentence-${sentence.index}`}
                  className={sentenceClassName(isCurrent, status)}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => {
                    const selection = window.getSelection();

                    if (selection && selection.toString().trim().length > 0) {
                      return;
                    }

                    onSelectSentence(sentence.index);
                  }}
                >
                  {sentence.text}{' '}
                </span>
              );
            })}
          </p>
        ))}
      </article>
    </div>
  );
}

function sentenceClassName(isCurrent: boolean, status: PlaybackStatus): string {
  if (!isCurrent) {
    return 'sentence';
  }

  if (status === 'playing' || status === 'loading') {
    return 'sentence is-current is-playing';
  }

  return 'sentence is-current';
}
