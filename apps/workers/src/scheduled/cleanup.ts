/**
 * Scheduled Cleanup Worker for Expired Preview Sessions
 *
 * This worker runs daily to clean up expired preview sessions from R2 storage.
 * It identifies sessions that have exceeded the TTL and deletes all associated objects.
 */

import type { Env } from '../types';

interface CleanupStats {
  startTime: Date;
  endTime?: Date;
  sessionsScanned: number;
  sessionsExpired: number;
  objectsDeleted: number;
  bytesFreed: number;
  errors: string[];
}

interface SessionMetadata {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  ttlDays: number;
}

// Configuration
const PREVIEW_SESSION_TTL_DAYS = 7;
const BATCH_DELETE_SIZE = 1000; // R2 delete limit per batch
const SESSION_PREFIX = 'previews/'; // Base path for preview sessions

/**
 * Check if a session has expired based on its metadata
 */
function isSessionExpired(metadata: SessionMetadata, now: Date): boolean {
  const expiresAt = new Date(metadata.expiresAt);
  return expiresAt < now;
}

/**
 * Extract session ID from an R2 object key
 * Expected format: previews/{sessionId}/...
 */
function extractSessionId(key: string): string | null {
  const match = key.match(/^previews\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * List all objects in a session folder
 */
async function listSessionObjects(
  bucket: R2Bucket,
  sessionId: string
): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  const prefix = `${SESSION_PREFIX}${sessionId}/`;

  let cursor: string | undefined;
  do {
    const listed = await bucket.list({
      prefix,
      cursor,
      limit: 1000,
    });

    objects.push(...listed.objects);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return objects;
}

/**
 * Delete objects in batches
 */
async function deleteObjectsBatch(
  bucket: R2Bucket,
  keys: string[],
  dryRun: boolean
): Promise<number> {
  let deleted = 0;

  // Process in batches
  for (let i = 0; i < keys.length; i += BATCH_DELETE_SIZE) {
    const batch = keys.slice(i, i + BATCH_DELETE_SIZE);

    if (dryRun) {
      console.log(`[DRY RUN] Would delete ${batch.length} objects:`, batch.slice(0, 5), '...');
      deleted += batch.length;
    } else {
      // Delete each object individually (R2 doesn't have batch delete in all SDKs)
      await Promise.all(
        batch.map(async (key) => {
          try {
            await bucket.delete(key);
            deleted++;
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
            throw error;
          }
        })
      );
    }
  }

  return deleted;
}

/**
 * Identify and clean up expired sessions
 */
async function cleanupExpiredSessions(
  bucket: R2Bucket,
  dryRun: boolean
): Promise<CleanupStats> {
  const stats: CleanupStats = {
    startTime: new Date(),
    sessionsScanned: 0,
    sessionsExpired: 0,
    objectsDeleted: 0,
    bytesFreed: 0,
    errors: [],
  };

  const now = new Date();
  const processedSessions = new Set<string>();

  try {
    // List all objects with preview prefix
    let cursor: string | undefined;

    do {
      const listed = await bucket.list({
        prefix: SESSION_PREFIX,
        cursor,
        limit: 1000,
      });

      // Group objects by session
      for (const obj of listed.objects) {
        const sessionId = extractSessionId(obj.key);
        if (!sessionId || processedSessions.has(sessionId)) {
          continue;
        }

        processedSessions.add(sessionId);
        stats.sessionsScanned++;

        // Get session metadata from a marker file
        const metadataKey = `${SESSION_PREFIX}${sessionId}/.metadata`;
        const metadataObj = await bucket.get(metadataKey);

        if (!metadataObj) {
          // No metadata found - consider orphaned session
          // Default to TTL-based expiry check using object upload time
          const sessionObjects = await listSessionObjects(bucket, sessionId);
          if (sessionObjects.length === 0) continue;

          // Find oldest object to determine session age
          const oldestObj = sessionObjects.reduce((oldest, obj) =>
            obj.uploaded < oldest.uploaded ? obj : oldest
          );

          const ageInDays = (now.getTime() - oldestObj.uploaded.getTime()) / (1000 * 60 * 60 * 24);

          if (ageInDays > PREVIEW_SESSION_TTL_DAYS) {
            console.log(`Found orphaned expired session: ${sessionId} (age: ${ageInDays.toFixed(1)} days)`);
            stats.sessionsExpired++;

            // Delete all session objects
            const keys = sessionObjects.map(o => o.key);
            const bytesInSession = sessionObjects.reduce((sum, o) => sum + o.size, 0);

            const deleted = await deleteObjectsBatch(bucket, keys, dryRun);
            stats.objectsDeleted += deleted;
            stats.bytesFreed += bytesInSession;

            console.log(`${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${deleted} objects (${(bytesInSession / 1024 / 1024).toFixed(2)} MB) from session ${sessionId}`);
          }
        } else {
          // Parse metadata
          const metadataText = await metadataObj.text();
          const metadata: SessionMetadata = JSON.parse(metadataText);

          if (isSessionExpired(metadata, now)) {
            console.log(`Found expired session: ${sessionId} (expired: ${metadata.expiresAt})`);
            stats.sessionsExpired++;

            // List all objects in this session
            const sessionObjects = await listSessionObjects(bucket, sessionId);
            const keys = sessionObjects.map(o => o.key);
            const bytesInSession = sessionObjects.reduce((sum, o) => sum + o.size, 0);

            // Delete all session objects
            const deleted = await deleteObjectsBatch(bucket, keys, dryRun);
            stats.objectsDeleted += deleted;
            stats.bytesFreed += bytesInSession;

            console.log(`${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${deleted} objects (${(bytesInSession / 1024 / 1024).toFixed(2)} MB) from session ${sessionId}`);
          }
        }
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stats.errors.push(errorMessage);
    console.error('Cleanup error:', error);
  }

  stats.endTime = new Date();
  return stats;
}

/**
 * Format cleanup stats for logging
 */
function formatStats(stats: CleanupStats): string {
  const duration = stats.endTime
    ? ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(2)
    : 'N/A';

  const mbFreed = (stats.bytesFreed / 1024 / 1024).toFixed(2);

  return `
Cleanup Summary:
  Duration: ${duration}s
  Sessions Scanned: ${stats.sessionsScanned}
  Sessions Expired: ${stats.sessionsExpired}
  Objects Deleted: ${stats.objectsDeleted}
  Storage Freed: ${mbFreed} MB
  Errors: ${stats.errors.length}
${stats.errors.length > 0 ? `  Error Details: ${stats.errors.join(', ')}` : ''}
  `.trim();
}

/**
 * Scheduled event handler
 */
export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const dryRun = env.DRY_RUN === 'true';

    console.log(`Starting scheduled cleanup (dry run: ${dryRun}) at ${new Date().toISOString()}`);
    console.log(`Cron: ${event.cron}, Scheduled time: ${new Date(event.scheduledTime).toISOString()}`);

    if (!env.DAAD_BUCKET) {
      console.error('DAAD_BUCKET binding not configured. Skipping cleanup.');
      return;
    }

    try {
      const stats = await cleanupExpiredSessions(env.DAAD_BUCKET, dryRun);

      console.log(formatStats(stats));

      // Log to analytics or monitoring service if needed
      // await env.ANALYTICS?.writeDataPoint({
      //   blobs: ['cleanup'],
      //   doubles: [stats.objectsDeleted, stats.bytesFreed],
      //   indexes: [event.cron],
      // });

    } catch (error) {
      console.error('Fatal error during scheduled cleanup:', error);
      throw error; // Re-throw to mark the execution as failed
    }
  },
};
