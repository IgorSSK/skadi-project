import { describe, expect, it } from 'vitest';
import { AccountEntity } from '../fixtures/test-entities.js';

// Basic test for entity builder

describe('AccountEntity', () => {
  it('should have pk and sk defined', () => {
    expect(AccountEntity.schema.shape.pk).toBeDefined();
    expect(AccountEntity.schema.shape.sk).toBeDefined();
  });
});
