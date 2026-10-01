/**
 * Base type for operational failures that can be shown to a caller.
 */
export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(message: string, metadata?: Record<string, unknown>, isOperational = true) {
    super(message);
    this.name = new.target.name;
    this.metadata = metadata;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, new.target);
    }
  }
}
