import { QueryCommand, type QueryCommandInput, type QueryCommandOutput } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import type { ConnectedTable } from "../table/connection.js";
import type { EntitySchemaDefinition, QueryResult } from "../types.js";
import { deserialize } from "../utils/transformer.js";

/**
 * Builder for querying DynamoDB items
 *
 * Provides a fluent interface for constructing DynamoDB Query operations
 * with support for partition key queries, Global Secondary Index queries,
 * filtering, and pagination.
 *
 * @template TSchema - The Zod schema type for the entity
 */
export class EntityQueryBuilder<TSchema extends z.ZodObject<EntitySchemaDefinition>> {
	constructor(
		private table: ConnectedTable,
		private schema: TSchema,
	) {}

	/**
	 * Sets the partition key for the query
	 *
	 * @param pkData - Partition key data that will be transformed using the schema
	 * @returns QueryKeyBuilder for adding sort key conditions and filters
	 *
	 * @example
	 * ```typescript
	 * const results = await Entity.query()
	 *   .pk({ userId: 'user-123' })
	 *   .exec();
	 * ```
	 */
	pk(pkData: z.input<TSchema["shape"]["pk"]>) {
		// Parse template-based pk (e.g. { userId: 'x' } -> 'USER#x') before querying
		const parsedPk = this.schema.shape.pk.parse(pkData);
		return new QueryKeyBuilder(this.table, this.schema, parsedPk, undefined);
	}

	/**
	 * Queries using a Global Secondary Index
	 *
	 * @param indexAlias - Alias of the GSI as defined in table configuration
	 * @returns QueryIndexBuilder for GSI-specific queries
	 * @throws Error if the GSI alias is not found
	 *
	 * @example
	 * ```typescript
	 * const results = await Entity.query()
	 *   .index('byStatus')
	 *   .pk({ status: 'ACTIVE' })
	 *   .exec();
	 * ```
	 */
	index(indexAlias: string) {
		const gsiConfig = this.table.getGsiByAlias(indexAlias);
		if (!gsiConfig) {
			throw new Error(`GSI with alias '${indexAlias}' not found`);
		}
		return new QueryIndexBuilder(this.table, this.schema, gsiConfig);
	}
}

/**
 * Builder for constructing DynamoDB queries with sort key conditions
 *
 * Handles query conditions, filters, sorting, and pagination for DynamoDB
 * Query operations after the partition key has been specified.
 *
 * @template TSchema - The Zod schema type for the entity
 */
import { BaseBuilder, type DynamoResult } from "./base-builder.js";

class QueryKeyBuilder<TSchema extends z.ZodObject<EntitySchemaDefinition>> extends BaseBuilder<
	QueryResult<z.infer<TSchema>>
