import { BatchGetCommand, type BatchGetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import type { ConnectedTable } from "../client/table.js";
import { DynamoOperationError, EntityValidationError } from "../common/errors.js";
import { deserialize } from "../common/transformer.js";
import type { BatchResult, EntitySchemaDefinition } from "../common/types.js";
import { BaseBuilder, type DynamoResult } from "./base-operation.js";

export class EntityBatchGetBuilder<TSchema extends z.ZodObject<EntitySchemaDefinition>> extends BaseBuilder<
	BatchResult<z.infer<TSchema>>
> {
	private _keys: Record<string, unknown>[] = [];
	private schema: TSchema;

	constructor(table: ConnectedTable, schema: TSchema) {
		super(table);
		this.schema = schema;
	}

	keys(
		keys: Array<
			z.input<TSchema["shape"]["pk"]> &
				(TSchema["shape"]["sk"] extends z.ZodTypeAny ? z.input<TSchema["shape"]["sk"]> : Record<string, never>)
		>,
	) {
		// Transform template-based keys to DynamoDB format
		this._keys = keys.map((keyData) => {
			const pkValue = this.schema.shape.pk.parse(keyData);
			const result: Record<string, unknown> = { pk: pkValue };

			if (this.schema.shape.sk) {
				const skValue = this.schema.shape.sk.parse(keyData);
				result.sk = skValue;
			}

			return result;
		});
		return this;
	}

	async exec(): Promise<DynamoResult<BatchResult<z.infer<TSchema>>>> {
		if (!this._keys.length) {
			return [null, new DynamoOperationError("No keys provided")];
		}
		const params = {
			RequestItems: {
				[this.table.tableName]: {
					Keys: this._keys,
				},
			},
		};
		const [output, opErr] = await this.send<BatchGetCommandOutput>(new BatchGetCommand(params));
		if (opErr) return [null, opErr];
		try {
			const items = (output?.Responses?.[this.table.tableName] ?? []).map((item: Record<string, unknown>) => {
				const deserialized = deserialize(item, this.schema);
				return this.schema.parse(deserialized);
			});
			const unprocessed = output?.UnprocessedKeys?.[this.table.tableName]?.Keys ?? [];
			return [
				{
					items,
					unprocessedKeys: unprocessed,
				},
				null,
			];
		} catch (err) {
			return [
				null,
				new EntityValidationError("Entity validation failed", err instanceof z.ZodError ? err.issues : undefined),
			];
		}
	}
}
