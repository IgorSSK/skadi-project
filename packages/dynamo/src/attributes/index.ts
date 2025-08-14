import { DynamoValidationError } from "../errors/index.js";
import type { BaseAttribute, PrimaryKeyAttribute, StandardAttribute } from "../types/index.js";

/**
 * Abstract base class for all attribute types
 * Implements common functionality and validation logic
 */
export abstract class AbstractAttribute<T> implements BaseAttribute<T> {
	public readonly type!: T;
	public readonly attrName?: string;
	public readonly required: boolean;
	public readonly transform?: (value: unknown) => T;
	public readonly validate?: (value: T) => boolean | string;

	constructor(
		attrName?: string,
		required = false,
		transform?: (value: unknown) => T,
		validate?: (value: T) => boolean | string,
	) {
		this.attrName = attrName;
		this.required = required;
		this.transform = transform;
		this.validate = validate;
	}

	/**
	 * Validates a value against this attribute's constraints
	 */
	public validateValue(value: unknown, fieldName: string): T {
		if (value == null && this.required) {
			throw new DynamoValidationError(
				`Required field '${fieldName}' is missing or null`,
				fieldName,
				this.constructor.name,
				value,
			);
		}

		if (value == null) {
			return value as T;
		}

		// Apply transformation if provided
		const transformedValue = this.transform ? this.transform(value) : (value as T);

		// Apply custom validation if provided
		if (this.validate) {
			const validationResult = this.validate(transformedValue);
			if (validationResult !== true) {
				const message =
					typeof validationResult === "string" ? validationResult : `Validation failed for field '${fieldName}'`;
				throw new DynamoValidationError(message, fieldName, this.constructor.name, value);
			}
		}

		return transformedValue;
	}

	/**
	 * Creates a copy of this attribute with different configuration
	 */
	public abstract clone(options: Partial<BaseAttribute<T>>): this;
}

/**
 * Standard attribute implementation for non-key fields
 */
export class StandardAttributeImpl<T> extends AbstractAttribute<T> implements StandardAttribute<T> {
	public readonly isPrimary = false as const;

	public clone(options: Partial<StandardAttribute<T>>): this {
		const Constructor = this.constructor as new (...args: unknown[]) => this;
		return new Constructor(
			options.attrName ?? this.attrName,
			options.required ?? this.required,
			options.transform ?? this.transform,
			options.validate ?? this.validate,
		);
	}

	/**
	 * Marks this attribute as required
	 */
	public asRequired(): StandardAttributeImpl<T> {
		return this.clone({ required: true });
	}

	/**
	 * Adds a transformation function
	 */
	public withTransform(transform: (value: unknown) => T): StandardAttributeImpl<T> {
		return this.clone({ transform });
	}

	/**
	 * Adds a validation function
	 */
	public withValidation(validate: (value: T) => boolean | string): StandardAttributeImpl<T> {
		return this.clone({ validate });
	}
}

/**
 * Primary key attribute with enhanced functionality
 */
export class PrimaryKeyAttributeImpl<T> extends AbstractAttribute<T> implements PrimaryKeyAttribute<T> {
	public readonly isPrimary = true as const;
	public readonly keyType: "HASH" | "RANGE";
	public readonly template?: string;

	constructor(
		keyType: "HASH" | "RANGE",
		attrName?: string,
		template?: string,
		required = true,
		transform?: (value: unknown) => T,
		validate?: (value: T) => boolean | string,
	) {
		super(attrName, required, transform, validate);
		this.keyType = keyType;
		this.template = template;
	}

	public clone(options: Partial<PrimaryKeyAttribute<T>>): this {
		const Constructor = this.constructor as new (...args: unknown[]) => this;
		return new Constructor(
			options.keyType ?? this.keyType,
			options.attrName ?? this.attrName,
			(options as PrimaryKeyAttributeImpl<T>).template ?? this.template,
			options.required ?? this.required,
			options.transform ?? this.transform,
			options.validate ?? this.validate,
		);
	}

	/**
	 * Generates key value from template if available
	 */
	public generateKeyValue(context: Record<string, unknown>): T {
		if (!this.template) {
			throw new DynamoValidationError(
				`Primary key '${this.attrName}' has no template for value generation`,
				this.attrName,
			);
		}

		const generated = this.template.replace(/\{(\w+)\}/g, (_match, key) => {
			const value = context[key];
			if (value == null) {
				throw new DynamoValidationError(
					`Template context missing required key '${key}' for primary key '${this.attrName}'`,
					this.attrName,
				);
			}
			return String(value);
		});

		return this.transform ? this.transform(generated) : (generated as T);
	}
}

