import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zdynamo } from '../../src/index.js';

describe('zdynamo', () => {
  it('should generate partition key from template', () => {
    const pk = zdynamo.partitionKey('USER#{userId}', { userId: z.string() });
    expect(pk.parse({ userId: 'abc' })).toBe('USER#abc');
  });
  it('should generate sort key from template', () => {
    const sk = zdynamo.sortKey('ACCOUNT#{accountId}', {
      accountId: z.string(),
    });
    expect(sk.parse({ accountId: 'xyz' })).toBe('ACCOUNT#xyz');
  });
});
