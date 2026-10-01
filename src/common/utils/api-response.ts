import { NextResponse } from 'next/server';

import { AppError, } from '@/common/errors/app-error';
import { InternalError, ValidationError } from '@/common/errors/domain-errors';
import type { FieldIssue } from '@/common/errors/domain-errors';
import { logger } from '@/common/utils/logger';

interface ResponseMeta {
  timestamp: string;
  requestId: string;
}

/**
 * Builds the shared response metadata block.
 *
 * @param requestId - Correlation id created at the route boundary.
 * @returns Timestamped metadata.
 */
export function createMeta(requestId: string): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Returns a success envelope.
 *
 * @param data - Response payload.
 * @param requestId - Correlation id.
 * @param statusCode - HTTP status. Defaults to 200.
 * @returns JSON response that clients can validate.
 */
export function successResponse<T>(data: T, requestId: string, statusCode = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: createMeta(requestId),
    },
    {
      status: statusCode,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

/**
 * Returns the standard error envelope without leaking stack traces.
 *
 * @param error - Typed domain error.
 * @param requestId - Correlation id.
 * @returns JSON response using the error status code.
 */
export function errorResponse(error: AppError, requestId: string): NextResponse {
  const details: FieldIssue[] = error instanceof ValidationError ? error.details : [];

  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        ...(details.length > 0 ? { details } : {}),
      },
      meta: createMeta(requestId),
    },
    {
      status: error.statusCode,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

/**
 * Runs a route handler and converts thrown domain errors into envelopes.
 *
 * @param handler - Route body that receives a fresh request id.
 * @returns The handler response, or a mapped error response.
 */
export async function withApiHandler(
  handler: (context: { requestId: string }) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = globalThis.crypto.randomUUID();

  try {
    return await handler({ requestId });
  } catch (error) {
    if (error instanceof AppError) {
      const level = error.statusCode >= 500 ? 'error' : 'warn';
      logger[level]('API request failed', {
        requestId,
        errorCode: error.errorCode,
        message: error.message,
      });
      return errorResponse(error, requestId);
    }

    logger.error('Unhandled API failure', {
      requestId,
      error,
    });
    return errorResponse(new InternalError(), requestId);
  }
}
