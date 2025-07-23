import type { TableSchema } from '../core/table-schema.js';
import type { ExtractPrimaryKeys, InferItemType } from '../types/index.js';

export type CommandItem<TSchema extends TableSchema<Record<string, unknown>>> =
  InferItemType<TSchema['schemaDefinition']>;
export type CommandKey<TSchema extends TableSchema<Record<string, unknown>>> =
  ExtractPrimaryKeys<TSchema['schemaDefinition']>;
