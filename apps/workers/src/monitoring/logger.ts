/**
 * Structured Logger
 *
 * Provides structured logging with context and metadata for better observability.
 * Compatible with Cloudflare Workers logging infrastructure.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class StructuredLogger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): StructuredLogger {
    return new StructuredLogger(
      { ...this.context, ...additionalContext },
      this.minLevel
    );
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Debug level log
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Info level log
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Warning level log
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Error level log
   */
  error(message: string, error?: Error, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, {
      ...meta,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Log an entry with the given level
   */
  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>
  ): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: { ...this.context, ...meta },
    };

    // Extract error if present in meta
    if (meta?.error) {
      entry.error = meta.error;
      delete entry.context?.error;
    }

    // Output to console with appropriate method
    const logMethod = this.getConsoleMethod(level);
    logMethod(JSON.stringify(entry, null, 2));
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }
}

/**
 * Request-scoped logger
 *
 * Creates a logger instance with request-specific context.
 */
export function createRequestLogger(
  requestId: string,
  endpoint: string,
  additionalContext?: LogContext
): StructuredLogger {
  return new StructuredLogger({
    requestId,
    endpoint,
    ...additionalContext,
  });
}

/**
 * Default logger instance
 */
export const logger = new StructuredLogger();

/**
 * Performance timing utilities
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a point in time
   */
  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /**
   * Get duration from start or from a specific mark
   */
  getDuration(fromMark?: string): number {
    const start = fromMark ? this.marks.get(fromMark) || this.startTime : this.startTime;
    return Date.now() - start;
  }

  /**
   * Get duration between two marks
   */
  getDurationBetween(startMark: string, endMark: string): number {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    if (!start || !end) {
      return 0;
    }
    return end - start;
  }

  /**
   * Get all marks with their durations from start
   */
  getAllMarks(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [name, time] of this.marks) {
      result[name] = time - this.startTime;
    }
    return result;
  }
}

/**
 * Helper to log function execution time
 */
export async function logExecutionTime<T>(
  logger: StructuredLogger,
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = new PerformanceTimer();
  try {
    const result = await fn();
    logger.info(`${operationName} completed`, {
      duration: timer.getDuration(),
      success: true,
    });
    return result;
  } catch (error) {
    logger.error(
      `${operationName} failed`,
      error instanceof Error ? error : new Error(String(error)),
      {
        duration: timer.getDuration(),
        success: false,
      }
    );
    throw error;
  }
}
