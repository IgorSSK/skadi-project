// Tipos utilitários para comandos baseados em schema
import type { TableSchema } from '../schema/table-schema.js';
import type {
  ExtractPrimaryKeys,
  InferItemType,
} from '../types/schema-utils.js';

export type CommandItem<TSchema extends TableSchema<unknown>> = InferItemType<
  TSchema['definition']
>;
export type CommandKey<TSchema extends TableSchema<unknown>> =
  ExtractPrimaryKeys<TSchema['definition']>;
