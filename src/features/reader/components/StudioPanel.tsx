'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import { formatCount } from '@/common/utils/format';
import type { StudioAvailability } from '@/features/reader/hooks/useReaderSession';
import type { LineHeightPreference, ReaderPreferences, TextScale, ThemePreference } from '@/features/reader/types/reader.types';
import { SYNTHESIS_MODELS, type SynthesisModelId } from '@/features/synthesis/constants/models';
import type { VoiceSummary } from '@/features/synthesis/types/synthesis.dto';

interface StudioPanelProps {
  preferences: ReaderPreferences;
  voices: VoiceSummary[];
  selectedVoice: VoiceSummary | null;
  studioAvailability: StudioAvailability;
  cachedCharacterCount: number;
  totalCharacterCount: number;
  onVoiceChange: (voiceId: string) => void;
  onModelChange: (modelId: SynthesisModelId) => void;
  onStability: (value: number) => void;
  onSimilarity: (value: number) => void;
  onSpeed: (value: number) => void;
  onTheme: (theme: ThemePreference) => void;
  onHighContrast: (isHighContrast: boolean) => void;
  onDyslexiaFont: (isDyslexiaFont: boolean) => void;
  onTextScale: (textScale: TextScale) => void;
  onLineHeight: (lineHeight: LineHeightPreference) => void;
  onPlaySample: (previewUrl: string) => void;
}

/**
 * Voice, model, and display controls.
 *
 * @param props - Current settings and the studio account state.
 * @returns The studio pane.
 */
export function StudioPanel({
  preferences,
  voices,
  selectedVoice,
  studioAvailability,
  cachedCharacterCount,
  totalCharacterCount,
  onVoiceChange,
  onModelChange,
  onStability,
  onSimilarity,
  onSpeed,
  onTheme,
  onHighContrast,
  onDyslexiaFont,
  onTextScale,
  onLineHeight,
  onPlaySample,
}: StudioPanelProps) {
  const preparedRatio = totalCharacterCount > 0 ? Math.min(1, cachedCharacterCount / totalCharacterCount) : 0;

  return (
    <div className="pane-inner">
      <div className="pane-heading">
        <p className="eyebrow">Studio</p>
        <h2>Voice and display</h2>
      </div>

      {studioAvailability.status === 'unconfigured' ? (
        <p className="notice">
          Studio voices are not set up on this copy. Preview on this device still works.
        </p>
      ) : null}
      {studioAvailability.status === 'unavailable' ? <p className="notice notice-warn">{studioAvailability.message}</p> : null}
      {studioAvailability.status === 'loading' ? <p className="notice">Checking studio voices…</p> : null}

      <label className="field">
        <span>Voice</span>
        <select
          value={preferences.voiceId ?? ''}
          onChange={(event) => onVoiceChange(event.target.value)}
          disabled={voices.length === 0}
        >
          {voices.length === 0 ? <option value="">No studio voice yet</option> : null}
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
              {voice.accent ? ` · ${voice.accent}` : ''}
            </option>
          ))}
        </select>
      </label>
      {selectedVoice?.previewUrl ? (
        <button type="button" className="text-button" onClick={() => onPlaySample(selectedVoice.previewUrl ?? '')}>
          Play voice sample
        </button>
      ) : null}

      <fieldset className="choice-set">
        <legend>Model</legend>
        {SYNTHESIS_MODELS.map((model) => (
          <label key={model.id} className="choice">
            <input
              type="radio"
              name="model"
              value={model.id}
              checked={preferences.modelId === model.id}
              onChange={() => onModelChange(model.id)}
            />
            <span>
              <strong>{model.label}</strong>
              <small>{model.description}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <SettingSlider
        label="Stability"
        min={0}
        max={1}
        step={0.05}
        value={preferences.stability}
        format={(next) => next.toFixed(2)}
        onCommit={onStability}
      />
      <SettingSlider
        label="Similarity"
        min={0}
        max={1}
        step={0.05}
        value={preferences.similarityBoost}
        format={(next) => next.toFixed(2)}
        onCommit={onSimilarity}
      />
      <SettingSlider
        label="Speed"
        min={0.8}
        max={1.2}
        step={0.05}
        value={preferences.speed}
        format={(next) => `${next.toFixed(2)}×`}
        onCommit={onSpeed}
      />
      <p className="fine-print">
        Stability 0.50 holds a steady tone. Similarity 0.75 stays close to the selected voice. Speed 1.00× is the natural
        pace. Studio speed is fixed when a section is rendered. Preview speed changes immediately.
      </p>

      {totalCharacterCount > 0 ? (
        <div className="meter">
          <div className="meter-label">
            <span>Prepared for this voice</span>
            <strong>
              {formatCount(cachedCharacterCount)} / {formatCount(totalCharacterCount)}
            </strong>
          </div>
          <div
            className="meter-track"
            role="meter"
            aria-label="Prepared for this voice"
            aria-valuemin={0}
            aria-valuemax={totalCharacterCount}
            aria-valuenow={cachedCharacterCount}
            aria-valuetext={`${formatCount(cachedCharacterCount)} of ${formatCount(totalCharacterCount)} characters already rendered in this browser`}
          >
            <span style={{ width: `${preparedRatio * 100}%` }} />
          </div>
          <p className="fine-print">Already rendered for this voice, and kept in this browser.</p>
        </div>
      ) : null}

      <div className="display-block">
        <p className="eyebrow">Display</p>
        <div className="segmented" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              aria-pressed={preferences.theme === theme}
              className={preferences.theme === theme ? 'is-selected' : undefined}
              onClick={() => onTheme(theme)}
            >
              {theme}
            </button>
          ))}
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={preferences.isHighContrast}
            onChange={(event) => onHighContrast(event.target.checked)}
          />
          High contrast
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={preferences.isDyslexiaFont}
            onChange={(event) => onDyslexiaFont(event.target.checked)}
          />
          Dyslexia-friendly type
        </label>
        <label className="field">
          <span>Text size</span>
          <select value={preferences.textScale} onChange={(event) => onTextScale(event.target.value as TextScale)}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </label>
        <label className="field">
          <span>Line spacing</span>
          <select
            value={preferences.lineHeight}
            onChange={(event) => onLineHeight(event.target.value as LineHeightPreference)}
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </label>
      </div>
    </div>
  );
}

interface SettingSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (value: number) => string;
  onCommit: (value: number) => void;
}

function SettingSlider({ label, min, max, step, value, format, onCommit }: SettingSliderProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const span = max - min;
  const ratio = span === 0 ? 0 : Math.min(1, Math.max(0, (draft - min) / span));
  const display = format(draft);

  return (
    <label className="field">
      <span className="slider-label">
        {label}
        <strong>{display}</strong>
      </span>
      <input
        className="range-control"
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-valuetext={display}
        style={{ '--slider-fill': `${ratio * 100}%` } as CSSProperties}
        onChange={(event) => setDraft(Number(event.currentTarget.value))}
        onPointerUp={(event) => onCommit(Number(event.currentTarget.value))}
        onKeyUp={(event) => onCommit(Number(event.currentTarget.value))}
        onBlur={(event) => onCommit(Number(event.currentTarget.value))}
      />
    </label>
  );
}
