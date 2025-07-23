/**
 * Core type definitions for Skadi DynamoDB integration
 * Provides enhanced TypeScript 5.8+ features for type safety
 */

/**
 * Base attribute type for DynamoDB attributes
 */
export interface BaseAttribute<T = unknown> {
  readonly type: T;
  readonly attrName?: string;
  readonly required?: boolean;
  readonly transform?: (value: unknown) => T;
  readonly validate?: (value: T) => boolean | string;
}

/**
 * Primary key attributes with enhanced type safety
 */
export interface PrimaryKeyAttribute<T = unknown> extends BaseAttribute<T> {
  readonly isPrimary: true;
  readonly keyType: 'HASH' | 'RANGE';
  readonly template?: string;
}

/**
 * Standard attribute implementation
 */
export interface StandardAttribute<T = unknown> extends BaseAttribute<T> {
  readonly isPrimary?: false;
}

/**
 * Union type for all attribute types
 */
export type Attribute<T = unknown> =
  | PrimaryKeyAttribute<T>
  | StandardAttribute<T>;

/**
 * Schema definition type with enhanced constraints
 */
export type SchemaDefinition<T extends Record<string, unknown>> = {
  readonly [K in keyof T]: Attribute<T[K]>;
};

/**
 * Enhanced table configuration with modern TypeScript features
 */
export interface TableConfiguration<T extends Record<string, unknown>> {
  readonly name: string;
  readonly schema: SchemaDefinition<T>;
  readonly region?: string;
  readonly billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED';
  readonly timeToLive?: {
    readonly attributeName: keyof T;
    readonly enabled: boolean;
  };
}

/**
 * Extract primary keys from schema definition
 */
export type ExtractPrimaryKeys<
  TDef extends SchemaDefinition<Record<string, unknown>>,
> = {
  readonly [K in keyof TDef as TDef[K] extends PrimaryKeyAttribute<unknown>
    ? K
    : never]: TDef[K] extends PrimaryKeyAttribute<infer U> ? U : never;
};

/**
 * Extract all keys from schema definition
 */
export type ExtractAllKeys<
  TDef extends SchemaDefinition<Record<string, unknown>>,
> = {
  readonly [K in keyof TDef]: TDef[K] extends Attribute<infer U> ? U : never;
};

/**
 * Partial update type ensuring type safety
 */
export type UpdateExpression<
  TDef extends SchemaDefinition<Record<string, unknown>>,
> = Partial<Omit<ExtractAllKeys<TDef>, keyof ExtractPrimaryKeys<TDef>>>;

/**
 * Query operation parameters with strong typing
 */
export interface QueryOptions<
  TDef extends SchemaDefinition<Record<string, unknown>>,
> {
  readonly partitionKey: {
    readonly name: keyof ExtractPrimaryKeys<TDef>;
    readonly value: ExtractPrimaryKeys<TDef>[keyof ExtractPrimaryKeys<TDef>];
  };
  readonly sortKey?: {
    readonly name: keyof ExtractPrimaryKeys<TDef>;
    readonly condition:
      | 'EQ'
      | 'LT'
      | 'LE'
      | 'GT'
      | 'GE'
      | 'BEGINS_WITH'
      | 'BETWEEN';
    readonly value: unknown;
    readonly value2?: unknown; // For BETWEEN condition
  };
  readonly limit?: number;
  readonly scanIndexForward?: boolean;
  readonly exclusiveStartKey?: Record<string, unknown>;
}

/**
 * Command execution result with enhanced error information
 */
export type CommandResult<TSuccess> =
  | readonly [TSuccess, null]
  | readonly [null, Error];

/**
 * Batch operation interface for future extensions
 */
export interface BatchOperation<T> {
  readonly operation: 'PUT' | 'DELETE';
  readonly item?: T;
  readonly keys?: Partial<T>;
}

/**
 * Enhanced error context for better debugging
 */
export interface ErrorContext {
  readonly operation: string;
  readonly tableName: string;
  readonly timestamp: Date;
  readonly requestId?: string;
  readonly retryCount?: number;
}

// Legacy exports for backward compatibility
export * from './schema-utils.js';
