import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { joinClassNames } from './join-class-names.js';

// The first block is the `classnames` package's own test cases, ported, so the
// behaviour the registry relied on stays pinned without the dependency.
describe('joinClassNames (the classnames cases)', () => {
  it('keeps object keys with truthy values', () => {
    expect(joinClassNames({ a: true, b: false, c: 0, d: null, e: undefined, f: 1 })).toBe('a f');
  });

  it('joins arrays of class names and ignores falsy values', () => {
    expect(joinClassNames('a', 0, null, undefined, true, 1, 'b')).toBe('a 1 b');
  });

  it('supports heterogeneous arguments', () => {
    expect(joinClassNames({ a: true }, 'b', 0)).toBe('a b');
  });

  it('is trimmed', () => {
    expect(joinClassNames('', 'b', {}, '')).toBe('b');
  });

  it('returns an empty string for an empty configuration', () => {
    expect(joinClassNames({})).toBe('');
    expect(joinClassNames()).toBe('');
  });

  it('supports an array of class names', () => {
    expect(joinClassNames(['a', 'b'])).toBe('a b');
  });

  it('joins array arguments with string arguments', () => {
    expect(joinClassNames(['a', 'b'], 'c')).toBe('a b c');
    expect(joinClassNames('c', ['a', 'b'])).toBe('c a b');
  });

  it('handles multiple array arguments', () => {
    expect(joinClassNames(['a', 'b'], ['c', 'd'])).toBe('a b c d');
  });

  it('handles arrays that include falsy and true values', () => {
    expect(joinClassNames(['a', 0, null, undefined, false, true, 'b'])).toBe('a b');
  });

  it('handles arrays that include arrays', () => {
    expect(joinClassNames(['a', ['b', 'c']])).toBe('a b c');
  });

  it('handles arrays that include objects', () => {
    expect(joinClassNames(['a', { b: true, c: false }])).toBe('a b');
  });

  it('handles deep array recursion', () => {
    expect(joinClassNames(['a', ['b', ['c', { d: true }]]])).toBe('a b c d');
  });

  it('handles arrays that are empty', () => {
    expect(joinClassNames('a', [])).toBe('a');
  });

  it('handles nested arrays that have empty nested arrays', () => {
    expect(joinClassNames('a', [[]])).toBe('a');
  });

  it('handles all types of truthy and falsy property values as expected', () => {
    expect(
      joinClassNames({
        // falsy:
        null: null,
        emptyString: '',
        noNumber: NaN,
        zero: 0,
        negativeZero: -0,
        false: false,
        undefined,
        // truthy (literally anything else):
        nonEmptyString: 'foobar',
        whitespace: ' ',
        function: Object.prototype.toString,
        emptyObject: {},
        nonEmptyObject: { a: 1, b: 2 },
        emptyList: [],
        nonEmptyList: [1, 2, 3],
        greaterZero: 1,
      }),
    ).toBe(
      'nonEmptyString whitespace function emptyObject nonEmptyObject emptyList nonEmptyList greaterZero',
    );
  });

  it('handles a toString() method defined on an object', () => {
    expect(joinClassNames({ toString: () => 'classFromMethod' })).toBe('classFromMethod');
  });

  it('handles a toString() method inherited by an object', () => {
    class Class1 {
      toString() {
        return 'classFromMethod';
      }
    }
    class Class2 extends Class1 {}
    expect(joinClassNames(new Class2())).toBe('classFromMethod');
  });

  it('handles objects from another realm, whose toString is native', () => {
    const foreign = runInNewContext('({ a: true, b: false })') as Record<string, unknown>;
    expect(joinClassNames(foreign)).toBe('a');
  });

  it('keeps numbers, and skips zero', () => {
    expect(joinClassNames(1, 0, 2)).toBe('1 2');
  });
});

describe('joinClassNames (beyond classnames)', () => {
  it('reads an object with no prototype as a plain object instead of throwing', () => {
    const bare = Object.assign(Object.create(null) as object, { a: true, b: 0 });
    expect(joinClassNames(bare)).toBe('a');
  });

  it('reads an object whose toString key is not a function as a plain object instead of throwing', () => {
    expect(joinClassNames({ toString: true, a: true })).toBe('toString a');
  });

  it('skips bigints, symbols, functions and true', () => {
    expect(joinClassNames(1n, Symbol('x') as never, (() => 'x') as never, true, 'ok')).toBe('ok');
  });

  it('lists integer-like object keys first, as JavaScript orders them', () => {
    expect(joinClassNames({ b: true, 2: true, a: true, 1: true })).toBe('1 2 b a');
  });
});
