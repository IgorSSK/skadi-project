import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { z } from 'zod';
import type { Entity } from './entity/entity.js';

/**
 * Configuration options for DynamoDB table connections
 *
 * Defines how the ODM connects to and interacts with DynamoDB tables,
 * including client configuration and data transformation options.
 */
export interface TableConfig {
  /** AWS region for the DynamoDB table */
  region?: string;

  /** Custom DynamoDB client instance */
  client?: DynamoDBDocumentClient | DynamoDBClient;

  /** Data transformation options */
  transform?: {
    /** Case style transformation for attribute names */
    caseStyle?: 'snake_case' | 'camelCase';

    /** Whether to automatically add timestamp fields */
    timestamps?: boolean;
  };
}

/**
 * Definition for a Global Secondary Index
 *
 * Specifies the structure and projection configuration for a GSI
 * that can be queried independently of the main table.
 */
export interface GSIDefinition {
  /** Unique alias for referencing this GSI in queries */
  alias: string;

  /** Partition key attribute name for the GSI */
  partitionKey: string;

  /** Sort key attribute name for the GSI (optional) */
  sortKey?: string;

  /** Type of attribute projection for the GSI */
  projectionType?: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';

  /** Specific attributes to include when projectionType is 'INCLUDE' */
  projectedAttributes?: string[];
}

/**
 * Schema definition structure for DynamoDB entities
 *
 * Defines the required structure for entity schemas with mandatory
 * partition key and optional sort key, plus additional attributes.
 */
export type EntitySchemaDefinition = {
  /** Partition key schema with template-based transformation */
  pk: z.ZodEffects<any, string, any>;

  /** Optional sort key schema with template-based transformation */
  sk?: z.ZodEffects<any, string, any>;
} & Record<string, z.ZodTypeAny>;

/**
 * Result structure for DynamoDB Query operations
 *
 * Contains the queried items along with pagination and count information.
 *
 * @template T - The type of items in the result
 */
export interface QueryResult<T> {
  /** Array of items matching the query criteria */
  items: T[];

  /** Pagination cursor for retrieving the next page of results */
  cursor?: Record<string, unknown>;

  /** Number of items returned in this result */
  count: number;

  /** Total number of items examined during the query */
  scannedCount?: number;
}

/**
 * Result structure for DynamoDB BatchGet operations
 *
 * Contains the retrieved items and any keys that couldn't be processed.
 *
 * @template T - The type of items in the result
 */
export interface BatchResult<T> {
  /** Array of successfully retrieved items */
  items: T[];

  /** Keys that couldn't be processed due to throttling or errors */
  unprocessedKeys?: Record<string, unknown>[];
}

/**
 * Result structure for DynamoDB Transaction operations
 *
 * Indicates the success status of the transaction and any returned items.
 */
export interface TransactionResult {
  /** Whether the transaction completed successfully */
  success: boolean;

  /** Items returned from the transaction operations */
  items?: Record<string, unknown>[];
}

/**
 * Utility type to extract the inferred type from a CompleteEntity
 *
 * Retrieves the TypeScript type that represents the data structure
 * of items in the entity after Zod schema validation.
 *
 * @template T - CompleteEntity type to extract from
 */
export type EntityType<T extends Entity<any, any>> =
  T extends Entity<any, infer TSchema> ? z.infer<TSchema> : never;

/**
 * Utility type to extract the key structure from a CompleteEntity
 *
 * Retrieves the TypeScript type that represents the key structure
 * (partition key and optional sort key) for the entity.
 *
 * @template T - CompleteEntity type to extract from
 */
export type EntityKey<T extends Entity<any, any>> =
  T extends Entity<any, infer TSchema>
    ? TSchema extends z.ZodObject<infer TShape>
      ? TShape extends EntitySchemaDefinition
        ? {
            pk: z.input<TShape['pk']>;
          } & (TShape['sk'] extends z.ZodTypeAny
            ? { sk: z.input<TShape['sk']> }
            : Record<string, never>)
        : never
      : never
    : never;
