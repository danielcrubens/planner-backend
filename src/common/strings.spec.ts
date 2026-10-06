import { describe, expect, it } from 'vitest';
import { capitalizeFirst } from './strings.js';

describe('capitalizeFirst', () => {
  it('minúscula → maiúscula', () => {
    expect(capitalizeFirst('passeio na praia')).toBe('Passeio na praia');
  });

  it('já maiúscula permanece', () => {
    expect(capitalizeFirst('Jantar')).toBe('Jantar');
  });

  it('acentuada capitaliza', () => {
    expect(capitalizeFirst('água de coco')).toBe('Água de coco');
  });

  it('string vazia permanece vazia', () => {
    expect(capitalizeFirst('')).toBe('');
  });
});
