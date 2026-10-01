import { ValidationError } from '@/common/errors/domain-errors';
import { successResponse, withApiHandler } from '@/common/utils/api-response';
import { assertWithinRateLimit, readClientKey } from '@/common/utils/rate-limit';
import { MAX_DOCUMENT_CHARACTERS, MAX_UPLOAD_BYTES } from '@/features/reader/constants/limits';
import { extractPdfDocument } from '@/features/synthesis/services/elevenlabs.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @route   POST /api/v1/extractions
 * @desc    Extracts selectable text from an uploaded PDF. The file is not stored.
 * @access  Public to the local app.
 *
 * @param   {File} form.file - PDF no larger than 8 MB.
 *
 * @returns {201} Extracted text, page count, and character count.
 * @returns {400} The upload is missing, too large, or has no selectable text.
 * @returns {429} Rate limit exceeded.
 * @returns {502} The PDF parser failed.
 */
export function POST(request: Request): Promise<Response> {
  return withApiHandler(async ({ requestId }) => {
    assertWithinRateLimit(`extractions:${readClientKey(request)}`, 10);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ValidationError('Choose a PDF to extract.', [{ field: 'file', issue: 'A PDF file is required.' }]);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError('That PDF is too large.', [
        { field: 'file', issue: 'Keep uploads at or below 8 MB.' },
      ]);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractPdfDocument(bytes);

    if (!extracted.text) {
      throw new ValidationError('This PDF has no selectable text.', [
        { field: 'file', issue: 'Scanned pages need to be copied out and pasted.' },
      ]);
    }

    if (extracted.text.length > MAX_DOCUMENT_CHARACTERS) {
      throw new ValidationError('This PDF is longer than one VoxRead reading.', [
        {
          field: 'file',
          issue: `Keep the text under ${MAX_DOCUMENT_CHARACTERS.toLocaleString('en')} characters and split the rest.`,
        },
      ]);
    }

    return successResponse(
      {
        text: extracted.text,
        pageCount: extracted.pageCount,
        characterCount: extracted.text.length,
      },
      requestId,
      201,
    );
  });
}
