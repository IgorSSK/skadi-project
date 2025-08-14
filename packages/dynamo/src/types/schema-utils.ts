/**
 * Utilitários de tipagem dinâmica para TableSchema
 * Permitem inferir tipos de item, chaves e atributos a partir do schema declarado.
 *
 * @module schema-utils
 */

import type { Attribute } from "../schema/attribute.js";
import type { TableSchemaDefinition } from "../schema/table-schema.js";
import type { TemplateKey } from "../schema/template-key.js";

/**
 * Infere o tipo de item (objeto) a partir de um TableSchemaDefinition.
 * Cada chave recebe o tipo declarado no schema.
 */
export type InferItemType<TDef extends TableSchemaDefinition<unknown>> = {
	[K in keyof TDef]: TDef[K] extends Attribute<infer T> ? T : TDef[K] extends TemplateKey<infer T> ? T : never;
};

/**
 * Extrai as chaves primárias (pk, sk) do schema.
 * Retorna um objeto apenas com as chaves do tipo TemplateKey.
 */
export type ExtractPrimaryKeys<TDef extends TableSchemaDefinition<unknown>> = {
	[K in keyof TDef as TDef[K] extends TemplateKey<unknown> ? K : never]: TDef[K] extends TemplateKey<infer T>
		? T
		: never;
};

/**
 * Extrai os atributos não-chave do schema.
 * Retorna um objeto apenas com os atributos do tipo Attribute.
 */
export type ExtractAttributes<TDef extends TableSchemaDefinition<unknown>> = {
	[K in keyof TDef as TDef[K] extends Attribute<unknown> ? K : never]: TDef[K] extends Attribute<infer T> ? T : never;
};
