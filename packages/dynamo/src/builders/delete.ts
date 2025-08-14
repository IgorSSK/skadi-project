import { DeleteCommand, type DeleteCommandInput, type DeleteCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { z } from "zod";
import { MissingKeyError } from "../errors.js";
import type { ConnectedTable } from "../table/connection.js";
import type { EntitySchemaDefinition } from "../types.js";
import { deserialize } from "../utils/transformer.js";
import { BaseBuilder, type DynamoResult } from "./base-builder.js";

export class EntityDeleteBuilder<TSchema extends z.ZodObject<EntitySchemaDefinition>> extends BaseBuilder<Record<
	string,
	unknown
> | null> {
	private _key: Record<string, unknown> | undefined;
	private _condition?: string;
	private schema: TSchema;

	constructor(table: ConnectedTable, schema: TSchema) {
		super(table);
		this.schema = schema;
	}

	key(
		keyData: z.input<TSchema["shape"]["pk"]> &
			(TSchema["shape"]["sk"] extends z.ZodTypeAny ? z.input<TSchema["shape"]["sk"]> : Record<string, never>),
	) {
		// Transform template-based key to DynamoDB format
		const pkValue = this.schema.shape.pk.parse(keyData);
		this._key = { pk: pkValue };

		if (this.schema.shape.sk) {
			const skValue = this.schema.shape.sk.parse(keyData);
			this._key.sk = skValue;
		}

		return this;
	}

	condition(expression: string) {
		this._condition = expression;
		return this;
	}

	async exec(): Promise<DynamoResult<Record<string, unknown> | null>> {
		if (!this._key) {
			return [null, new MissingKeyError("A key must be provided for the delete operation.")];
		}
		const params: DeleteCommandInput = {
			TableName: this.table.tableName,
			Key: this._key,
			ReturnValues: "ALL_OLD",
		};
		if (this._condition) {
			params.ConditionExpression = this._condition;
		}
		const [output, opErr] = await this.send<DeleteCommandOutput>(new DeleteCommand(params));
		if (opErr) return [null, opErr];

		if (!output?.Attributes) {
			return [null, null];
		}

		const deserialized = deserialize(output.Attributes, this.schema);

		return [deserialized, null];
	}
}
