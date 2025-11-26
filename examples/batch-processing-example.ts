/**
 * Example: Batch Diagram Generation
 *
 * This example demonstrates how to use the batch processing
 * utilities to analyze multiple code files in parallel.
 */

import {
  processBatch,
  RateLimiter,
  ProgressTracker,
  BatchItem,
} from '../apps/workers/src/utils/batch';

// Example 1: Basic Batch Processing
async function basicBatchExample() {
  console.log('Example 1: Basic Batch Processing\n');

  const files = [
    { id: 'file-1', code: 'function hello() {}', language: 'javascript' },
    { id: 'file-2', code: 'def world(): pass', language: 'python' },
    { id: 'file-3', code: 'func main() {}', language: 'go' },
  ];

  const results = await processBatch(
    files,
    async (item) => {
      console.log(`Processing ${item.id}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { diagram: 'generated', source: item.data.code };
    },
    {
      maxConcurrent: 2,
      retryAttempts: 3,
      onProgress: (completed, total) => {
        console.log(`Progress: ${completed}/${total}`);
      },
    }
  );

  console.log('\nResults:', results.length, 'items processed');
  console.log('Success:', results.filter(r => r.status === 'success').length);
  console.log('Failed:', results.filter(r => r.status === 'failed').length);
}

// Example 2: Rate Limited Processing
async function rateLimitedExample() {
  console.log('\nExample 2: Rate Limited Processing\n');

  const rateLimiter = new RateLimiter({
    maxTokens: 5,
    refillRate: 2,
    refillInterval: 1000,
  });

  const items: BatchItem<string>[] = Array.from({ length: 10 }, (_, i) => ({
    id: `item-${i}`,
    data: `content-${i}`,
  }));

  const results = await processBatch(
    items,
    async (item) => {
      await rateLimiter.acquire(1);
      console.log(`Processing ${item.id} (${rateLimiter.getAvailableTokens()} tokens left)`);
      return `processed-${item.data}`;
    },
    {
      maxConcurrent: 3,
    }
  );

  console.log('\nCompleted:', results.length, 'items');
}

// Example 3: Progress Tracking
async function progressTrackingExample() {
  console.log('\nExample 3: Progress Tracking\n');

  const total = 20;
  const tracker = new ProgressTracker(total);

  tracker.onChange((progress) => {
    const eta = progress.estimatedTimeRemaining
      ? `${Math.round(progress.estimatedTimeRemaining / 1000)}s`
      : 'calculating...';

    console.log(
      `Progress: ${progress.completed}/${progress.total} ` +
      `(${progress.percentage.toFixed(1)}%) - ` +
      `Elapsed: ${Math.round(progress.elapsed / 1000)}s - ` +
      `ETA: ${eta}`
    );
  });

  const items: BatchItem<number>[] = Array.from({ length: total }, (_, i) => ({
    id: `item-${i}`,
    data: i,
  }));

  await processBatch(
    items,
    async (item) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return item.data * 2;
    },
    {
      maxConcurrent: 5,
      onProgress: (completed) => tracker.setCompleted(completed),
    }
  );

  console.log('\nFinal progress:', tracker.getProgress());
}

// Example 4: Error Handling with Retry
async function errorHandlingExample() {
  console.log('\nExample 4: Error Handling with Retry\n');

  let attemptCount = 0;

  const items: BatchItem<{ shouldFail: boolean }>[] = [
    { id: 'success-1', data: { shouldFail: false } },
    { id: 'retry-then-success', data: { shouldFail: true } },
    { id: 'success-2', data: { shouldFail: false } },
  ];

  const results = await processBatch(
    items,
    async (item) => {
      attemptCount++;

      if (item.data.shouldFail && attemptCount < 3) {
        console.log(`${item.id}: Simulating failure (attempt ${attemptCount})`);
        throw new Error('Simulated failure');
      }

      console.log(`${item.id}: Success`);
      return 'processed';
    },
    {
      maxConcurrent: 1,
      retryAttempts: 3,
      retryDelayMs: 500,
      retryBackoffMultiplier: 2,
      onItemComplete: (result) => {
        if (result.status === 'failed') {
          console.log(`${result.id}: Failed after ${result.attempts} attempts - ${result.error?.message}`);
        } else {
          console.log(`${result.id}: Completed after ${result.attempts} attempts`);
        }
      },
    }
  );

  console.log('\nFinal results:');
  results.forEach(r => {
    console.log(`- ${r.id}: ${r.status} (${r.attempts} attempts)`);
  });
}

// Example 5: Real-world Batch Diagram Generation
async function realWorldExample() {
  console.log('\nExample 5: Real-world Batch Diagram Generation\n');

  interface CodeFile {
    filename: string;
    code: string;
    language: string;
  }

  const files: BatchItem<CodeFile>[] = [
    {
      id: 'auth.ts',
      data: {
        filename: 'auth.ts',
        code: 'export function authenticate(user: User) { ... }',
        language: 'typescript',
      },
    },
    {
      id: 'db.ts',
      data: {
        filename: 'db.ts',
        code: 'export class Database { connect() { ... } }',
        language: 'typescript',
      },
    },
    {
      id: 'api.ts',
      data: {
        filename: 'api.ts',
        code: 'export async function handleRequest(req) { ... }',
        language: 'typescript',
      },
    },
  ];

  const rateLimiter = new RateLimiter({
    maxTokens: 10,
    refillRate: 2,
    refillInterval: 1000,
  });

  const tracker = new ProgressTracker(files.length);
  tracker.onChange((progress) => {
    process.stdout.write(
      `\rAnalyzing: ${progress.completed}/${progress.total} ` +
      `(${progress.percentage.toFixed(0)}%)`
    );
  });

  const results = await processBatch(
    files,
    async (item) => {
      await rateLimiter.acquire(1);

      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        nodes: [
          { id: '1', type: 'start', label: 'Start' },
          { id: '2', type: 'process', label: `Process ${item.data.filename}` },
          { id: '3', type: 'end', label: 'End' },
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3' },
        ],
        metadata: {
          language: item.data.language,
          filename: item.data.filename,
        },
      };
    },
    {
      maxConcurrent: 5,
      retryAttempts: 3,
      retryDelayMs: 1000,
      retryBackoffMultiplier: 2,
      onProgress: (completed) => tracker.setCompleted(completed),
    }
  );

  console.log('\n\nBatch processing complete!');
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);

  const manifest = {
    id: `manifest-${Date.now()}`,
    timestamp: Date.now(),
    results: results.map(r => ({
      id: r.id,
      filename: (r.data as CodeFile).filename,
      diagram: r.result,
      success: r.status === 'success',
      error: r.error?.message,
      attempts: r.attempts,
    })),
    totalItems: results.length,
    successCount: results.filter(r => r.status === 'success').length,
    failureCount: results.filter(r => r.status === 'failed').length,
  };

  console.log('\nManifest:', JSON.stringify(manifest, null, 2));
}

// Run all examples
async function main() {
  try {
    await basicBatchExample();
    await rateLimitedExample();
    await progressTrackingExample();
    await errorHandlingExample();
    await realWorldExample();
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export {
  basicBatchExample,
  rateLimitedExample,
  progressTrackingExample,
  errorHandlingExample,
  realWorldExample,
};
