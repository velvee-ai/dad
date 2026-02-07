import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { DataStoreMeta } from '../types';
import { dataStoreId } from '../assembler/IdGenerator';

/** Maps docker image prefixes to data store info */
const IMAGE_MAP: Array<{ pattern: RegExp; name: string; technology: string }> = [
  { pattern: /^postgres/, name: 'PostgreSQL', technology: 'PostgreSQL' },
  { pattern: /^mysql/, name: 'MySQL', technology: 'MySQL' },
  { pattern: /^mongo/, name: 'MongoDB', technology: 'MongoDB' },
  { pattern: /^redis/, name: 'Redis', technology: 'Redis' },
  { pattern: /^memcached/, name: 'Memcached', technology: 'Memcached' },
  { pattern: /^elasticsearch/, name: 'Elasticsearch', technology: 'Elasticsearch' },
  { pattern: /^confluentinc\/cp-kafka/, name: 'Kafka', technology: 'Apache Kafka' },
  { pattern: /^apache\/kafka/, name: 'Kafka', technology: 'Apache Kafka' },
  { pattern: /^bitnami\/kafka/, name: 'Kafka', technology: 'Apache Kafka' },
  { pattern: /^rabbitmq/, name: 'RabbitMQ', technology: 'RabbitMQ' },
  { pattern: /^minio/, name: 'MinIO', technology: 'Object Storage' },
];

/** Infrastructure services to skip (not user-facing data stores) */
const INFRA_SKIP = [/^confluentinc\/cp-zookeeper/, /^zookeeper/];

interface DockerComposeService {
  image?: string;
  build?: string | Record<string, unknown>;
  environment?: string[] | Record<string, string>;
  depends_on?: string[] | Record<string, unknown>;
  ports?: string[];
}

interface DockerCompose {
  services?: Record<string, DockerComposeService>;
}

export interface DockerComposeParseResult {
  dataStores: DataStoreMeta[];
  /** service name → environment variables */
  serviceEnvVars: Record<string, Record<string, string>>;
  /** service name → depends_on service names */
  serviceDependencies: Record<string, string[]>;
}

/**
 * Detects data stores (databases, caches, message queues) from docker-compose files.
 */
export class DataStoreDetector {
  /**
   * Parse a docker-compose.yml and extract data stores + service metadata.
   */
  parse(composePath: string, systemId: string): DockerComposeParseResult {
    const raw = fs.readFileSync(composePath, 'utf-8');
    const compose = yaml.load(raw) as DockerCompose;

    const dataStores: DataStoreMeta[] = [];
    const serviceEnvVars: Record<string, Record<string, string>> = {};
    const serviceDependencies: Record<string, string[]> = {};

    if (!compose?.services) {
      return { dataStores, serviceEnvVars, serviceDependencies };
    }

    for (const [serviceName, service] of Object.entries(compose.services)) {
      // Parse environment variables for all services
      serviceEnvVars[serviceName] = this.parseEnvVars(service.environment);

      // Parse depends_on
      if (service.depends_on) {
        if (Array.isArray(service.depends_on)) {
          serviceDependencies[serviceName] = service.depends_on;
        } else {
          serviceDependencies[serviceName] = Object.keys(service.depends_on);
        }
      }

      // Check if this service is a data store (has image, not a build service)
      if (service.image) {
        // Skip infra-only services
        if (INFRA_SKIP.some(p => p.test(service.image!))) {
          continue;
        }

        const storeInfo = this.matchImage(service.image);
        if (storeInfo) {
          // Extract version from image tag
          const version = this.extractVersion(service.image);
          const technology = version ? `${storeInfo.technology} ${version}` : storeInfo.technology;

          dataStores.push({
            id: dataStoreId(storeInfo.name.toLowerCase()),
            name: storeInfo.name,
            image: service.image,
            technology,
            systemId,
            detectedBy: 'docker-compose',
          });
        }
      }
    }

    return { dataStores, serviceEnvVars, serviceDependencies };
  }

  /**
   * Find docker-compose files in a directory.
   */
  findComposeFiles(dir: string): string[] {
    const candidates = [
      'docker-compose.yml',
      'docker-compose.yaml',
      'compose.yml',
      'compose.yaml',
    ];

    return candidates
      .map(f => path.join(dir, f))
      .filter(f => fs.existsSync(f));
  }

  private matchImage(image: string): { name: string; technology: string } | null {
    for (const entry of IMAGE_MAP) {
      if (entry.pattern.test(image)) {
        return { name: entry.name, technology: entry.technology };
      }
    }
    return null;
  }

  private extractVersion(image: string): string | null {
    const parts = image.split(':');
    if (parts.length > 1) {
      const tag = parts[parts.length - 1];
      // Extract numeric version, stripping suffixes like "-alpine"
      const match = tag.match(/^(\d+(?:\.\d+)*)/);
      return match ? match[1] : null;
    }
    return null;
  }

  private parseEnvVars(env: string[] | Record<string, string> | undefined): Record<string, string> {
    const result: Record<string, string> = {};
    if (!env) return result;

    if (Array.isArray(env)) {
      for (const entry of env) {
        const eqIdx = entry.indexOf('=');
        if (eqIdx > 0) {
          result[entry.substring(0, eqIdx)] = entry.substring(eqIdx + 1);
        }
      }
    } else {
      for (const [key, value] of Object.entries(env)) {
        result[key] = String(value);
      }
    }

    return result;
  }
}
