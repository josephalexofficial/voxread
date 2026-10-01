'use client';

import { formatCount, formatUpdatedAt } from '@/common/utils/format';
import type { ReadingDocument } from '@/features/reader/types/reader.types';

interface LibraryRailProps {
  documents: ReadingDocument[];
  activeDocumentId: string | null;
  isImporting: boolean;
  onCreate: () => void;
  onUpload: () => void;
  onSample: () => void;
  onSelect: (documentId: string) => void;
  onDelete: (documentId: string) => void;
}

const ORIGIN_LABELS: Record<ReadingDocument['origin'], string> = {
  paste: 'Pasted',
  'text-file': 'Text file',
  pdf: 'PDF',
  sample: 'Sample',
};

/**
 * Saved readings for the current browser.
 *
 * @param props - Library actions and the active id.
 * @returns The library pane.
 */
export function LibraryRail({
  documents,
  activeDocumentId,
  isImporting,
  onCreate,
  onUpload,
  onSample,
  onSelect,
  onDelete,
}: LibraryRailProps) {
  const nowMs = Date.now();

  return (
    <div className="pane-inner">
      <div className="pane-heading">
        <p className="eyebrow">Library</p>
        <h2>Readings</h2>
      </div>
      <div className="button-stack">
        <button type="button" className="button button-primary" onClick={onCreate}>
          Paste text
        </button>
        <button type="button" className="button button-secondary" onClick={onUpload} disabled={isImporting}>
          {isImporting ? 'Reading file…' : 'Upload file'}
        </button>
        <button type="button" className="button button-ghost" onClick={onSample}>
          Read the sample
        </button>
      </div>
      {documents.length === 0 ? (
        <p className="empty-copy">Nothing saved in this browser yet.</p>
      ) : (
        <ul className="library-list">
          {documents.map((document) => {
            const isActive = document.id === activeDocumentId;

            return (
              <li key={document.id}>
                <button
                  type="button"
                  className={isActive ? 'library-item is-active' : 'library-item'}
                  onClick={() => onSelect(document.id)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="library-title">{document.title}</span>
                  <span className="library-meta">
                    {ORIGIN_LABELS[document.origin]} · {formatCount(document.sentences.length)} sentences ·{' '}
                    {formatUpdatedAt(document.updatedAt, nowMs)}
                  </span>
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onDelete(document.id)}
                  aria-label={`Remove ${document.title}`}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
