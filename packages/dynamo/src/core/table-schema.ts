import { AttributeFactory } from '../attributes/index.js';
import type { PrimaryKeyAttributeImpl } from '../attributes/index.js';
import { DynamoConfigurationError } from '../errors/index.js';
import type {
  ExtractAllKeys,
  ExtractPrimaryKeys,
  SchemaDefinition,
  TableConfiguration,
} from '../types/index.js';

/**
 * Enhanced table schema with type-safe operations and validation
 * Implements immutable pattern with builder-style configuration
 */
export class TableSchema<T extends Record<string, unknown>> {
  private readonly config: TableConfiguration<T>;

  private constructor(config: TableConfiguration<T>) {
    this.config = Object.freeze({ ...config });
    this.validateSchema();
  }

  /**
   * Gets the schema definition for type operations
   */
  public get schemaDefinition(): SchemaDefinition<T> {
    return this.config.schema;
  }

  /**
   * Creates a new table schema with enhanced type safety
   */
  public static define<T extends Record<string, unknown>>(
    name: string,
    schema: SchemaDefinition<T>
  ): TableSchema<T> {
    const config: TableConfiguration<T> = {
      name,
      schema,
      region: 'us-east-1', // Default region
      billingMode: 'PAY_PER_REQUEST',
    };

    return new TableSchema(config);
  }

  /**
   * Sets the AWS region for this table
   */
  public withRegion(region: string): TableSchema<T> {
    return new TableSchema({
      ...this.config,
      region,
    });
  }

  /**
   * Sets the billing mode for this table
   */
  public withBillingMode(
    billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED'
  ): TableSchema<T> {
    return new TableSchema({
      ...this.config,
      billingMode,
    });
  }

  /**
   * Configures Time To Live for this table
   */
  public withTimeToLive(
    attributeName: keyof T,
    enabled = true
  ): TableSchema<T> {
    return new TableSchema({
      ...this.config,
      timeToLive: { attributeName, enabled },
    });
  }

  /**
   * Validates the schema configuration
   */
  private validateSchema(): void {
    const { name, schema } = this.config;

    if (!name || name.trim().length === 0) {
      throw new DynamoConfigurationError('Table name cannot be empty');
    }

    if (!schema || Object.keys(schema).length === 0) {
      throw new DynamoConfigurationError('Schema cannot be empty');
    }

    // Validate primary keys
    const primaryKeys = this.getPrimaryKeyAttributes();

    if (primaryKeys.length === 0) {
      throw new DynamoConfigurationError(
        'Schema must have at least one primary key (HASH)'
      );
    }

    const hashKeys = primaryKeys.filter(attr => attr.keyType === 'HASH');
    const rangeKeys = primaryKeys.filter(attr => attr.keyType === 'RANGE');

    if (hashKeys.length !== 1) {
      throw new DynamoConfigurationError(
        'Schema must have exactly one partition key (HASH)'
      );
    }

    if (rangeKeys.length > 1) {
      throw new DynamoConfigurationError(
        'Schema can have at most one sort key (RANGE)'
      );
    }

    // Validate TTL attribute exists in schema
    if (this.config.timeToLive) {
      const ttlAttr = this.config.timeToLive.attributeName;
      if (!(ttlAttr in schema)) {
        throw new DynamoConfigurationError(
          `TTL attribute '${String(ttlAttr)}' is not defined in schema`
        );
      }
    }
  }

  /**
   * Gets primary key attributes from the schema
   */
  private getPrimaryKeyAttributes(): PrimaryKeyAttributeImpl<unknown>[] {
    return Object.values(this.config.schema).filter(
      (attr): attr is PrimaryKeyAttributeImpl<unknown> =>
        'isPrimary' in attr && attr.isPrimary === true
    );
  }

