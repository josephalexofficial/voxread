'use client';

import type { CSSProperties } from 'react';

import type { RenderProgress } from '@/features/reader/hooks/useReaderSession';
import type { PlaybackEngine, PlaybackStatus } from '@/features/reader/types/reader.types';

interface PlayerDockProps {
  title: string | null;
  sentenceCount: number;
  cursor: number;
  status: PlaybackStatus;
  engine: PlaybackEngine;
  rendering: RenderProgress | null;
  onToggle: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (sentenceIndex: number) => void;
  onPlace: (sentenceIndex: number) => void;
  onEngine: (engine: PlaybackEngine) => void;
}

/**
 * Transport for preview and studio playback.
 *
 * @param props - Playback position and actions.
 * @returns The fixed player dock.
 */
export function PlayerDock({
  title,
  sentenceCount,
  cursor,
  status,
  engine,
  rendering,
  onToggle,
  onStop,
  onPrevious,
  onNext,
  onSeek,
  onPlace,
  onEngine,
}: PlayerDockProps) {
  const hasReading = sentenceCount > 0;
  const isActive = status === 'playing' || status === 'loading' || Boolean(rendering);
  const canStop = hasReading && (status !== 'idle' || cursor !== 0);
  const playLabel = isActive ? 'Pause' : status === 'paused' ? 'Resume' : 'Play';
  const sentenceLabel = hasReading ? `Sentence ${cursor + 1} of ${sentenceCount}` : 'No reading open';
  const statusLabel = rendering
    ? `Rendering section ${rendering.current} of ${rendering.total}`
    : status === 'playing'
      ? 'Playing'
      : status === 'paused'
        ? 'Paused'
        : status === 'loading'
          ? 'Preparing audio'
          : 'Ready';

  return (
    <footer className="dock">
      <div className="transport">
        <button type="button" className="icon-button" onClick={onPrevious} disabled={!hasReading} aria-label="Previous sentence">
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className="play-button"
          onClick={onToggle}
          disabled={!hasReading}
          aria-label={playLabel}
          aria-pressed={isActive}
        >
          {status === 'loading' || rendering ? <span className="spinner" aria-hidden="true" /> : null}
          {status !== 'loading' && !rendering ? <span aria-hidden="true">{isActive ? '❚❚' : '▶'}</span> : null}
          <span className="play-caption">{playLabel}</span>
        </button>
        <button
          type="button"
          className="stop-button"
          onClick={onStop}
          disabled={!canStop}
          aria-label="Stop and return to the beginning"
        >
          <span className="stop-mark" aria-hidden="true" />
          Stop
        </button>
        <button type="button" className="icon-button" onClick={onNext} disabled={!hasReading} aria-label="Next sentence">
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="dock-progress">
        <div className="dock-labels">
          <p>{title ?? 'VoxRead'}</p>
          <p>
            {sentenceLabel}
            <span> · {statusLabel}</span>
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, sentenceCount - 1)}
          value={hasReading ? cursor : 0}
          disabled={!hasReading}
          aria-label="Reading position"
          aria-valuetext={sentenceLabel}
          className="range-control"
          style={{ '--slider-fill': `${sentenceCount <= 1 ? 0 : (cursor / (sentenceCount - 1)) * 100}%` } as CSSProperties}
          onChange={(event) => onPlace(Number(event.target.value))}
          onPointerUp={(event) => {
            if (status === 'playing' || status === 'paused') {
              onSeek(Number(event.currentTarget.value));
            }
          }}
          onKeyUp={(event) => {
            if (status === 'playing' || status === 'paused') {
              onSeek(Number(event.currentTarget.value));
            }
          }}
        />
        <p className="fine-print">
          {engine === 'device'
            ? 'Preview uses the voice on this device.'
            : 'Studio renders a new section only as you reach it.'}
        </p>
      </div>
      <div className="segmented dock-engine" role="group" aria-label="Playback engine">
        <button type="button" aria-pressed={engine === 'device'} className={engine === 'device' ? 'is-selected' : undefined} onClick={() => onEngine('device')}>
          Preview
        </button>
        <button type="button" aria-pressed={engine === 'studio'} className={engine === 'studio' ? 'is-selected' : undefined} onClick={() => onEngine('studio')}>
          Studio
        </button>
      </div>
    </footer>
  );
}
