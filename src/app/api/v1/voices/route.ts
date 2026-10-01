import { successResponse, withApiHandler } from '@/common/utils/api-response';
import { assertWithinRateLimit, readClientKey } from '@/common/utils/rate-limit';
import { listVoices } from '@/features/synthesis/services/elevenlabs.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @route   GET /api/v1/voices
 * @desc    Lists ElevenLabs voices available to the configured server key.
 * @access  Public to the local app. The provider key stays on the server.
 *
 * @returns {200} Voice summaries.
 * @returns {429} Rate limit exceeded.
 * @returns {502} ElevenLabs failed.
 * @returns {503} ELEVENLABS_API_KEY is not configured.
 */
export function GET(request: Request): Promise<Response> {
  return withApiHandler(async ({ requestId }) => {
    assertWithinRateLimit(`voices:${readClientKey(request)}`, 30);
    const voices = await listVoices();
    return successResponse(voices, requestId);
  });
}
