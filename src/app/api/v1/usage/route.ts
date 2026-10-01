import { successResponse, withApiHandler } from '@/common/utils/api-response';
import { assertWithinRateLimit, readClientKey } from '@/common/utils/rate-limit';
import { readUsage } from '@/features/synthesis/services/elevenlabs.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @route   GET /api/v1/usage
 * @desc    Returns the ElevenLabs character allowance for the configured account.
 * @access  Public to the local app. The provider key stays on the server.
 *
 * @returns {200} Character usage summary.
 * @returns {429} Rate limit exceeded.
 * @returns {502} ElevenLabs failed.
 * @returns {503} ELEVENLABS_API_KEY is not configured.
 */
export function GET(request: Request): Promise<Response> {
  return withApiHandler(async ({ requestId }) => {
    assertWithinRateLimit(`usage:${readClientKey(request)}`, 30);
    const usage = await readUsage();
    return successResponse(usage, requestId);
  });
}
