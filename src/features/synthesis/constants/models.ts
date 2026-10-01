export const SYNTHESIS_MODEL_IDS = ['eleven_flash_v2_5', 'eleven_multilingual_v2'] as const;

export type SynthesisModelId = (typeof SYNTHESIS_MODEL_IDS)[number];

export const SYNTHESIS_MODELS: ReadonlyArray<{
  id: SynthesisModelId;
  label: string;
  description: string;
}> = [
  {
    id: 'eleven_flash_v2_5',
    label: 'Flash',
    description: 'The faster studio voice, and it costs less per character. This is the default for everyday reading.',
  },
  {
    id: 'eleven_multilingual_v2',
    label: 'Multilingual',
    description: 'The fuller studio voice. It takes longer and costs more per character, for a reading that should sound finished.',
  },
];

export const DEFAULT_MODEL_ID: SynthesisModelId = 'eleven_flash_v2_5';
