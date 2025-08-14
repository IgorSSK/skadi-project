// Funções utilitárias para manipulação de schemas

import type { TableSchema } from "../schema/table-schema.js";
import type { InferItemType } from "../types/schema-utils.js";

/**
 * Infere o tipo de item a partir de um TableSchema.
 * Útil para garantir tipagem forte em funções utilitárias.
 */
export type InferSchemaItem<TSchema extends TableSchema<unknown>> = InferItemType<TSchema["definition"]>;

/**
 * Valida se um objeto corresponde ao schema (validação runtime simplificada).
 * Pode ser expandida para validação real dos tipos e atributos.
 *
 * @param schema - O TableSchema usado como referência
 * @param item - O objeto a ser validado
 * @returns true se o item for um objeto não-nulo
 */
export function validateItem<TSchema extends TableSchema<unknown>>(
	schema: TSchema,
	item: unknown,
): item is InferSchemaItem<TSchema> {
	if (typeof item !== "object" || item === null) return false;
	const def = schema.definition;
	for (const key in def) {
		if (Object.hasOwn(def, key)) {
			const attr = def[key as keyof typeof def];
			const isKey = typeof attr === "object" && attr !== null && "attrName" in attr;
			if (isKey && !(key in (item as object))) {
				return false;
			}
		}
	}
	return true;
}
