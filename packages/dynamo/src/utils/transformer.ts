import { isValid, parse, parseISO } from 'date-fns';
import {
  camelCase as lodashCamelCase,
  snakeCase as lodashSnakeCase,
  upperFirst,
} from 'lodash-es';
import type { z } from 'zod';

export type CaseTransformer = 'camelCase' | 'snakeCase' | 'pascalCase';
type CaseFunction = (input: string) => string;

// Utilize lodash-es for reliable, well-tested case transformations
const camelCase: CaseFunction = (str: string) => lodashCamelCase(str);
const snakeCase: CaseFunction = (str: string) => lodashSnakeCase(str);
const pascalCase: CaseFunction = (str: string) =>
  upperFirst(lodashCamelCase(str));

const caseFunctions: Record<string, CaseFunction | undefined> = {
  camelCase,
  snakeCase,
  pascalCase,
};

type UnknownObject = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownObject => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Parse helper using date-fns for ISO and common "Mon Aug 11 2025 17:34:15 GMT-0300 (...)" format
const parseDateString = (value: string): Date | null => {
  const iso = parseISO(value);
  if (isValid(iso)) return iso;
  const cleaned = value.replace(/\s*\(.+\)\s*$/, '');
  const d = parse(cleaned, "EEE MMM dd yyyy HH:mm:ss 'GMT'xxxx", new Date());
  if (isValid(d)) return d;
  return null;
};

// Boolean predicate: returns only true/false (no Date object)
const isDate = (value: unknown): boolean => {
  if (value instanceof Date) return isValid(value);
  if (typeof value === 'string') return parseDateString(value) !== null;
  return false;
};

const transformObjectKeys = (
  obj: unknown,
  transformFn: CaseFunction
): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(item => transformObjectKeys(item, transformFn));
  }
  if (isObject(obj)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        transformFn(key),
        transformObjectKeys(value, transformFn),
      ])
    );
  }
  return obj;
};

const marshallWithDateConversion = (value: unknown): unknown => {
  if (value instanceof Date && isValid(value)) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    if (isDate(value)) {
      const parsed = parseDateString(value);
      if (parsed) return parsed.toISOString();
    }
  }
  if (Array.isArray(value)) {
    return value.map(marshallWithDateConversion);
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        marshallWithDateConversion(val),
      ])
    );
  }
  return value;
};

const unmarshallWithDateConversion = (value: unknown): unknown => {
  if (isDate(value)) {
    const parsed =
      typeof value === 'string' ? parseDateString(value) : (value as Date);
    if (parsed instanceof Date) {
      return parsed;
    }
  }
  if (Array.isArray(value)) {
    return value.map(unmarshallWithDateConversion);
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        unmarshallWithDateConversion(val),
      ])
    );
  }
  return value;
};

// --- Key template rehydration helpers ---

export type KeyTemplateMeta = {
  template: string;
  params: z.ZodObject<Record<string, z.ZodTypeAny>>;
};

// Reverse a template like 'USER#{userId}' or '{createdAt}' back to an object
function reverseTemplate(
  str: string,
  template: string,
  paramSchema: z.ZodObject<Record<string, z.ZodTypeAny>>
): Record<string, unknown> | undefined {
  // Match placeholders of the form {param}
  const regex = /\{(\w+)\}/g;
  let match: RegExpExecArray | null = regex.exec(template);
  const parts: { key: string; idx: number }[] = [];
  let lastIdx = 0;
  let pattern = '';

  while (match) {
    // Escape static chunk between placeholders
    pattern += template
      .slice(lastIdx, match.index)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Non-greedy capture for placeholder value
    pattern += '(.+?)';
    parts.push({ key: match[1] ?? '', idx: parts.length });
    lastIdx = match.index + match[0].length;
    match = regex.exec(template);
  }
  // Tail static part
  pattern += template.slice(lastIdx).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const fullRegex = new RegExp(`^${pattern}$`);
  const res = fullRegex.exec(str);
  if (!res) return undefined;

  const rawObj: Record<string, unknown> = {};
  parts.forEach((p, i) => {
    rawObj[p.key] = res[i + 1];
  });

  // Coerce common primitives first (e.g., ISO date strings to Date)
  const coerced = unmarshallWithDateConversion(rawObj) as Record<
    string,
    unknown
  >;

  try {
    return paramSchema.parse(coerced);
  } catch {
    return coerced;
  }
}

function rehydrateKeysWithSchema(
  data: UnknownObject,
  schema?: z.ZodObject<Record<string, z.ZodTypeAny>>
): UnknownObject {
  if (!schema) return data;
  const out: UnknownObject = { ...data };
  const shape = (schema as z.ZodObject<Record<string, z.ZodTypeAny>>).shape;

  for (const [field, fieldSchema] of Object.entries(shape)) {
    const meta: KeyTemplateMeta | undefined = (
      fieldSchema as z.ZodTypeAny & { _skadiKeyMeta?: KeyTemplateMeta }
    )._skadiKeyMeta;
    if (!meta) continue;
    const current = out[field];
    if (typeof current === 'string') {
      const obj = reverseTemplate(current, meta.template, meta.params);
      if (obj !== undefined) out[field] = obj;
    }
  }
  return out;
}

export const serialize = (
  data: UnknownObject,
  caseStyle?: CaseTransformer
): UnknownObject => {
  const value = marshallWithDateConversion(data);

  if (caseStyle && caseFunctions[caseStyle]) {
    const transformFn = caseFunctions[caseStyle] as CaseFunction;
    return transformObjectKeys(value, transformFn) as UnknownObject;
  }

  return value as UnknownObject;
};

export function deserialize(
  data: UnknownObject,
  schema?: z.ZodObject<Record<string, z.ZodTypeAny>>
): UnknownObject {
  // For deserialization, we always convert back to camelCase first
  const transformFn = caseFunctions.camelCase as CaseFunction;
  const transformedData = transformObjectKeys(
    data,
    transformFn
  ) as UnknownObject;

  // Rehydrate template-based keys (pk/sk/GSIs) when schema is provided
  const withKeys = rehydrateKeysWithSchema(transformedData, schema);

  // Convert ISO strings to Date instances
  const withDates = unmarshallWithDateConversion(withKeys) as UnknownObject;

  return withDates;
}
