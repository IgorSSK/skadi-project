import {
  TransactWriteCommand,
  type TransactWriteCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import type { z } from 'zod';
import type { ConnectedTable } from '../table/connection.js';

import { DynamoOperationError } from '../errors.js';
import type { EntitySchemaDefinition, TransactionResult } from '../types.js';
import { BaseBuilder, type DynamoResult } from './base-builder.js';

export class EntityTransactionBuilder<
  TSchema extends z.ZodObject<EntitySchemaDefinition>,
> extends BaseBuilder<TransactionResult> {
  private _writes: Array<Record<string, unknown>> = [];
  private schema: TSchema;

  constructor(table: ConnectedTable, schema: TSchema) {
    super(table);
    this.schema = schema;
  }

  put(item: z.input<TSchema>) {
    this._writes.push({
      Put: {
        TableName: this.table.tableName,
        Item: this.schema.parse(item),
      },
    });
    return this;
  }

  update(
    key: z.input<TSchema['shape']['pk']> &
      (TSchema['shape']['sk'] extends z.ZodTypeAny
        ? z.input<TSchema['shape']['sk']>
        : Record<string, never>),
    updates: Partial<z.input<TSchema>>
  ) {
    // Transform template-based key to DynamoDB format
    const pkValue = this.schema.shape.pk.parse(key);
    const dynamoKey: Record<string, unknown> = { pk: pkValue };

    if (this.schema.shape.sk) {
      const skValue = this.schema.shape.sk.parse(key);
      dynamoKey.sk = skValue;
    }

    // Simple SET update only
    const updateKeys = Object.keys(updates);
    const updateExpr = updateKeys.map(k => `#${k} = :${k}`).join(', ');
    const exprAttrNames = Object.fromEntries(updateKeys.map(k => [`#${k}`, k]));
    const exprAttrValues = Object.fromEntries(
      updateKeys.map(k => [`:${k}`, (updates as Record<string, unknown>)[k]])
    );
    this._writes.push({
      Update: {
        TableName: this.table.tableName,
        Key: dynamoKey,
        UpdateExpression: `SET ${updateExpr}`,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
      },
    });
    return this;
  }

  delete(
    key: z.input<TSchema['shape']['pk']> &
      (TSchema['shape']['sk'] extends z.ZodTypeAny
        ? z.input<TSchema['shape']['sk']>
        : Record<string, never>)
  ) {
    // Transform template-based key to DynamoDB format
    const pkValue = this.schema.shape.pk.parse(key);
    const dynamoKey: Record<string, unknown> = { pk: pkValue };

    if (this.schema.shape.sk) {
      const skValue = this.schema.shape.sk.parse(key);
      dynamoKey.sk = skValue;
    }

    this._writes.push({
      Delete: {
        TableName: this.table.tableName,
        Key: dynamoKey,
      },
    });
    return this;
  }

  async execute(): Promise<DynamoResult<TransactionResult>> {
    if (!this._writes.length) {
      return [null, new DynamoOperationError('No transaction writes provided')];
    }
    const params = {
      TransactItems: this._writes,
    };
    const [_, opErr] = await this.send<TransactWriteCommandOutput>(
      new TransactWriteCommand(params)
    );
    if (opErr) return [null, opErr];
    return [{ success: true }, null];
  }
}