  /**
   * Validates an item against this schema
   */
  public validateItem(item: unknown): item is T {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const itemObj = item as Record<string, unknown>;
    const { schema } = this.config;

    try {
      for (const [fieldName, attribute] of Object.entries(schema)) {
        const value = itemObj[fieldName];

        // Use the attribute's validation logic
        if (
          'validateValue' in attribute &&
          typeof attribute.validateValue === 'function'
        ) {
          attribute.validateValue(value, fieldName);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts primary keys from an item
   */
  public extractPrimaryKeys(item: T): Partial<T> {
    const result = {} as Partial<T>;
    const primaryKeyAttrs = this.getPrimaryKeyAttributes();

    for (const attr of primaryKeyAttrs) {
      const fieldName = this.getFieldNameForAttribute(attr);
      if (fieldName) {
        const value = (item as Record<string, unknown>)[fieldName];
        (result as Record<string, unknown>)[fieldName] = value;
      }
    }

    return result;
  }

  /**
   * Gets the field name for a specific attribute
   */
  private getFieldNameForAttribute(
    targetAttr: PrimaryKeyAttributeImpl<unknown>
  ): string | undefined {
    const { schema } = this.config;

    for (const [fieldName, attr] of Object.entries(schema)) {
      if (attr === targetAttr) {
        return fieldName;
      }
    }

    return undefined;
  }

  // Getters for accessing configuration
  public get name(): string {
    return this.config.name;
  }

  public get schema(): SchemaDefinition<T> {
    return this.config.schema;
  }

  public get region(): string {
    return this.config.region || 'us-east-1';
  }

  public get billingMode(): 'PAY_PER_REQUEST' | 'PROVISIONED' {
    return this.config.billingMode || 'PAY_PER_REQUEST';
  }

  public get timeToLive(): TableConfiguration<T>['timeToLive'] {
    return this.config.timeToLive;
  }

  /**
   * Creates a deep copy of this schema for safe mutations
   */
  public clone(): TableSchema<T> {
    return new TableSchema({ ...this.config });
  }

  /**
   * Converts schema to a serializable format
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      region: this.region,
      billingMode: this.billingMode,
      timeToLive: this.timeToLive,
      schema: Object.fromEntries(
        Object.entries(this.schema).map(([key, attr]) => [
          key,
          {
            isPrimary: 'isPrimary' in attr ? attr.isPrimary : false,
            keyType: 'keyType' in attr ? attr.keyType : undefined,
            required: attr.required,
            attrName: attr.attrName,
          },
        ])
      ),
    };
  }
}

/**
 * Legacy factory functions for backward compatibility
 * Provides familiar API while using modern implementation
 */
export const TableSchemaLegacy = {
  /**
   * Creates a table schema (legacy API)
   */
  create: <T extends Record<string, unknown>>(
    name: string,
    definition: SchemaDefinition<T>
  ): TableSchema<T> => {
    return TableSchema.define(name, definition);
  },

  /**
   * Creates a partition key attribute (legacy API)
   */
  pk: <T = string>(
    attrName = 'pk',
    template?: string
  ): PrimaryKeyAttributeImpl<T> => {
    return AttributeFactory.partitionKey<T>(attrName, template);
  },

  /**
   * Creates a sort key attribute (legacy API)
   */
  sk: <T = string>(
    attrName = 'sk',
    template?: string
  ): PrimaryKeyAttributeImpl<T> => {
    return AttributeFactory.sortKey<T>(attrName, template);
  },

  /**
   * Creates a string attribute (legacy API)
   */
  string: (attrName?: string): ReturnType<typeof AttributeFactory.string> => {
    return AttributeFactory.string(attrName);
  },

  /**
   * Creates a number attribute (legacy API)
   */
  number: (attrName?: string): ReturnType<typeof AttributeFactory.number> => {
    return AttributeFactory.number(attrName);
  },

  /**
   * Creates a date attribute (legacy API)
   */
  date: (attrName?: string): ReturnType<typeof AttributeFactory.date> => {
    return AttributeFactory.date(attrName);
  },
} as const;
