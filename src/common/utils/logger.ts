const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'xi-api-key',
  'creditcard',
  'cvv',
]);

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Redacts credential-like fields before they reach a log sink.
 *
 * @param data - Arbitrary structured value.
 * @returns A copy safe to print.
 */
export function sanitizeForLog<T>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    } as T;
  }

  const sanitized = (Array.isArray(data) ? [...data] : { ...data }) as Record<string, unknown> | unknown[];

  if (Array.isArray(sanitized)) {
    return sanitized.map((entry) => sanitizeForLog(entry)) as T;
  }

  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];

    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLog(value);
    }
  }

  return sanitized as T;
}

function write(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(metadata ? { metadata: sanitizeForLog(metadata) } : {}),
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(entry));
    return;
  }

  if (process.env.NODE_ENV === 'production' && level === 'debug') {
    return;
  }

  console.info(JSON.stringify(entry));
}

export const logger = {
  debug(message: string, metadata?: Record<string, unknown>): void {
    write('debug', message, metadata);
  },
  info(message: string, metadata?: Record<string, unknown>): void {
    write('info', message, metadata);
  },
  warn(message: string, metadata?: Record<string, unknown>): void {
    write('warn', message, metadata);
  },
  error(message: string, metadata?: Record<string, unknown>): void {
    write('error', message, metadata);
  },
};
