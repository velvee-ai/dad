import { describe, it, expect, vi } from 'vitest';
import {
  processBatch,
  withRetry,
  RateLimiter,
  BatchQueue,
  ProgressTracker,
  createBatchProcessor,
} from '../batch';

describe('batch utilities', () => {
  describe('processBatch', () => {
    it('should process all items successfully', async () => {
      const items = [
        { id: '1', data: 'item1' },
        { id: '2', data: 'item2' },
        { id: '3', data: 'item3' },
      ];

      const processor = vi.fn(async (item) => `processed-${item.data}`);

      const results = await processBatch(items, processor, {
        maxConcurrent: 2,
        retryAttempts: 1,
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should handle failures and retry', async () => {
      const items = [{ id: '1', data: 'item1' }];

      let attempts = 0;
      const processor = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const results = await processBatch(items, processor, {
        maxConcurrent: 1,
        retryAttempts: 3,
        retryDelayMs: 10,
      });

      expect(results[0].status).toBe('success');
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it('should respect concurrency limit', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        data: `item${i}`,
      }));

      let concurrentCount = 0;
      let maxConcurrent = 0;

      const processor = vi.fn(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCount--;
        return 'done';
      });

      await processBatch(items, processor, {
        maxConcurrent: 3,
        retryAttempts: 1,
      });

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should call progress callback', async () => {
      const items = [
        { id: '1', data: 'item1' },
        { id: '2', data: 'item2' },
      ];

      const onProgress = vi.fn();
      const processor = vi.fn(async (item) => item.data);

      await processBatch(items, processor, {
        maxConcurrent: 1,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledWith(1, 2);
      expect(onProgress).toHaveBeenCalledWith(2, 2);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn(async () => 'success');

      const result = await withRetry(fn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const result = await withRetry(fn, {
        maxAttempts: 3,
        delayMs: 10,
        backoffMultiplier: 1,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Always fails');
      });

      await expect(
        withRetry(fn, {
          maxAttempts: 2,
          delayMs: 10,
        })
      ).rejects.toThrow('Always fails');

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('RateLimiter', () => {
    it('should allow immediate acquisition when tokens available', async () => {
      const limiter = new RateLimiter({
        maxTokens: 10,
        refillRate: 5,
        refillInterval: 1000,
      });

      const acquired = limiter.tryAcquire(5);
      expect(acquired).toBe(true);
      expect(limiter.getAvailableTokens()).toBe(5);
    });

    it('should deny acquisition when insufficient tokens', () => {
      const limiter = new RateLimiter({
        maxTokens: 10,
        refillRate: 5,
        refillInterval: 1000,
      });

      limiter.tryAcquire(8);
      const acquired = limiter.tryAcquire(5);

      expect(acquired).toBe(false);
    });

    it('should refill tokens over time', async () => {
      const limiter = new RateLimiter({
        maxTokens: 10,
        refillRate: 5,
        refillInterval: 100,
      });

      limiter.tryAcquire(10);
      expect(limiter.getAvailableTokens()).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(limiter.getAvailableTokens()).toBeGreaterThan(0);
    });
  });

  describe('ProgressTracker', () => {
    it('should track progress correctly', () => {
      const tracker = new ProgressTracker(10);

      tracker.increment();
      tracker.increment();

      const progress = tracker.getProgress();

      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(10);
      expect(progress.percentage).toBe(20);
    });

    it('should call onChange callbacks', () => {
      const tracker = new ProgressTracker(5);
      const callback = vi.fn();

      tracker.onChange(callback);
      tracker.increment();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: 1,
          total: 5,
          percentage: 20,
        })
      );
    });

    it('should estimate time remaining', () => {
      const tracker = new ProgressTracker(10);

      tracker.setCompleted(5);

      const progress = tracker.getProgress();
      expect(progress.estimatedTimeRemaining).not.toBeNull();
    });
  });

  describe('createBatchProcessor', () => {
    it('should create a batch processor', async () => {
      const processor = vi.fn(async (item: string) => item.toUpperCase());

      const batchProcessor = createBatchProcessor(processor, {
        maxConcurrent: 2,
      });

      const items = ['a', 'b', 'c'];
      const results = await batchProcessor(items);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
      expect(results[0].result).toBe('A');
    });
  });
});
