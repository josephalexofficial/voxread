'use client';

import { useState } from 'react';

import { Modal } from '@/common/components/Modal';
import { formatCount } from '@/common/utils/format';
import { MAX_DOCUMENT_CHARACTERS } from '@/features/reader/constants/limits';
import type { ReadingDocument } from '@/features/reader/types/reader.types';

interface ComposerDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  document: ReadingDocument | null;
  onClose: () => void;
  onCreate: (sourceText: string, title: string) => string | null;
  onReplace: (sourceText: string, title: string) => string | null;
}

/**
 * Collects pasted text for a new or replacement reading.
 *
 * @param props - Composer mode and save handlers. Handlers return an error message, or null on success.
 * @returns The composer dialog.
 */
export function ComposerDialog({ isOpen, mode, document, onClose, onCreate, onReplace }: ComposerDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={mode === 'edit' ? 'Edit this reading' : 'Start a reading'}
      description="Paragraph breaks are kept. The library stays in this browser."
      onClose={onClose}
    >
      {isOpen ? (
        <ComposerForm
          key={mode === 'edit' ? document?.updatedAt ?? 'edit' : 'create'}
          mode={mode}
          document={document}
          onCreate={onCreate}
          onReplace={onReplace}
        />
      ) : null}
    </Modal>
  );
}

function ComposerForm({
  mode,
  document,
  onCreate,
  onReplace,
}: Omit<ComposerDialogProps, 'isOpen' | 'onClose'>) {
  const [title, setTitle] = useState(mode === 'edit' ? document?.title ?? '' : '');
  const [sourceText, setSourceText] = useState(mode === 'edit' ? document?.sourceText ?? '' : '');
  const [message, setMessage] = useState<string | null>(null);
  const characterCount = sourceText.trim().length;
  const isOverLimit = characterCount > MAX_DOCUMENT_CHARACTERS;

  return (
    <form
      className="composer-form"
      onSubmit={(event) => {
        event.preventDefault();
        const result = mode === 'edit' ? onReplace(sourceText, title) : onCreate(sourceText, title);
        setMessage(result);
      }}
    >
      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Optional. The first line is used otherwise."
        />
      </label>
      <label className="field">
        <span>Text</span>
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          rows={12}
          required
          placeholder="Paste an article, notes, or a chapter excerpt."
        />
      </label>
      <p className={isOverLimit ? 'fine-print is-warn' : 'fine-print'}>
        {formatCount(characterCount)} / {formatCount(MAX_DOCUMENT_CHARACTERS)} characters
      </p>
      {message ? (
        <p className="notice notice-warn" role="alert">
          {message}
        </p>
      ) : null}
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={isOverLimit || characterCount === 0}>
          {mode === 'edit' ? 'Save reading' : 'Start reading'}
        </button>
      </div>
    </form>
  );
}

interface ConfirmRenderDialogProps {
  isOpen: boolean;
  uncachedCharacterCount: number;
  onClose: () => void;
  onConfirm: () => void;
  onPreview: () => void;
}

/**
 * Explains the credit cost before the first studio render of a voice.
 *
 * @param props - Uncached character count and the two choices.
 * @returns The confirmation dialog.
 */
export function ConfirmRenderDialog({
  isOpen,
  uncachedCharacterCount,
  onClose,
  onConfirm,
  onPreview,
}: ConfirmRenderDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Render this with ElevenLabs?"
      description="Studio audio is created one section at a time, only as you listen."
      onClose={onClose}
    >
      <p className="dialog-copy">
        If you listen to the end, this voice will use about {formatCount(uncachedCharacterCount)} new characters.
        Stopping early leaves the rest unspent. Cached sections play again for free. The text in each rendered
        section is sent to ElevenLabs.
      </p>
      <div className="dialog-actions">
        <button type="button" className="button button-secondary" onClick={onPreview}>
          Preview on this device
        </button>
        <button type="button" className="button button-primary" onClick={onConfirm}>
          Render studio audio
        </button>
      </div>
    </Modal>
  );
}

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirms removal of a reading and its cached audio.
 *
 * @param props - Reading title and confirm action.
 * @returns The delete dialog.
 */
export function ConfirmDeleteDialog({ isOpen, title, onClose, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <Modal isOpen={isOpen} title="Remove this reading?" description={title} onClose={onClose}>
      <p className="dialog-copy">The text and any studio audio saved for it will leave this browser.</p>
      <div className="dialog-actions">
        <button type="button" className="button button-secondary" onClick={onClose}>
          Keep it
        </button>
        <button type="button" className="button button-danger" onClick={onConfirm}>
          Remove
        </button>
      </div>
    </Modal>
  );
}

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Lists the keyboard controls.
 *
 * @param props - Open state and dismiss handler.
 * @returns The shortcut dialog.
 */
const SHORTCUTS = [
  {
    id: 'play',
    action: 'Play or pause',
    label: 'Space',
    keys: [{ text: 'Space', wide: true }],
  },
  {
    id: 'stop',
    action: 'Stop and return to the first sentence',
    label: 'Escape',
    keys: [{ text: 'Esc' }],
  },
  {
    id: 'move',
    action: 'Previous or next sentence',
    label: 'Left or Right',
    keys: [{ text: 'Left' }, { text: 'Right' }],
  },
  {
    id: 'help',
    action: 'Open this list',
    label: 'Question mark',
    keys: [{ text: '?' }],
  },
] as const;

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Shortcuts"
      description="Available while a reading is open."
      className="modal-shortcuts"
      onClose={onClose}
    >
      <dl className="shortcut-sheet">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.id}>
            <dt>
              <span className="shortcut-keys" aria-label={shortcut.label}>
                {shortcut.keys.map((key) => (
                  <kbd key={key.text} className={'wide' in key && key.wide ? 'kbd kbd-wide' : 'kbd'} aria-hidden="true">
                    {key.text}
                  </kbd>
                ))}
              </span>
            </dt>
            <dd>{shortcut.action}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
