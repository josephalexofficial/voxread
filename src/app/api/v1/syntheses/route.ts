import { ValidationError } from '@/common/errors/domain-errors';
import { successResponse, withApiHandler } from '@/common/utils/api-response';
import { readIdempotencyKey, withIdempotency } from '@/common/utils/idempotency';
import { safeJsonParse } from '@/common/utils/safe-json';
import { assertWithinRateLimit, readClientKey } from '@/common/utils/rate-limit';
import { renderSpeech } from '@/features/synthesis/services/elevenlabs.service';
import { SynthesisRequestSchema } from '@/features/synthesis/types/synthesis.dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * @route   POST /api/v1/syntheses
 * @desc    Renders one reading section with character-level timings.
 * @access  Public to the local app. The provider key stays on the server.
 *
 * @param   {string} req.body.text - Section text, at most 1,100 characters.
 * @param   {string} req.body.voiceId - ElevenLabs voice id.
 * @param   {string} req.body.modelId - Flash or multilingual model id.
 * @param   {object} req.body.voiceSettings - Stability, similarity, and speed.
 * @header  {string} [Idempotency-Key] - Stable key so a retry does not render twice.
 *
 * @returns {201} Rendered audio and alignment.
 * @returns {400} Validation failure.
 * @returns {429} Rate limit or credit quota exceeded.
 * @returns {502} ElevenLabs failed.
 * @returns {503} ELEVENLABS_API_KEY is not configured.
 */
export function POST(request: Request): Promise<Response> {
  return withApiHandler(async ({ requestId }) => {
    assertWithinRateLimit(`syntheses:${readClientKey(request)}`, 12);

    const rawBody = safeJsonParse<unknown>(await request.text(), null);

    if (rawBody === null) {
      throw new ValidationError('Request body must be valid JSON.', [
        { field: 'body', issue: 'Malformed JSON.' },
      ]);
    }

    const parsed = SynthesisRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      throw new ValidationError('Input validation failed.', parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        issue: issue.message,
      })));
    }

    const idempotencyKey = readIdempotencyKey(request);
    const render = idempotencyKey
      ? await withIdempotency(idempotencyKey, () => renderSpeech(parsed.data))
      : await renderSpeech(parsed.data);

    return successResponse(render, requestId, 201);
  });
}
