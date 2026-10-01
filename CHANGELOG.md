# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- Reading surface that highlights the sentence currently being spoken.
- On-device preview that does not spend ElevenLabs credits.
- Studio rendering through ElevenLabs with character-level timings.
- Local library for pasted text, text files, and selectable PDFs.
- Audio cache and an idempotency key so a section is not rendered twice.
- Confirmation step that states the character cost before a studio render.
- Theme, contrast, text size, line spacing, and dyslexia-friendly type controls.
- Pause and stop controls. Stop returns the reading to the first sentence.

### Changed

- Studio settings show how much of the open reading is already prepared in this browser, instead of the shared account balance.
- Voice sliders fill the whole track when the value is at its maximum.
- The shortcuts list is a compact card with keycaps beside each action.
- Pause and Stop stay on screen while a reading is open.
- A new reading starts in high contrast, with the dyslexia-friendly type, small text, and relaxed line spacing.
- Studio voice defaults are stability 0.50, similarity 0.75, and speed 1.00×.
