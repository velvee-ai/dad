import type { ProjectSkeleton } from './types';

/**
 * Builds the LLM prompt for project profiling.
 *
 * System prompt establishes the role and output format.
 * User prompt provides the skeleton and asks for a specific JSON schema.
 */
export class ProfilePromptBuilder {
  build(skeleton: ProjectSkeleton): string {
    const systemContext = this.buildSystemContext();
    const userPrompt = this.buildUserPrompt(skeleton);
    return `${systemContext}\n\n${userPrompt}`;
  }

  private buildSystemContext(): string {
    return `You are an expert software architect analyzing a project's structure to produce a C4 model profile.

## C4 Model Levels
- **System**: The top-level software system being analyzed
- **Container**: A separately deployable/runnable unit (API service, web app, worker, CLI tool, library)
- **Component**: A grouping of related code within a container (controllers, services, repositories)
- **Code**: Individual classes, functions, interfaces

## Your Task
Read the project's configuration files, directory structure, and manifests to understand:
1. What containers (services/apps) exist and what technology each uses
2. What data stores, message queues, and object stores are used
3. What external systems are integrated
4. Who the actors (users) are
5. How containers relate to each other (API calls, event publishing, data access)

## Important Rules
- For **componentPaths**, list the actual source directories each container uses. Read the project manifests to determine this mapping.
- For **relationships**, describe the actual communication patterns between containers (REST calls, queue publishing, database reads/writes).
- Use the project's own terminology for naming (e.g., if the project calls something a "base", use that name).
- Every container MUST have a non-empty **path** pointing to its directory relative to the project root.
- If the project uses a monorepo tool (Nx, Turborepo, Polylith, Pants, Bazel, Lerna, Rush), identify all workspace members as separate containers.
- For IaC-defined infrastructure (CDK, Terraform, Pulumi), extract data stores, queues, and object stores from the infrastructure definitions.
- Output ONLY valid JSON matching the schema below. No markdown fences, no commentary.`;
  }

  private buildUserPrompt(skeleton: ProjectSkeleton): string {
    let prompt = `## Project File Tree\n\n\`\`\`\n${skeleton.fileTree}\`\`\`\n\n`;

    if (skeleton.configFiles.length > 0) {
      prompt += `## Configuration Files\n\n`;
      for (const config of skeleton.configFiles) {
        prompt += `### ${config.path}\n\`\`\`\n${config.content}\n\`\`\`\n\n`;
      }
    }

    if (skeleton.sampleSubProjectConfigs.length > 0) {
      prompt += `## Sub-Project Configuration Samples\n\n`;
      for (const config of skeleton.sampleSubProjectConfigs) {
        prompt += `### ${config.path}\n\`\`\`\n${config.content}\n\`\`\`\n\n`;
      }
    }

    if (skeleton.iacFileListing.length > 0) {
      prompt += `## Infrastructure-as-Code Files\n\n`;
      prompt += skeleton.iacFileListing.map(f => `- ${f}`).join('\n');
      prompt += '\n\n';
    }

    prompt += `## Required Output Schema

Produce a JSON object matching this exact schema:

\`\`\`json
{
  "system": {
    "name": "string — system name",
    "description": "string — one-sentence description",
    "technology": "string — primary tech stack",
    "architectureStyle": "string — e.g. microservices, monolith, polylith, nx-monorepo"
  },
  "containers": [
    {
      "name": "string — human-readable name",
      "path": "string — relative directory path from project root",
      "technology": "string — e.g. Python/FastAPI, TypeScript/Express",
      "type": "api | worker | frontend | cli | library | service",
      "description": "string — what this container does",
      "componentPaths": ["string — relative paths to source directories within this container"]
    }
  ],
  "dataStores": [
    {
      "name": "string — e.g. Users DynamoDB Table",
      "technology": "string — e.g. DynamoDB, PostgreSQL 15, Redis",
      "description": "string — what data it stores"
    }
  ],
  "messageQueues": [
    {
      "name": "string — e.g. Order Events Queue",
      "technology": "string — e.g. SQS, Kafka, RabbitMQ",
      "description": "string — what messages flow through it"
    }
  ],
  "objectStores": [
    {
      "name": "string — e.g. Media Uploads Bucket",
      "technology": "string — e.g. S3, MinIO, GCS",
      "description": "string — what objects it stores"
    }
  ],
  "externalSystems": [
    {
      "name": "string — e.g. Stripe, Instagram API",
      "technology": "string — e.g. REST API, GraphQL",
      "description": "string — what it provides"
    }
  ],
  "actors": [
    {
      "name": "string — e.g. Customer, Admin User",
      "scope": "internal | external",
      "description": "string — who they are and what they do"
    }
  ],
  "relationships": [
    {
      "source": "string — name of source container/actor/external",
      "target": "string — name of target container/dataStore/queue/external",
      "label": "string — e.g. Reads/writes data, Publishes events to",
      "technology": "string — e.g. REST/HTTP, SQS, DynamoDB SDK",
      "tags": ["string — sync | async | data | event-driven | external"]
    }
  ]
}
\`\`\`

Now analyze the project and output the JSON:`;

    return prompt;
  }
}
