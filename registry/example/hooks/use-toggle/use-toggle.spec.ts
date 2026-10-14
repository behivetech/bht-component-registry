import { act, renderHook } from '@testing-library/react';
import { useToggle } from './use-toggle.js';

describe('useToggle', () => {
  it('starts with the initial value', () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it('toggles', () => {
    const { result } = renderHook(() => useToggle());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
