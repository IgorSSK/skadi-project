import { GetCommand, type GetCommandInput, type GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { ZodError, type z } from "zod";
import type { ConnectedTable } from "../client/table.js";
import { type DynamoOperationError, EntityValidationError, MissingKeyError } from "../common/errors.js";
import { deserialize } from "../common/transformer.js";
import type { EntitySchemaDefinition } from "../common/types.js";
import { BaseBuilder } from "./base-operation.js";

export class EntityGetBuilder<
	TSchema extends z.ZodObject<EntitySchemaDefinition>,
> extends BaseBuilder<z.infer<TSchema> | null> {
	private _key: Record<string, unknown> | undefined;
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

	async exec(): Promise<[z.TypeOf<TSchema> | null, DynamoOperationError | null]> {
		if (!this._key) {
			return [null, new MissingKeyError("A key must be provided for the get operation.")];
		}
		const params: GetCommandInput = {
			TableName: this.table.tableName,
			Key: this._key,
		};
		const [output, opErr] = await this.send<GetCommandOutput>(new GetCommand(params));
		if (opErr) return [null, opErr];
		if (!output || !("Item" in output) || !output.Item) return [null, null];
		try {
			const deserialized = deserialize(output.Item, this.schema);
			const parsed = this.schema.parse(deserialized);
			return [parsed, null];
		} catch (err) {
			const issues = err instanceof ZodError ? (err as ZodError).issues : undefined;
			return [null, new EntityValidationError("Entity validation failed", issues)];
		}
	}
}
