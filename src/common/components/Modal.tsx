'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Native dialog with a focus trap. Escape and the close button dismiss it.
 *
 * @param props.isOpen - Whether the dialog should be shown.
 * @param props.title - Accessible heading.
 * @param props.description - Optional supporting line.
 * @param props.className - Optional class for a dialog that needs its own width.
 * @param props.onClose - Called for Escape and the close button.
 * @param props.children - Dialog body.
 * @returns A modal, or a closed dialog when inactive.
 */
export function Modal({ isOpen, title, description, className, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog || !isOpen) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className={className ? `modal ${className}` : 'modal'}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-card">
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description ? <p className="modal-description">{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
