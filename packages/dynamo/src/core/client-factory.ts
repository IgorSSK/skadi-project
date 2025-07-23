import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoConnectionError } from '../errors/index.js';
import type { IClientFactory } from './commands.js';

/**
 * Configuration for DynamoDB client creation
 */
export interface DynamoClientConfig
  extends Omit<DynamoDBClientConfig, 'region'> {
  readonly region: string;
  readonly maxAttempts?: number;
  readonly requestTimeout?: number;
  readonly endpoint?: string;
  readonly credentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly sessionToken?: string;
  };
}

/**
 * Client factory implementation following Abstract Factory Pattern
 * Manages DynamoDB client creation with configuration and connection pooling
 */
export class DynamoClientFactory implements IClientFactory {
  private readonly clientCache = new Map<string, DynamoDBClient>();
  private readonly documentClientCache = new Map<
    string,
    DynamoDBDocumentClient
  >();

  /**
   * Creates a DynamoDB document client with enhanced configuration
   */
  public createDocumentClient(
    region: string,
    config?: Partial<DynamoClientConfig>
  ): DynamoDBDocumentClient {
    const cacheKey = this.createCacheKey(region, config);

    const cached = this.documentClientCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const client = this.createClient(region, config);
      const documentClient = DynamoDBDocumentClient.from(client, {
        marshallOptions: {
          convertEmptyValues: false,
          removeUndefinedValues: true,
          convertClassInstanceToMap: true,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });

      this.documentClientCache.set(cacheKey, documentClient);
      return documentClient;
    } catch {
      throw new DynamoConnectionError(
        `Failed to create DynamoDB document client for region ${region}`,
        config?.endpoint,
        region
      );
    }
  }

  /**
   * Creates a DynamoDB client with enhanced configuration
   */
  public createClient(
    region: string,
    config?: Partial<DynamoClientConfig>
  ): DynamoDBClient {
    const cacheKey = this.createCacheKey(region, config);

    const cached = this.clientCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const clientConfig: DynamoDBClientConfig = {
        region,
        maxAttempts: config?.maxAttempts ?? 3,
        requestTimeout: config?.requestTimeout ?? 30000,
        ...config,
      };

      const client = new DynamoDBClient(clientConfig);
      this.clientCache.set(cacheKey, client);

      return client;
    } catch {
      throw new DynamoConnectionError(
        `Failed to create DynamoDB client for region ${region}`,
        config?.endpoint,
        region
      );
    }
  }

  /**
   * Clears the client cache and destroys connections
   */
  public clearCache(): void {
    // Properly destroy clients if they have a destroy method
    for (const client of this.clientCache.values()) {
      if (typeof client.destroy === 'function') {
        client.destroy();
      }
    }

    for (const documentClient of this.documentClientCache.values()) {
      if (typeof documentClient.destroy === 'function') {
        documentClient.destroy();
      }
    }

    this.clientCache.clear();
    this.documentClientCache.clear();
  }

  /**
   * Gets cache statistics for monitoring
   */
  public getCacheStats(): {
    clientCount: number;
    documentClientCount: number;
    regions: string[];
  } {
    const regions = new Set<string>();

    for (const key of this.clientCache.keys()) {
      const region = key.split('|')[0];
      if (region) {
        regions.add(region);
      }
    }

    return {
      clientCount: this.clientCache.size,
      documentClientCount: this.documentClientCache.size,
      regions: Array.from(regions),
    };
  }

  /**
   * Creates a cache key based on region and configuration
   */
  private createCacheKey(
    region: string,
    config?: Partial<DynamoClientConfig>
  ): string {
    if (!config) {
      return region;
    }

    // Create deterministic cache key based on significant config properties
    const keyParts = [
      region,
      config.endpoint || 'default',
      config.maxAttempts?.toString() || '3',
      config.requestTimeout?.toString() || '30000',
    ];

    return keyParts.join('|');
  }
}

/**
 * Singleton instance of the client factory
 */
export const defaultClientFactory = new DynamoClientFactory();

/**
 * Utility function to create a document client with default configuration
 */
export function createDocumentClient(
  region: string,
  config?: Partial<DynamoClientConfig>
): DynamoDBDocumentClient {
  return defaultClientFactory.createDocumentClient(region, config);
}

/**
 * Utility function to create a DynamoDB client with default configuration
 */
export function createClient(
  region: string,
  config?: Partial<DynamoClientConfig>
): DynamoDBClient {
  return defaultClientFactory.createClient(region, config);
}
