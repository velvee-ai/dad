/**
 * Batch processing utilities for diagram generation
 * Provides parallel processing, retry logic, and rate limiting
 */

export interface BatchItem<T> {
  id: string;
  data: T;
}

export interface BatchResult<T, R> {
  id: string;
  data: T;
  result?: R;
  error?: Error;
  attempts: number;
  status: 'success' | 'failed' | 'pending';
}

export interface BatchOptions {
  maxConcurrent?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  retryBackoffMultiplier?: number;
  onProgress?: (completed: number, total: number) => void;
  onItemComplete?: <T, R>(result: BatchResult<T, R>) => void;
}

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_BATCH_OPTIONS: Required<Omit<BatchOptions, 'onProgress' | 'onItemComplete'>> = {
  maxConcurrent: 5,
  retryAttempts: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = {
    maxAttempts: options.maxAttempts ?? 3,
    delayMs: options.delayMs ?? 1000,
    backoffMultiplier: options.backoffMultiplier ?? 2,
    onRetry: options.onRetry,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxAttempts) {
        const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);

        if (opts.onRetry) {
          opts.onRetry(attempt, lastError);
        }

        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process items in parallel with concurrency control
 */
export async function processBatch<T, R>(
  items: BatchItem<T>[],
  processor: (item: BatchItem<T>) => Promise<R>,
  options: BatchOptions = {}
): Promise<BatchResult<T, R>[]> {
  const opts = { ...DEFAULT_BATCH_OPTIONS, ...options };
  const results: BatchResult<T, R>[] = items.map(item => ({
    id: item.id,
    data: item.data,
    attempts: 0,
    status: 'pending' as const,
  }));

  const queue = [...items];
  const inProgress = new Set<number>();
  let completedCount = 0;

  return new Promise((resolve) => {
    const processNext = async () => {
      if (queue.length === 0 && inProgress.size === 0) {
        resolve(results);
        return;
      }

      while (queue.length > 0 && inProgress.size < opts.maxConcurrent) {
        const item = queue.shift()!;
        const index = items.indexOf(item);
        inProgress.add(index);

        processItem(item, index);
      }
    };

    const processItem = async (item: BatchItem<T>, index: number) => {
      const result = results[index];

      try {
        const output = await withRetry(
          () => processor(item),
          {
            maxAttempts: opts.retryAttempts,
            delayMs: opts.retryDelayMs,
            backoffMultiplier: opts.retryBackoffMultiplier,
            onRetry: (attempt, error) => {
              result.attempts = attempt;
            },
          }
        );

        result.result = output;
        result.status = 'success';
        result.attempts = result.attempts || 1;
      } catch (error) {
        result.error = error instanceof Error ? error : new Error(String(error));
        result.status = 'failed';
        result.attempts = opts.retryAttempts;
      } finally {
        completedCount++;
        inProgress.delete(index);

        if (opts.onItemComplete) {
          opts.onItemComplete(result);
        }

        if (opts.onProgress) {
          opts.onProgress(completedCount, items.length);
        }

        processNext();
      }
    };

    processNext();
  });
}

/**
 * Rate limiter with token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;

  constructor(options: {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
  }) {
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.refillInterval = options.refillInterval;
    this.tokens = options.maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const intervalsElapsed = Math.floor(timePassed / this.refillInterval);

    if (intervalsElapsed > 0) {
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + intervalsElapsed * this.refillRate
      );
      this.lastRefill = now;
    }
  }

  async acquire(tokens: number = 1): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= tokens) {
        this.tokens -= tokens;
        return;
      }

      const waitTime = this.refillInterval;
      await sleep(waitTime);
    }
  }

  tryAcquire(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Queue for processing items with rate limiting
 */
export class BatchQueue<T, R> {
  private queue: Array<{
    item: BatchItem<T>;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];

  private processing = false;

  constructor(
    private processor: (item: BatchItem<T>) => Promise<R>,
    private rateLimiter: RateLimiter,
    private options: BatchOptions = {}
  ) {}

  async add(item: BatchItem<T>): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.processQueue();
    });
  }

  async addBatch(items: BatchItem<T>[]): Promise<BatchResult<T, R>[]> {
    return processBatch(items, async (item) => {
      await this.rateLimiter.acquire();
      return this.processor(item);
    }, this.options);
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { item, resolve, reject } = this.queue.shift()!;

      try {
        await this.rateLimiter.acquire();
        const result = await this.processor(item);
        resolve(result);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

/**
 * Create a batched version of a function
 */
export function createBatchProcessor<T, R>(
  processor: (item: T) => Promise<R>,
  options: BatchOptions = {}
): (items: T[]) => Promise<BatchResult<T, R>[]> {
  return async (items: T[]) => {
    const batchItems: BatchItem<T>[] = items.map((data, index) => ({
      id: `item-${index}`,
      data,
    }));

    return processBatch(batchItems, async (item) => processor(item.data), options);
  };
}

/**
 * Progress tracker for batch operations
 */
export class ProgressTracker {
  private completed = 0;
  private total: number;
  private startTime: number;
  private callbacks: Array<(progress: ProgressUpdate) => void> = [];

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  increment(): void {
    this.completed++;
    this.notify();
  }

  setCompleted(completed: number): void {
    this.completed = completed;
    this.notify();
  }

  onChange(callback: (progress: ProgressUpdate) => void): void {
    this.callbacks.push(callback);
  }

  private notify(): void {
    const progress = this.getProgress();
    this.callbacks.forEach(cb => cb(progress));
  }

  getProgress(): ProgressUpdate {
    const elapsed = Date.now() - this.startTime;
    const rate = this.completed / elapsed;
    const remaining = this.total - this.completed;
    const estimatedTimeRemaining = remaining / rate;

    return {
      completed: this.completed,
      total: this.total,
      percentage: (this.completed / this.total) * 100,
      elapsed,
      estimatedTimeRemaining: isFinite(estimatedTimeRemaining) ? estimatedTimeRemaining : null,
    };
  }
}

export interface ProgressUpdate {
  completed: number;
  total: number;
  percentage: number;
  elapsed: number;
  estimatedTimeRemaining: number | null;
}
