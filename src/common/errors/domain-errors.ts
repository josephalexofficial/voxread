import { AppError } from '@/common/errors/app-error';

export interface FieldIssue {
  field: string;
  issue: string;
}

/**
 * The payload failed structural or business validation.
 */
export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly errorCode = 'VALIDATION_FAILED';
  public readonly details: FieldIssue[];

  constructor(message: string, details: FieldIssue[] = []) {
    super(message, { details });
    this.details = details;
  }
}

/**
 * The requested record does not exist in the current scope.
 */
export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly errorCode = 'RESOURCE_NOT_FOUND';
}

/**
 * The caller exceeded the allowed request rate.
 */
export class RateLimitError extends AppError {
  public readonly statusCode = 429;
  public readonly errorCode = 'RATE_LIMITED';
}

/**
 * The ElevenLabs account has no remaining character credits.
 */
export class QuotaError extends AppError {
  public readonly statusCode = 429;
  public readonly errorCode = 'QUOTA_EXCEEDED';
}

/**
 * A required server integration is missing, so the feature cannot run.
 */
export class ConfigurationError extends AppError {
  public readonly statusCode = 503;
  public readonly errorCode = 'SERVICE_NOT_CONFIGURED';
}

/**
 * An upstream provider failed or returned an unusable payload.
 */
export class ExternalServiceError extends AppError {
  public readonly statusCode = 502;
  public readonly errorCode = 'THIRD_PARTY_FAILURE';
}

/**
 * An unexpected server failure. The message must stay generic for clients.
 */
export class InternalError extends AppError {
  public readonly statusCode = 500;
  public readonly errorCode = 'INTERNAL_FAILURE';

  constructor(message = 'Something went wrong while handling that request.') {
    super(message, undefined, false);
  }
}
