import type { z } from "zod";
import type { ConnectedTable } from "../client/table.js";
import type { EntitySchemaDefinition } from "../common/types.js";
import {
	EntityBatchGetBuilder,
	EntityCreateBuilder,
	EntityDeleteBuilder,
	EntityGetBuilder,
	EntityQueryBuilder,
	EntityTransactionBuilder,
	EntityUpdateBuilder,
} from "../operations/index.js";

/**
 * Represents a fully configured DynamoDB entity that provides access
 * to all CRUD operations, batch operations, and transactions through
 * a fluent builder interface.
 *
 * @template TName - The literal type of the entity name
 * @template TSchema - The Zod schema type for the entity
 */
export class Entity<TName extends string, TSchema extends z.ZodObject<EntitySchemaDefinition>> {
	constructor(
		/** The name of the entity */
		public readonly entityName: TName,
		/** The connected table configuration */
		public readonly table: ConnectedTable,
		/** The Zod schema for the entity */
		public readonly schema: TSchema,
	) {}

	/**
	 * Creates a new item creation builder
	 *
	 * @returns EntityCreateBuilder for inserting new items
	 *
	 * @example
	 * ```typescript
	 * const user = await UserEntity.create()
	 *   .item({
	 *     userId: 'user-123',
	 *     name: 'John Doe',
	 *     email: 'john@example.com'
	 *   })
	 *   .exec();
	 * ```
	 */
	create() {
		return new EntityCreateBuilder(this.table, this.schema);
	}

	/**
	 * Creates a new item retrieval builder
	 *
	 * @returns EntityGetBuilder for fetching items by key
	 *
	 * @example
	 * ```typescript
	 * const user = await UserEntity.get()
	 *   .key({ userId: 'user-123' })
	 *   .exec();
	 * ```
	 */
	get() {
		return new EntityGetBuilder(this.table, this.schema);
	}

	/**
	 * Creates a new query builder
	 *
	 * @returns EntityQueryBuilder for querying items
	 *
	 * @example
	 * ```typescript
	 * const users = await UserEntity.query()
	 *   .pk({ organizationId: 'org-123' })
	 *   .filter('isActive', '=', true)
	 *   .limit(10)
	 *   .exec();
	 * ```
	 */
	query() {
		return new EntityQueryBuilder(this.table, this.schema);
	}

	/**
	 * Creates a new item update builder
	 *
	 * @returns EntityUpdateBuilder for modifying existing items
	 *
	 * @example
	 * ```typescript
	 * const updated = await UserEntity.update()
	 *   .key({ userId: 'user-123' })
	 *   .set({ name: 'Jane Doe', updatedAt: new Date() })
	 *   .exec();
	 * ```
	 */
	update() {
		return new EntityUpdateBuilder(this.table, this.schema);
	}

	/**
	 * Creates a new item deletion builder
	 *
	 * @returns EntityDeleteBuilder for removing items
	 *
	 * @example
	 * ```typescript
	 * await UserEntity.delete()
	 *   .key({ userId: 'user-123' })
	 *   .condition('attribute_exists(email)')
	 *   .exec();
	 * ```
	 */
	delete() {
		return new EntityDeleteBuilder(this.table, this.schema);
	}

	/**
	 * Creates a new batch get builder for retrieving multiple items
	 *
	 * @returns EntityBatchGetBuilder for fetching multiple items by keys
	 *
	 * @example
	 * ```typescript
	 * const users = await UserEntity.batchGet()
	 *   .keys([
	 *     { userId: 'user-123' },
	 *     { userId: 'user-456' },
	 *     { userId: 'user-789' }
	 *   ])
	 *   .exec();
	 * ```
	 */
	batchGet() {
		return new EntityBatchGetBuilder(this.table, this.schema);
	}

	/**
	 * Creates a new transaction builder for atomic multi-item operations
	 *
	 * @returns EntityTransactionBuilder for executing atomic transactions
	 *
	 * @example
	 * ```typescript
	 * await UserEntity.transaction()
	 *   .put({
	 *     userId: 'user-new',
	 *     name: 'New User',
	 *     email: 'new@example.com'
	 *   })
	 *   .update({ userId: 'user-123' }, { lastSeen: new Date() })
	 *   .delete({ userId: 'user-old' })
	 *   .exec();
	 * ```
	 */
	transaction() {
		return new EntityTransactionBuilder(this.table, this.schema);
	}
}
