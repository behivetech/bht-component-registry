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

describe('getClassName details', () => {
  it('looks every modifier and child up in the CSS module, falling back to the BEM name', () => {
    const [rootClass, getChildClass] = getClassName({
      rootClass: 'Card',
      modifiers: { raised: true, flat: true },
      styles: { 'Card--raised': 'm_raised', Card__body: 'm_body' },
    });
    expect(rootClass).toBe('m_raised Card--flat Card');
    expect(getChildClass('body')).toBe('m_body');
    expect(getChildClass('footer')).toBe('Card__footer');
  });

  it('puts className first and the root class last', () => {
    const [rootClass] = getClassName({
      rootClass: 'Card',
      className: 'from-parent',
      modifiers: { raised: true },
    });
    expect(rootClass).toBe('from-parent Card--raised Card');
  });

  it('accepts a className that is not a plain string, as classnames did', () => {
    const [rootClass] = getClassName({
      rootClass: 'Card',
      className: ['a', { b: true, c: false }],
    });
    expect(rootClass).toBe('a b Card');
  });

  it('treats an undefined modifier as off', () => {
    const [rootClass] = getClassName({
      rootClass: 'Card',
      modifiers: { raised: undefined },
    });
    expect(rootClass).toBe('Card');
  });
});
