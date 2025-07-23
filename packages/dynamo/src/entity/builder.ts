import { z } from 'zod';
import type { ConnectedTable } from '../table/connection.js';
import type { EntitySchemaDefinition } from '../types.js';
import { Entity as SkadiEntity } from './entity.js';

/**
 * Builder for creating entity definitions
 *
 * Provides a fluent interface for defining DynamoDB entities with
 * table connections and Zod schemas.
 *
 * @template TName - The literal type of the entity name
 */
export class EntityBuilder<TName extends string> {
  constructor(private entityName: TName) {}

  /**
   * Associates the entity with a connected table
   *
   * @param table - ConnectedTable instance with DynamoDB configuration
   * @returns EntityTableBuilder for schema definition
   *
   * @example
   * ```typescript
   * const entity = Entity.define('User').table(myTable);
   * ```
   */
  table(table: ConnectedTable) {
    return new EntityTableBuilder(this.entityName, table);
  }
}

/**
 * Intermediate builder for entity with table connection
 *
 * Handles schema definition and validation for the entity.
 *
 * @template TName - The literal type of the entity name
 */
class EntityTableBuilder<TName extends string> {
  constructor(
    private entityName: TName,
    private table: ConnectedTable
  ) {}

  /**
   * Defines the Zod schema for the entity
   *
   * @template TSchema - The entity schema definition type
   * @param schema - Zod schema object defining entity structure
   * @returns CompleteEntity instance ready for CRUD operations
   *
   * @example
   * ```typescript
   * const UserEntity = Entity.define('User')
   *   .table(table)
   *   .schema({
   *     pk: zdynamo.partitionKey('USER#{userId}', { userId: z.string() }),
   *     sk: zdynamo.sortKey('PROFILE', {}),
   *     name: z.string(),
   *     email: z.string().email(),
   *     createdAt: zdynamo.timestamp()
   *   });
   * ```
   */
  schema<TSchema extends EntitySchemaDefinition>(schema: TSchema) {
    this.validateRequiredKeys(schema);
    return new SkadiEntity(this.entityName, this.table, z.object(schema));
  }

  /**
   * Validates that required keys are present in the schema
   *
   * @param schema - The entity schema to validate
   * @throws Error if partition key is missing
   */
  private validateRequiredKeys(schema: EntitySchemaDefinition) {
    if (!schema.pk) {
      throw new Error(
        `Entity ${this.entityName}: Partition key (pk) is mandatory`
      );
    }
  }
}

/**
 * Static factory for creating entity definitions
 *
 * Entry point for the entity definition fluent interface.
 */
export const Entity = {
  /**
   * Creates a new entity builder with the specified name
   *
   * @template TName - The literal type of the entity name
   * @param name - Unique name for the entity
   * @returns EntityBuilder instance for further configuration
   *
   * @example
   * ```typescript
   * const UserEntity = Entity.define('User')
   *   .table(myTable)
   *   .schema({ ... });
   * ```
   */
  define<TName extends string>(name: TName) {
    return new EntityBuilder(name);
  },
};
