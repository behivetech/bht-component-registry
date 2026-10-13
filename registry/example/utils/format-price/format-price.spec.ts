import { formatPrice } from './format-price.js';

describe('formatPrice', () => {
  it('transforms its input', () => {
    expect(formatPrice('hello')).toBe('Hello');
  });
});
