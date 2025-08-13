// Deprecated: use deserialize from utils/transformer.ts which includes schema-aware
// key rehydration and date conversion.
import type { z } from 'zod';
import { deserialize as unifiedDeserialize } from './transformer.js';

export function deserializeItem(
  item: Record<string, unknown> | undefined,
  shape: Record<string, z.ZodTypeAny>
): Record<string, unknown> | undefined {
  if (!item) return item;
  // Reconstruct a zod object from provided shape to pass to unified deserializer
  const schema = (require('zod') as typeof import('zod')).object(shape);
  return unifiedDeserialize(item, schema) as Record<string, unknown>;
}
