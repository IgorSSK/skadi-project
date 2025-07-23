import {
  UpdateCommand,
  type UpdateCommandInput,
  type UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import type { z } from 'zod';
import { EntityValidationError, MissingKeyError } from '../errors.js';
import type { ConnectedTable } from '../table/connection.js';
import type { EntitySchemaDefinition } from '../types.js';
import { BaseBuilder, type DynamoResult } from './base-builder.js';

export class EntityUpdateBuilder<
  TSchema extends z.ZodObject<EntitySchemaDefinition>,
> extends BaseBuilder<z.infer<TSchema> | null> {
  private _key: Record<string, unknown> | undefined;
  private _updates: Partial<z.input<TSchema>> | undefined;
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

  set(updates: Partial<z.input<TSchema>>) {
    this._updates = updates;
    return this;
  }

  condition(expression: string) {
    this._condition = expression;
    return this;
  }

  async execute(): Promise<DynamoResult<z.infer<TSchema> | null>> {
    if (!this._key || !this._updates) {
      return [
        null,
        new MissingKeyError(
          'Key and updates are required for update operation.'
        ),
      ];
    }
    // Build UpdateExpression and ExpressionAttributeValues
    const updateKeys = Object.keys(this._updates);
    const updateExpr = updateKeys.map(k => `#${k} = :${k}`).join(', ');
    const exprAttrNames = Object.fromEntries(updateKeys.map(k => [`#${k}`, k]));
    const exprAttrValues = Object.fromEntries(
      updateKeys.map(k => [
        `:${k}`,
        (this._updates as Record<string, unknown>)[k],
      ])
    );
    const params: UpdateCommandInput = {
      TableName: this.table.tableName,
      Key: this._key,
      UpdateExpression: `SET ${updateExpr}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    };
    if (this._condition) {
      params.ConditionExpression = this._condition;
    }
    const [output, opErr] = await this.send<UpdateCommandOutput>(
      new UpdateCommand(params)
    );
    if (opErr) return [null, opErr];
    if (!output || !('Attributes' in output) || !output.Attributes)
      return [null, null];
    try {
      const parsed = this.schema.parse(output.Attributes);
      return [parsed, null];
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