/**
 * Factory functions for creating typed attributes with modern TypeScript features
 */
export const AttributeFactory = {
	/**
	 * Creates a string attribute with optional constraints
	 */
	string: (
		attrName?: string,
		options: {
			required?: boolean;
			minLength?: number;
			maxLength?: number;
			pattern?: RegExp;
		} = {},
	): StandardAttributeImpl<string> => {
		const validate =
			options.minLength || options.maxLength || options.pattern
				? (value: string): boolean | string => {
						if (options.minLength && value.length < options.minLength) {
							return `String must be at least ${options.minLength} characters long`;
						}
						if (options.maxLength && value.length > options.maxLength) {
							return `String must be at most ${options.maxLength} characters long`;
						}
						if (options.pattern && !options.pattern.test(value)) {
							return `String must match pattern ${options.pattern}`;
						}
						return true;
					}
				: undefined;

		return new StandardAttributeImpl<string>(attrName, options.required, undefined, validate);
	},

	/**
	 * Creates a number attribute with optional constraints
	 */
	number: (
		attrName?: string,
		options: {
			required?: boolean;
			min?: number;
			max?: number;
			integer?: boolean;
		} = {},
	): StandardAttributeImpl<number> => {
		const validate =
			options.min != null || options.max != null || options.integer
				? (value: number): boolean | string => {
						if (options.min != null && value < options.min) {
							return `Number must be at least ${options.min}`;
						}
						if (options.max != null && value > options.max) {
							return `Number must be at most ${options.max}`;
						}
						if (options.integer && !Number.isInteger(value)) {
							return "Number must be an integer";
						}
						return true;
					}
				: undefined;

		return new StandardAttributeImpl<number>(attrName, options.required, undefined, validate);
	},

	/**
	 * Creates a boolean attribute
	 */
	boolean: (attrName?: string, required = false): StandardAttributeImpl<boolean> => {
		return new StandardAttributeImpl<boolean>(attrName, required);
	},

	/**
	 * Creates a Date attribute with ISO string transformation
	 */
	date: (attrName?: string, required = false): StandardAttributeImpl<Date> => {
		const transform = (value: unknown): Date => {
			if (value instanceof Date) return value;
			if (typeof value === "string") return new Date(value);
			if (typeof value === "number") return new Date(value);
			throw new DynamoValidationError(`Cannot convert value to Date: ${value}`, attrName, "Date", value);
		};

		return new StandardAttributeImpl<Date>(attrName, required, transform);
	},

	/**
	 * Creates a partition key (HASH) attribute
	 */
	partitionKey: <T = string>(
		attrName?: string,
		template?: string,
		transform?: (value: unknown) => T,
	): PrimaryKeyAttributeImpl<T> => {
		return new PrimaryKeyAttributeImpl<T>("HASH", attrName, template, true, transform);
	},

	/**
	 * Creates a sort key (RANGE) attribute
	 */
	sortKey: <T = string>(
		attrName?: string,
		template?: string,
		transform?: (value: unknown) => T,
	): PrimaryKeyAttributeImpl<T> => {
		return new PrimaryKeyAttributeImpl<T>("RANGE", attrName, template, true, transform);
	},

	/**
	 * Creates an array attribute with element type validation
	 */
	array: <T>(
		elementAttribute: StandardAttributeImpl<T>,
		attrName?: string,
		options: { required?: boolean; minItems?: number; maxItems?: number } = {},
	): StandardAttributeImpl<T[]> => {
		const validate = (value: T[]): boolean | string => {
			if (!Array.isArray(value)) {
				return "Value must be an array";
			}
			if (options.minItems != null && value.length < options.minItems) {
				return `Array must have at least ${options.minItems} items`;
			}
			if (options.maxItems != null && value.length > options.maxItems) {
				return `Array must have at most ${options.maxItems} items`;
			}

			// Validate each element
			for (let i = 0; i < value.length; i++) {
				try {
					elementAttribute.validateValue(value[i], `${attrName}[${i}]`);
				} catch (error) {
					return `Array element at index ${i} is invalid: ${error instanceof Error ? error.message : error}`;
				}
			}

			return true;
		};

		return new StandardAttributeImpl<T[]>(attrName, options.required, undefined, validate);
	},
} as const;
