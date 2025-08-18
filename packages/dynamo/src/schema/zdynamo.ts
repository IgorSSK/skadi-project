import { z } from "zod";

/**
 * DynamoDB-specific Zod schema helpers for the Skadi ODM
 *
 * This object provides utility functions for creating DynamoDB-compatible
 * Zod schemas with template-based key generation and common field types.
 */
export const zdynamo = {
	/**
	 * Creates a partition key schema with template-based key generation
	 *
	 * @template T - Record type defining the template parameters
	 * @param template - Template string with #{param} placeholders (e.g., "USER#{userId}")
	 * @param params - Zod schema object defining the template parameters
	 * @returns Zod schema that transforms input params to a formatted partition key
	 *
	 * @example
	 * ```typescript
	 * const pkSchema = zdynamo.partitionKey('USER#{userId}', { userId: z.string() });
	 * // Input: { userId: 'john' } -> Output: 'USER#john'
	 * ```
	 */
	partitionKey: <T extends Record<string, z.ZodTypeAny>>(template: string, params: T) => {
		const paramSchema = z.object(params);
		const effect = paramSchema.transform((values) =>
			template.replace(/\{(\w+)\}/g, (_, key) => String(values[key as keyof typeof values])),
		);
		// Attach metadata to be used during deserialization
		(
			effect as z.ZodTypeAny & {
				_skadiKeyMeta?: { template: string; params: typeof paramSchema };
			}
		)._skadiKeyMeta = { template, params: paramSchema };
		return effect;
	},

	/**
	 * Creates a sort key schema with template-based key generation
	 *
	 * @template T - Record type defining the template parameters
	 * @param template - Template string with #{param} placeholders (e.g., "ACCOUNT#{accountId}")
	 * @param params - Zod schema object defining the template parameters
	 * @returns Zod schema that transforms input params to a formatted sort key
	 *
	 * @example
	 * ```typescript
	 * const skSchema = zdynamo.sortKey('ACCOUNT#{accountId}', { accountId: z.string() });
	 * // Input: { accountId: 'acc-123' } -> Output: 'ACCOUNT#acc-123'
	 * ```
	 */
	sortKey: <T extends Record<string, z.ZodTypeAny>>(template: string, params: T) => {
		const paramSchema = z.object(params);
		const effect = paramSchema.transform((values) =>
			template.replace(/\{(\w+)\}/g, (_, key) => String(values[key as keyof typeof values])),
		);
		(
			effect as z.ZodTypeAny & {
				_skadiKeyMeta?: { template: string; params: typeof paramSchema };
			}
		)._skadiKeyMeta = { template, params: paramSchema };
		return effect;
	},

	/**
	 * Creates a GSI partition key schema (alias for partitionKey)
	 *
	 * @template T - Record type defining the template parameters
	 * @param template - Template string with #{param} placeholders
	 * @param params - Zod schema object defining the template parameters
	 * @returns Zod schema that transforms input params to a formatted GSI partition key
	 */
	gsiPartitionKey: <T extends Record<string, z.ZodTypeAny>>(template: string, params: T) =>
		zdynamo.partitionKey(template, params),

	/**
	 * Creates a GSI sort key schema (alias for sortKey)
	 *
	 * @template T - Record type defining the template parameters
	 * @param template - Template string with #{param} placeholders
	 * @param params - Zod schema object defining the template parameters
	 * @returns Zod schema that transforms input params to a formatted GSI sort key
	 */
	gsiSortKey: <T extends Record<string, z.ZodTypeAny>>(template: string, params: T) =>
		zdynamo.sortKey(template, params),

	/**
	 * Creates a timestamp schema that defaults to the current date
	 *
	 * @returns Zod date schema with current date as default
	 *
	 * @example
	 * ```typescript
	 * const createdAt = zdynamo.timestamp();
	 * // Automatically sets to new Date() if not provided
	 * ```
	 */
	timestamp: () => z.date().default(() => new Date()),

	/**
	 * Creates a currency code schema (3-character string)
	 *
	 * @returns Zod string schema that validates 3-character currency codes
	 *
	 * @example
	 * ```typescript
	 * const currency = zdynamo.currency();
	 * // Validates strings like 'USD', 'EUR', 'BRL'
	 * ```
	 */
	currency: () => z.string().length(3).default("USD"),

	/**
	 * Creates a non-empty string schema
	 *
	 * @returns Zod string schema that requires at least 1 character
	 *
	 * @example
	 * ```typescript
	 * const title = zdynamo.nonEmptyString();
	 * // Validates non-empty strings
	 * ```
	 */
	nonEmptyString: () => z.string().min(1),

	/**
	 * Creates a positive number schema
	 *
	 * @returns Zod number schema that requires positive values
	 *
	 * @example
	 * ```typescript
	 * const balance = zdynamo.positiveNumber();
	 * // Validates numbers > 0
	 * ```
	 */
	positiveNumber: () => z.number().positive(),
};
