import { z } from 'zod';

const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string(),
          issue: z.string(),
        }),
      )
      .optional(),
  }),
});

/**
 * Failure returned by a VoxRead API route.
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Calls a same-origin JSON route with a timeout and validates the success payload.
 *
 * @param url - Relative API path.
 * @param dataSchema - Schema for the `data` field of a success envelope.
 * @param init - Fetch options. Do not set a timeout signal here; this function owns it.
 * @param timeoutMs - Abort deadline in milliseconds.
 * @returns The validated data payload.
 *
 * @throws {ApiClientError} When the network fails, the body is not the expected envelope, or the route returns an error.
 */
export async function requestApi<T>(
  url: string,
  dataSchema: z.ZodType<T>,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
    const rawBody = await response.text();
    const parsedBody = parseBody(rawBody);

    if (!response.ok || isErrorEnvelope(parsedBody)) {
      const errorEnvelope = ErrorEnvelopeSchema.safeParse(parsedBody);

      if (errorEnvelope.success) {
        throw new ApiClientError(
          errorEnvelope.data.error.message,
          errorEnvelope.data.error.code,
          response.status,
        );
      }

      throw new ApiClientError('The server returned an unexpected response.', 'BAD_RESPONSE', response.status);
    }

    const data = dataSchema.safeParse(readData(parsedBody));

    if (!data.success) {
      throw new ApiClientError('The server returned an unexpected response.', 'BAD_RESPONSE', response.status);
    }

    return data.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(`The request timed out after ${timeoutMs}ms.`, 'TIMEOUT', 408);
    }

    throw new ApiClientError('The network request failed.', 'NETWORK', 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseBody(rawBody: string): unknown {
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
}

function isErrorEnvelope(payload: unknown): boolean {
  return typeof payload === 'object' && payload !== null && 'success' in payload && payload.success === false;
}

function readData(payload: unknown): unknown {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return payload.data;
  }

  return undefined;
}
