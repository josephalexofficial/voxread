# VoxRead

> An accessible audio reader that speaks a text, highlights the sentence being read, and keeps playback, display, and studio rendering under the reader's control.

## 1. System Overview and Key Capabilities

- **Reading surface:** Paste text, open a `.txt` or `.md` file, or extract selectable text from a PDF. Paragraph breaks are kept, and the sentence being spoken stays highlighted.
- **Device preview:** The browser voice speaks one sentence at a time. This path does not call ElevenLabs and does not spend credits.
- **Studio voice:** A server route sends one short section at a time to ElevenLabs and returns character timings. Those timings drive the highlight. Rendered audio is cached in the browser, so a repeated listen does not render again.
- **Playback:** Play, pause, and stop stay fixed at the bottom of the screen. Pause holds the current sentence. Stop returns to the first sentence. Space pauses, Escape stops, and the arrow keys move one sentence at a time.
- **Credit guard:** Studio rendering asks before spending characters and renders only the section being heard. The panel shows how much of the open reading is already prepared in this browser. It does not show the shared account balance.
- **Voice defaults:** Stability `0.50`, similarity `0.75`, and speed `1.00×`. Studio speed is stored in the rendered audio. Preview speed changes immediately.
- **Display defaults:** High contrast, the dyslexia-friendly typeface, small text, and relaxed line spacing. Theme, size, and spacing can be changed and are remembered in this browser.

## 2. Architecture and Data Flow

The browser keeps the library. The server is only a boundary for the ElevenLabs key and for PDF text extraction.

```text
[Reader UI] -> [IndexedDB library + audio cache]
            -> [POST /api/v1/syntheses] -> [ElevenLabs with-timestamps]
            -> [POST /api/v1/extractions] -> [PDF text parser]
            -> [GET /api/v1/voices, GET /api/v1/usage]
```

Device preview never leaves the browser. Studio audio is requested only after confirmation, one section at a time. The idempotency key is the content hash, so a double-click cannot start two renders of the same section.

### 2.1 API Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/v1/voices` | `GET` | Lists voices for the configured key. |
| `/api/v1/usage` | `GET` | Returns the character allowance for the configured key. |
| `/api/v1/syntheses` | `POST` | Renders one section and returns audio plus character timings. |
| `/api/v1/extractions` | `POST` | Extracts selectable text from a PDF. The file is not stored. |

Successful responses use `{ success, data, meta }`. Failures use `{ success: false, error: { code, message, details }, meta }`.

### 2.2 Limits

- One reading can contain 20,000 characters.
- Each studio request contains at most 1,100 characters.
- PDF uploads are limited to 8 MB.
- Scanned PDFs are not read. VoxRead does not run OCR.
- Readings and rendered audio stay in this browser. Clearing site data removes them.

## 3. Technology Stack

- **Runtime and language:** Node.js 20.x, TypeScript 6.x
- **Framework:** Next.js 15 App Router, React 19
- **Persistence and storage:** IndexedDB in the browser. No application database.
- **Styling and UI:** Custom CSS, with Fraunces, Outfit, and Atkinson Hyperlegible
- **Speech:** Web Speech API for preview. ElevenLabs Text-to-Speech with timestamps for studio audio.
- **Validation:** Zod 4 at the API boundary and on stored documents

## 4. Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- An ElevenLabs API key for studio voices. Device preview works without one.

## 5. Local Development Setup

```bash
git clone https://github.com/josephalexofficial/voxread.git
cd voxread
```

```bash
npm install
```

```bash
cp .env.example .env.local
```

Put the real key in `.env.local`. On Windows PowerShell, copy the example manually if `cp` is unavailable:

```powershell
Copy-Item .env.example .env.local
```

```bash
npm run dev
```

Open `http://localhost:3000`.

## 6. Environment Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `ELEVENLABS_API_KEY` | No | None | Server-only ElevenLabs key. Required for studio voices, usage, and the voice list. Never expose it with a `NEXT_PUBLIC_` prefix. |

## 7. Operational and Build Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Starts local development with hot reloading. |
| `npm run build` | Compiles the production bundle. |
| `npm run start` | Starts the production build. |
| `npm run lint` | Runs Next.js lint. |

## 8. License

Distributed under the MIT License. See [LICENSE](LICENSE).
