import { DeleteCommand, type DeleteCommandInput } from '@aws-sdk/lib-dynamodb';
import type { z } from 'zod';
import { MissingKeyError } from '../errors.js';
import type { ConnectedTable } from '../table/connection.js';
import type { EntitySchemaDefinition } from '../types.js';
import { BaseBuilder, type DynamoResult } from './base-builder.js';

export class EntityDeleteBuilder<
  TSchema extends z.ZodObject<EntitySchemaDefinition>,
> extends BaseBuilder<Record<string, unknown>> {
  private _key: Record<string, unknown> | undefined;
  private _condition?: string;
  private schema: TSchema;

  constructor(table: ConnectedTable, schema: TSchema) {
    super(table);
    this.schema = schema;
  }

  key(
    keyData: z.input<TSchema['shape']['pk']> &
      (TSchema['shape']['sk'] extends z.ZodTypeAny
        ? z.input<TSchema['shape']['sk']>
        : Record<string, never>)
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

  async execute(): Promise<DynamoResult<Record<string, unknown>>> {
    if (!this._key) {
      return [
        null,
        new MissingKeyError('A key must be provided for the delete operation.'),
      ];
    }
    const params: DeleteCommandInput = {
      TableName: this.table.tableName,
      Key: this._key,
    };
    if (this._condition) {
      params.ConditionExpression = this._condition;
    }
    const [_, opErr] = await this.send(new DeleteCommand(params));
    if (opErr) return [null, opErr];
    return [this._key, null];
  }
}