> {
	private conditions: Array<{
		field: string;
		operator: string;
		value: unknown;
	}> = [];
	private filters: Array<{ field: string; operator: string; value: unknown }> = [];
	private limitValue?: number;
	private cursorValue?: string;
	private ascending = true;
	private schema: TSchema;
	private pkData: unknown;
	private gsiConfig?: {
		indexName: string;
		alias: string;
		partitionKey: string;
		sortKey?: string;
	};

	constructor(
		table: ConnectedTable,
		schema: TSchema,
		pkData: unknown,
		gsiConfig?: {
			indexName: string;
			alias: string;
			partitionKey: string;
			sortKey?: string;
		},
	) {
		super(table);
		this.schema = schema;
		this.pkData = pkData;
		this.gsiConfig = gsiConfig;
	}

	/**
	 * Adds a sort key condition to the query
	 *
	 * @param operator - Comparison operator for the sort key
	 * @param value - Value to compare against
	 * @param value2 - Second value for 'between' operator
	 * @returns This builder instance
	 *
	 * @example
	 * ```typescript
	 * // Exact match
	 * .sk('=', 'PROFILE')
	 *
	 * // Range conditions
	 * .sk('>', '2023-01-01')
	 * .sk('between', '2023-01-01', '2023-12-31')
	 *
	 * // String operations
	 * .sk('begins_with', 'ORDER#')
	 * ```
	 */
	sk(operator: "=" | "<" | "<=" | ">" | ">=" | "between" | "begins_with", value: unknown, value2?: unknown) {
		this.conditions.push({ field: "sk", operator, value });
		if (value2 !== undefined) {
			this.conditions.push({ field: "sk", operator: "and", value: value2 });
		}
		return this;
	}

	/**
	 * Adds a filter expression to the query
	 *
	 * Filter expressions are applied after the query is executed,
	 * which means they don't reduce the consumed read capacity.
	 *
	 * @param field - Field name to filter on
	 * @param operator - Filter operator
	 * @param value - Value to filter against
	 * @returns This builder instance
	 *
	 * @example
	 * ```typescript
	 * .filter('isActive', '=', true)
	 * .filter('age', '>', 18)
	 * .filter('status', 'IN', ['ACTIVE', 'PENDING'])
	 * .filter('title', 'contains', 'admin')
	 * ```
	 */
	filter(field: string, operator: "=" | "<" | "<=" | ">" | ">=" | "contains" | "begins_with" | "IN", value: unknown) {
		this.filters.push({ field, operator, value });
		return this;
	}

	/**
	 * Sets the maximum number of items to return
	 *
	 * @param count - Maximum number of items (1-1000)
	 * @returns This builder instance
	 *
	 * @example
	 * ```typescript
	 * .limit(50) // Return at most 50 items
	 * ```
	 */
	limit(count: number) {
		this.limitValue = count;
		return this;
	}

	/**
	 * Sets the pagination cursor for continued queries
	 *
	 * @param cursor - Base64-encoded pagination cursor from previous query
	 * @returns This builder instance
	 *
	 * @example
	 * ```typescript
	 * .cursor(result.cursor) // Continue from previous query
	 * ```
	 */
	cursor(cursor?: string) {
		this.cursorValue = cursor;
		return this;
	}

	/**
	 * Sets the sort direction for the query results
	 *
	 * @param direction - Sort direction ('ASC' for ascending, 'DESC' for descending)
	 * @returns This builder instance
	 *
	 * @example
	 * ```typescript
	 * .sortBy('DESC') // Most recent first
	 * .sortBy('ASC')  // Oldest first
	 * ```
	 */
	sortBy(direction: "ASC" | "DESC") {
		this.ascending = direction === "ASC";
		return this;
	}

	/**
	 * Executes the query and returns the results
	 *
	 * Builds and executes a DynamoDB Query operation with all configured
	 * conditions, filters, and options.
	 *
	 * @returns Promise that resolves to query results with items and cursor
	 *
	 * @example
	 * ```typescript
	 * const result = await Entity.query()
	 *   .pk({ userId: 'user-123' })
	 *   .filter('isActive', '=', true)
	 *   .limit(10)
	 *   .exec();
	 *
	 * console.log(result.items);    // Array of matching items
	 * console.log(result.cursor);   // Pagination cursor for next page
	 * ```
	 */
	async exec(): Promise<DynamoResult<QueryResult<z.infer<TSchema>>>> {
		// Determine attribute names (base table vs GSI)
		const pkAttr = this.gsiConfig ? this.gsiConfig.partitionKey : "pk";
		const skAttr = this.gsiConfig ? this.gsiConfig.sortKey || "sk" : "sk";

		// Build KeyConditionExpression
		let keyExpr = "#pk = :pk";
		const exprAttrNames: Record<string, string> = { "#pk": pkAttr };
		const exprAttrValues: Record<string, unknown> = { ":pk": this.pkData };
		for (const cond of this.conditions) {
			if (cond.field === "sk") {
				if (cond.operator === "begins_with") {
					keyExpr += " AND begins_with(#sk, :sk)";
					exprAttrNames["#sk"] = skAttr;
					exprAttrValues[":sk"] = cond.value;
				} else if (cond.operator === "between") {
					// between stored as two conditions (first plus 'and') in existing logic
					// We'll adapt: first entry has operator 'between' value=v1, second has operator 'and' value=v2
					// Reconstruct between when both present
					const firstVal = cond.value;
					const secondCond = this.conditions.find((c) => c.operator === "and");
					if (secondCond) {
						keyExpr += " AND #sk BETWEEN :sk1 AND :sk2";
						exprAttrNames["#sk"] = skAttr;
						exprAttrValues[":sk1"] = firstVal;
						exprAttrValues[":sk2"] = secondCond.value;
					} else {
						keyExpr += " AND #sk BETWEEN :sk AND :sk2"; // fallback if structure unexpected
						exprAttrNames["#sk"] = skAttr;
						exprAttrValues[":sk"] = firstVal;
					}
				} else if (cond.operator !== "and") {
					keyExpr += ` AND #sk ${cond.operator} :sk`;
					exprAttrNames["#sk"] = skAttr;
					exprAttrValues[":sk"] = cond.value;
				}
			}
		}
		// Build FilterExpression
		let filterExpr = "";
		for (const filter of this.filters) {
			if (filterExpr) filterExpr += " AND ";
			if (filter.operator === "begins_with") {
				filterExpr += `begins_with(#${filter.field}, :${filter.field})`;
			} else if (filter.operator === "contains") {
				filterExpr += `contains(#${filter.field}, :${filter.field})`;
			} else if (filter.operator === "IN") {
				// Handle IN operator with array values
				const values = Array.isArray(filter.value) ? filter.value : [filter.value];
				const valueKeys = values.map((_, i) => `:${filter.field}_${i}`);
				filterExpr += `#${filter.field} IN (${valueKeys.join(", ")})`;
				values.forEach((val, i) => {
					exprAttrValues[`:${filter.field}_${i}`] = val;
				});
			} else {
				filterExpr += `#${filter.field} ${filter.operator} :${filter.field}`;
				exprAttrValues[`:${filter.field}`] = filter.value;
			}
			exprAttrNames[`#${filter.field}`] = filter.field;
			if (filter.operator !== "IN") {
				exprAttrValues[`:${filter.field}`] = filter.value;
			}
		}
		const params: QueryCommandInput = {
			TableName: this.table.tableName,
			KeyConditionExpression: keyExpr,
			ExpressionAttributeNames: exprAttrNames,
			ExpressionAttributeValues: exprAttrValues,
			Limit: this.limitValue,
			ScanIndexForward: this.ascending,
		};
		if (this.gsiConfig) {
			params.IndexName = this.gsiConfig.indexName;
		}
		if (filterExpr) {
			params.FilterExpression = filterExpr;
		}
		if (this.cursorValue && typeof this.cursorValue === "object") {
			params.ExclusiveStartKey = this.cursorValue as Record<string, unknown>;
		}
		const [output, opErr] = await this.send<QueryCommandOutput>(new QueryCommand(params));
		if (opErr) return [null, opErr];
		try {
			const items = (output?.Items ?? []).map((item: Record<string, unknown>) => {
				const deserialized = deserialize(item, this.schema);
				return this.schema.parse(deserialized);
			});
			return [
				{
					items,
					cursor: output?.LastEvaluatedKey as Record<string, unknown> | undefined,
					count: items.length,
					scannedCount: output?.ScannedCount ?? undefined,
				},
				null,
			];
		} catch (err) {
			const { EntityValidationError } = require("../errors.js");
			return [
				null,
				new EntityValidationError("Entity validation failed", err instanceof z.ZodError ? err.issues : undefined),
			];
		}
	}

	/**
	 * Returns a streaming interface for processing large result sets
	 * @returns Object with process method for streaming results
	 */
	stream() {
		return {
			/**
			 * Processes query results in a streaming fashion
			 * @param processor - Function to process each item
			 * @param options - Optional configuration for concurrency
			 * @returns Promise that resolves when all items are processed
			 */
			process: async (processor: (item: z.infer<TSchema>) => Promise<void>, options?: { concurrency?: number }) => {
				const concurrency = options?.concurrency || 10;
				let cursor: string | undefined;

				do {
					const [result, error] = await this.cursor(cursor).exec();
					if (error) throw error;
					if (!result) break;

					// Process items in batches with concurrency control
					for (let i = 0; i < result.items.length; i += concurrency) {
						const batch = result.items.slice(i, i + concurrency);
						await Promise.all(batch.map((item) => processor(item)));
					}

					cursor = typeof result.cursor === "string" ? result.cursor : undefined;
				} while (cursor);
			},
		};
	}
}

