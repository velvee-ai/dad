/**
 * Stage 0: LLM-driven project profiling types.
 *
 * ProjectProfile is the structured output the LLM produces after reading
 * the project skeleton. It maps directly to C4 model concepts.
 *
 * ProjectSkeleton is the input snapshot we feed to the LLM.
 */

// ============================================================
// LLM Output — ProjectProfile
// ============================================================

export interface ProjectProfile {
  system: {
    name: string;
    description: string;
    technology: string;
    architectureStyle: string; // "polylith", "microservices", "monolith", "nx-monorepo", etc.
  };

  containers: Array<{
    name: string;
    path: string;                // relative from project root
    technology: string;          // "Python", "TypeScript/Express", etc.
    type: 'api' | 'worker' | 'frontend' | 'cli' | 'library' | 'service';
    description: string;
    componentPaths: string[];    // directories this container's components live in
  }>;

  dataStores: Array<{
    name: string;
    technology: string;          // "DynamoDB", "PostgreSQL 15", "Redis"
    description: string;
  }>;

  messageQueues: Array<{
    name: string;
    technology: string;          // "SQS", "Kafka", "RabbitMQ"
    description: string;
  }>;

  objectStores: Array<{
    name: string;
    technology: string;          // "S3", "MinIO", "GCS"
    description: string;
  }>;

  externalSystems: Array<{
    name: string;
    technology: string;
    description: string;
  }>;

  actors: Array<{
    name: string;
    scope: 'internal' | 'external';
    description: string;
  }>;

  relationships: Array<{
    source: string;              // container/actor/external name
    target: string;              // container/dataStore/queue/external name
    label: string;               // "Reads/writes data", "Publishes events to"
    technology: string;          // "REST/HTTP", "SQS", "DynamoDB"
    tags: string[];              // ['sync'] | ['async'] | ['data'] | ['event-driven']
  }>;
}

// ============================================================
// LLM Input — ProjectSkeleton
// ============================================================

export interface ProjectSkeleton {
  fileTree: string;              // indented tree output
  configFiles: Array<{
    path: string;
    content: string;             // truncated to first N lines
  }>;
  sampleSubProjectConfigs: Array<{
    path: string;
    content: string;
  }>;
  iacFileListing: string[];      // just file paths
}
