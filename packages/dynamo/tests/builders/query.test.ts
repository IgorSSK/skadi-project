import { describe, expect, it } from 'vitest';
import { AccountEntity } from '../fixtures/test-entities.js';

describe('EntityQueryBuilder', () => {
  it('should expose query method', () => {
    expect(typeof AccountEntity.query).toBe('function');
  });
});
