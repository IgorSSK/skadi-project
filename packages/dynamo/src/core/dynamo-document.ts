import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, type GetCommandBuilder } from "../builders/get-command.js";
import { PutCommand, type PutCommandBuilder } from "../builders/put-command.js";
import { DynamoConfigurationError } from "../errors/index.js";
import type { CommandResult } from "../types/index.js";
import { type DynamoClientConfig, defaultClientFactory } from "./client-factory.js";
import type { TableSchema } from "./table-schema.js";

/**
 * Configuration options for DynamoDocument
 */
export interface DynamoDocumentOptions<T extends Record<string, unknown>> {
	readonly schema: TableSchema<T>;
	readonly region?: string;
	readonly clientConfig?: Partial<DynamoClientConfig>;
	readonly client?: DynamoDBDocumentClient;
}

/**
 * Main entry point for DynamoDB operations with enhanced type safety
 * Implements Repository Pattern with Command Pattern for operations
 *
 * @example
 * ```typescript
 * const userSchema = TableSchema.define('users', {
 *   pk: AttributeFactory.partitionKey('userId'),
 *   email: AttributeFactory.string('email').asRequired(),
 *   name: AttributeFactory.string('name').asRequired(),
 *   age: AttributeFactory.number('age'),
 *   createdAt: AttributeFactory.date('createdAt').asRequired(),
 * });
 *
 * const document = new DynamoDocument({
 *   schema: userSchema,
 *   region: 'us-east-1'
 * });
 *
 * // Type-safe operations
 * const [user, error] = await document.get().withKeys({ pk: 'user-123' }).execute();
 * ```
 */
export class DynamoDocument<T extends Record<string, unknown>> {
	private readonly client: DynamoDBDocumentClient;
	public readonly schema: TableSchema<T>;

	constructor(options: DynamoDocumentOptions<T>) {
		this.schema = options.schema;

		// Validate options
		if (!this.schema) {
			throw new DynamoConfigurationError("Schema is required");
		}

		// Use provided client or create one
		if (options.client) {
			this.client = options.client;
		} else {
			const region = options.region || this.schema.region;
			this.client = defaultClientFactory.createDocumentClient(region, options.clientConfig);
		}
	}

	/**
	 * Creates a GET command builder for retrieving items
	 *
	 * @example
	 * ```typescript
	 * const [user, error] = await doc
	 *   .get()
	 *   .withKeys({ pk: 'user-123' })
	 *   .withProjection(['name', 'email'])
	 *   .withConsistentRead(true)
	 *   .execute();
	 * ```
	 */
	public get(): GetCommandBuilder<T> {
		return GetCommand.builder(this.client, this.schema);
	}

	/**
	 * Creates a PUT command builder for storing items
	 *
	 * @example
	 * ```typescript
	 * const [, error] = await doc
	 *   .put()
	 *   .withItem({
	 *     pk: 'user-123',
	 *     email: 'user@example.com',
	 *     name: 'John Doe',
	 *     age: 30,
	 *     createdAt: new Date()
	 *   })
	 *   .withConditionNotExists('pk')
	 *   .execute();
	 * ```
	 */
	public put(): PutCommandBuilder<T> {
		return PutCommand.builder(this.client, this.schema);
	}

	// Legacy API methods for backward compatibility

	/**
	 * Legacy method: Gets an item by primary keys
	 * @deprecated Use get().withKeys(keys).execute() instead
	 */
	public async getItem(keys: Partial<T>): Promise<CommandResult<T | null>> {
		return this.get().withKeys(keys).execute();
	}

	/**
	 * Legacy method: Puts an item
	 * @deprecated Use put().withItem(item).execute() instead
	 */
	public async putItem(item: T): Promise<CommandResult<void>> {
		return this.put().withItem(item).execute();
	}

	/**
	 * Gets table information and configuration
	 */
	public getTableInfo(): {
		name: string;
		region: string;
		billingMode: string;
		timeToLive?: {
			attributeName: keyof T;
			enabled: boolean;
		};
	} {
		return {
			name: this.schema.name,
			region: this.schema.region,
			billingMode: this.schema.billingMode,
			timeToLive: this.schema.timeToLive,
		};
	}

	/**
	 * Validates an item against the schema
	 */
	public validateItem(item: unknown): item is T {
		return this.schema.validateItem(item);
	}

	/**
	 * Extracts primary keys from an item
	 */
	public extractPrimaryKeys(item: T): Partial<T> {
		return this.schema.extractPrimaryKeys(item);
	}

	/**
	 * Creates a copy of this document with different configuration
	 */
	public withRegion(region: string): DynamoDocument<T> {
		return new DynamoDocument({
			schema: this.schema.withRegion(region),
			region,
		});
	}

	/**
	 * Creates a copy of this document with different schema
	 */
	public withSchema<U extends Record<string, unknown>>(schema: TableSchema<U>): DynamoDocument<U> {
		return new DynamoDocument({
			schema,
			client: this.client,
		});
	}

	/**
	 * Closes the underlying client connections
	 */
	public destroy(): void {
		if (typeof this.client.destroy === "function") {
			this.client.destroy();
		}
	}
}