/**
 * Builder for constructing queries on Global Secondary Indexes
 *
 * Handles GSI-specific query setup before delegating to QueryKeyBuilder
 * for the actual query construction.
 *
 * @template TSchema - The Zod schema type for the entity
 */
class QueryIndexBuilder<TSchema extends z.ZodObject<EntitySchemaDefinition>> {
	constructor(
		private table: ConnectedTable,
		private schema: TSchema,
		private gsiConfig: unknown,
	) {}

	/**
	 * Sets the partition key for the GSI query
	 *
	 * @param pkData - Partition key data for the GSI
	 * @returns QueryKeyBuilder configured for the specified GSI
	 *
	 * @example
	 * ```typescript
	 * const results = await Entity.query()
	 *   .index('byStatus')
	 *   .pk({ status: 'ACTIVE' })
	 *   .sortBy('DESC')
	 *   .limit(20)
	 *   .exec();
	 * ```
	 */
	pk(pkData: unknown) {
		// Attempt to parse using matching GSI pk field in schema if available
		let parsedPk: unknown = pkData;
		const gsi = this.gsiConfig as {
			indexName: string;
			alias: string;
			partitionKey: string;
			sortKey?: string;
		};
		for (const [fieldName, fieldSchema] of Object.entries(this.schema.shape)) {
			if (fieldName.toLowerCase() === gsi.partitionKey.replace(/_/g, "").toLowerCase()) {
				try {
					parsedPk = (fieldSchema as z.ZodTypeAny).parse(pkData);
				} catch {
					parsedPk = pkData;
				}
				break;
			}
		}
		return new QueryKeyBuilder(this.table, this.schema, parsedPk, gsi);
	}
}
