import type { z } from 'zod';

// Helper to reverse pk/sk string to object using the paramSchema and template
function reverseTemplate(
  str: string,
  template: string,
  paramSchema: z.ZodObject<Record<string, z.ZodTypeAny>>
): Record<string, unknown> | undefined {
  // Example: template = 'USER#{userId}', str = 'USER#123'
  // Extract param names and static parts
  const regex = /#\{(\w+)\}/g;
  let match: RegExpExecArray | null;
  const parts: { key: string; idx: number }[] = [];
  let lastIdx = 0;
  let pattern = '';
  while ((match = regex.exec(template)) !== null) {
    pattern += template
      .slice(lastIdx, match.index)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern += '(.+?)';
    parts.push({ key: match[1] ?? '', idx: parts.length });
    lastIdx = match.index + match[0].length;
  }
  pattern += template.slice(lastIdx).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fullRegex = new RegExp(`^${pattern}$`);
  const res = fullRegex.exec(str);
  if (!res) return undefined;
  const obj: Record<string, unknown> = {};
  parts.forEach((p, i) => {
    obj[p.key] = res[i + 1];
  });
  // Parse with paramSchema to coerce types
  try {
    return paramSchema.parse(obj);
  } catch {
    return obj;
  }
}

// Main deserializer
export function deserializeItem(
  item: Record<string, unknown> | undefined,
  shape: Record<string, z.ZodTypeAny>
): Record<string, unknown> | undefined {
  if (!item) return item;
  const out: Record<string, unknown> = { ...item };
  // pk
  if (shape.pk?._def?.transform) {
    const paramSchema = shape.pk._def.schema;
    const template = shape.pk._def.transform.transformer.template;
    if (typeof out.pk === 'string' && template && paramSchema) {
      const obj = reverseTemplate(out.pk as string, template, paramSchema);
      if (obj) out.pk = obj;
    }
  }
  // sk
  if (shape.sk?._def?.transform) {
    const paramSchema = shape.sk._def.schema;
    const template = shape.sk._def.transform.transformer.template;
    if (typeof out.sk === 'string' && template && paramSchema) {
      const obj = reverseTemplate(out.sk as string, template, paramSchema);
      if (obj) out.sk = obj;
    }
  }
  // Timestamps: createdAt, updatedAt, etc.
  for (const key of Object.keys(out)) {
    if (shape[key]?._def?.typeName === 'ZodDate') {
      if (typeof out[key] === 'string' || typeof out[key] === 'number') {
        const d = new Date(out[key] as string | number);
        if (!Number.isNaN(d.getTime())) out[key] = d;
      }
    }
  }
  return out;
}
