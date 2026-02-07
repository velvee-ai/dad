import type { ExternalServiceMeta } from '../types';
import { externalId } from '../assembler/IdGenerator';

interface ExternalServiceMapping {
  name: string;
  technology: string;
  packages: string[];
  envPatterns: string[];
}

/**
 * Known external service mappings.
 * Maps npm/pip packages and env var patterns to external system nodes.
 */
const KNOWN_SERVICES: ExternalServiceMapping[] = [
  {
    name: 'Stripe',
    technology: 'REST API',
    packages: ['stripe', '@stripe/stripe-js'],
    envPatterns: ['STRIPE_API_KEY', 'STRIPE_SECRET_KEY', 'PAYMENT_API_KEY'],
  },
  {
    name: 'SendGrid',
    technology: 'REST API',
    packages: ['@sendgrid/mail', 'sendgrid'],
    envPatterns: ['SENDGRID_API_KEY', 'SMTP_HOST'],
  },
  {
    name: 'Twilio',
    technology: 'REST API',
    packages: ['twilio'],
    envPatterns: ['TWILIO_SID', 'TWILIO_AUTH_TOKEN'],
  },
  {
    name: 'AWS',
    technology: 'AWS SDK',
    packages: ['aws-sdk', '@aws-sdk/client-s3', '@aws-sdk/client-sqs'],
    envPatterns: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
  },
];

export class ExternalServiceRegistry {
  /**
   * Detect external services from package dependencies and environment variables.
   */
  detect(
    dependencies: Record<string, string>,
    envVars: Record<string, string>
  ): ExternalServiceMeta[] {
    const found = new Map<string, ExternalServiceMeta>();

    for (const mapping of KNOWN_SERVICES) {
      // Check package dependencies
      for (const pkg of mapping.packages) {
        if (dependencies[pkg]) {
          const id = externalId(mapping.name.toLowerCase().replace(/\s+/g, '-'));
          if (!found.has(id)) {
            found.set(id, {
              id,
              name: mapping.name,
              technology: mapping.technology,
              detectedByPackage: pkg,
            });
          }
        }
      }

      // Check env vars
      for (const pattern of mapping.envPatterns) {
        const envKey = Object.keys(envVars).find(
          k => k === pattern || k.startsWith(pattern.replace(/_.*$/, '_'))
        );
        if (envKey) {
          const id = externalId(mapping.name.toLowerCase().replace(/\s+/g, '-'));
          if (!found.has(id)) {
            found.set(id, {
              id,
              name: mapping.name,
              technology: mapping.technology,
              detectedByEnvVar: envKey,
            });
          } else {
            // Augment existing with env var info
            const existing = found.get(id)!;
            if (!existing.detectedByEnvVar) {
              existing.detectedByEnvVar = envKey;
            }
          }
        }
      }
    }

    return Array.from(found.values());
  }

  /**
   * Map a dependency name to a known external service name, or null if unknown.
   */
  resolvePackage(packageName: string): string | null {
    for (const mapping of KNOWN_SERVICES) {
      if (mapping.packages.includes(packageName)) {
        return mapping.name;
      }
    }
    return null;
  }

  /**
   * Map an env var name to a known external service name, or null if unknown.
   */
  resolveEnvVar(envVarName: string): string | null {
    for (const mapping of KNOWN_SERVICES) {
      if (mapping.envPatterns.some(p => envVarName === p || envVarName.startsWith(p))) {
        return mapping.name;
      }
    }
    return null;
  }
}
