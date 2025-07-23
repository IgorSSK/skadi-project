import { PutCommand, type PutCommandInput } from '@aws-sdk/lib-dynamodb';
import type { z } from 'zod';
import { EntityValidationError, MissingKeyError } from '../errors.js';
import type { ConnectedTable } from '../table/connection.js';
import type { EntitySchemaDefinition } from '../types.js';
import { BaseBuilder, type DynamoResult } from './base-builder.js';

export class EntityCreateBuilder<
  TSchema extends z.ZodObject<EntitySchemaDefinition>,
> extends BaseBuilder<z.infer<TSchema>> {
  private _item: z.infer<TSchema> | undefined;
  private _condition?: string;
  private schema: TSchema;

  constructor(table: ConnectedTable, schema: TSchema) {
    super(table);
    this.schema = schema;
  }

  item(data: z.input<TSchema>) {
    this._item = this.schema.parse(data);
    return this;
  }

  condition(expression: string) {
    this._condition = expression;
    return this;
  }

  async execute(): Promise<DynamoResult<z.TypeOf<TSchema>>> {
    if (!this._item) {
      return [
        null,
        new MissingKeyError('No item provided for create operation.'),
      ];
    }
    const params: PutCommandInput = {
      TableName: this.table.tableName,
      Item: this._item,
    };
    if (this._condition) {
      params.ConditionExpression = this._condition;
    }
    try {
      const [_, opErr] = await this.send(new PutCommand(params));
      if (opErr) return [null, opErr];
      return [this._item, null];
    } catch (err) {
      return [
        null,
        new EntityValidationError(
          'Entity validation failed',
          (err as any)?.issues
        ),
      ];
    }
  }
}
