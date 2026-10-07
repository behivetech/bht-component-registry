import { getClassName } from './get-class-name.js';

describe('getClassName', () => {
  it('should return basic class name with root class', () => {
    const [rootClass, getChildClass] = getClassName({
      rootClass: 'my-component',
    });
    expect(rootClass).toBe('my-component');
    expect(getChildClass('element')).toBe('my-component__element');
  });

  it('should handle className prop', () => {
    const [rootClass] = getClassName({
      rootClass: 'my-component',
      className: 'custom-class',
    });
    expect(rootClass).toContain('custom-class');
    expect(rootClass).toContain('my-component');
  });

  it('should handle modifiers', () => {
    const [rootClass] = getClassName({
      rootClass: 'my-component',
      modifiers: { active: true, disabled: false },
    });
    expect(rootClass).toContain('my-component--active');
    expect(rootClass).not.toContain('my-component--disabled');
  });

  it('should work with styles object', () => {
    const styles = {
      'my-component': 'styled-component',
      'my-component__element': 'styled-element',
      'my-component--active': 'styled-active',
    };

    const [rootClass, getChildClass] = getClassName({
      rootClass: 'my-component',
      modifiers: { active: true },
      styles,
    });

    expect(rootClass).toContain('styled-component');
    expect(rootClass).toContain('styled-active');
    expect(getChildClass('element')).toBe('styled-element');
  });
});
