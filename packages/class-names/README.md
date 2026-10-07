# getClassName

A utility for generating BEM-style class names with support for CSS modules, modifiers, and child elements.

A powerful utility for generating BEM (Block Element Modifier) style class names with built-in support for CSS modules, conditional modifiers, and child element naming.

## Features

- **BEM Convention**: Automatically generates proper BEM-style class names
- **CSS Modules Support**: Works seamlessly with CSS/SCSS modules and styled components
- **Conditional Modifiers**: Apply modifiers based on boolean conditions
- **Child Element Helper**: Generate consistent child element class names
- **TypeScript Support**: Fully typed with comprehensive interfaces

## Basic Usage

```tsx
import { getClassName } from '@bht-component-registry/class-names';

// Basic component setup
const [rootClass, getChildClass] = getClassName({
  rootClass: 'button',
});

console.log(rootClass); // 'button'
console.log(getChildClass('text')); // 'button__text'
console.log(getChildClass('icon')); // 'button__icon'
```

## With Modifiers

```tsx
const [buttonClass, getChildClass] = getClassName({
  rootClass: 'button',
  modifiers: {
    primary: true,
    large: true,
    disabled: false,
  },
});

console.log(buttonClass);
// 'button button--primary button--large'
```

## With Custom className

```tsx
const [buttonClass] = getClassName({
  rootClass: 'button',
  className: 'my-custom-class another-class',
  modifiers: {
    primary: true,
  },
});

console.log(buttonClass);
// 'my-custom-class another-class button button--primary'
```

## With CSS Modules

```tsx
import styles from './Button.module.css';

const [buttonClass, getChildClass] = getClassName({
  rootClass: 'button',
  styles,
  modifiers: {
    primary: isActive,
    disabled: !isEnabled,
  },
});

// If styles object contains:
// {
//   'button': 'Button_button__3xKl2',
//   'button--primary': 'Button_primary__8mN4k',
//   'button__text': 'Button_text__5pL9x'
// }

console.log(buttonClass);
// 'Button_button__3xKl2 Button_primary__8mN4k'
console.log(getChildClass('text'));
// 'Button_text__5pL9x'
```

## React Component Example

```tsx
import React from 'react';
import { getClassName } from '@bht-component-registry/class-names';
import styles from './Button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
}) => {
  const [rootClass, getChildClass] = getClassName({
    rootClass: 'button',
    className,
    styles,
    modifiers: {
      [variant]: true,
      [size]: true,
      disabled,
    },
  });

  return (
    <button className={rootClass} disabled={disabled} onClick={onClick}>
      <span className={getChildClass('text')}>{children}</span>
    </button>
  );
};
```

## CSS Example

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button--primary {
  background-color: #007bff;
  color: white;
}

.button--secondary {
  background-color: #6c757d;
  color: white;
}

.button--small {
  padding: 4px 8px;
  font-size: 12px;
}

.button--large {
  padding: 12px 24px;
  font-size: 18px;
}

.button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button__text {
  font-weight: 500;
}
```

## API Reference

### getClassName(props)

#### Parameters

| Parameter   | Type                      | Required | Description                                                                  |
| ----------- | ------------------------- | -------- | ---------------------------------------------------------------------------- |
| `rootClass` | `string`                  | yes      | The base class name for the component                                        |
| `className` | `string`                  | no       | Additional custom class names                                                |
| `modifiers` | `Record<string, boolean>` | no       | Object where keys are modifier names and values determine if they're applied |
| `styles`    | `Record<string, string>`  | no       | CSS modules styles object for class name mapping                             |

#### Returns

Returns a tuple `[rootClass, getChildClass]`:

- **`rootClass`** (`string`): The computed root class name with all modifiers and custom classes
- **`getChildClass`** (`function`): Function that takes a child element name and returns the BEM child class

### getChildClass(childClassName)

#### Parameters

| Parameter        | Type     | Required | Description               |
| ---------------- | -------- | -------- | ------------------------- |
| `childClassName` | `string` | yes      | Name of the child element |

#### Returns

- **`string`**: The computed BEM child class name (e.g., `block__element`)

## Best Practices

### Consistent Naming Convention

```tsx
// Good: Use clear, descriptive names
const [cardClass, getChildClass] = getClassName({
  rootClass: 'product-card',
  modifiers: { featured: true, soldOut: false },
});
```

### Organize Modifiers Logically

```tsx
const modifiers = {
  // State modifiers
  active: isActive,
  disabled: isDisabled,
  loading: isLoading,

  // Appearance modifiers
  primary: variant === 'primary',
  large: size === 'large',
  outlined: appearance === 'outlined',
};
```

### Use with CSS Custom Properties

```css
.button {
  --button-color: #007bff;
  --button-padding: 8px 16px;

  background-color: var(--button-color);
  padding: var(--button-padding);
}

.button--large {
  --button-padding: 12px 24px;
}
```

## Common Patterns

### Conditional Styling

```tsx
const [alertClass] = getClassName({
  rootClass: 'alert',
  modifiers: {
    success: type === 'success',
    error: type === 'error',
    warning: type === 'warning',
    dismissible: onClose !== undefined,
  },
});
```

### Complex Component Structure

```tsx
const [modalClass, getChildClass] = getClassName({
  rootClass: 'modal',
  modifiers: { open: isOpen, fullscreen: isFullscreen },
});

return (
  <div className={modalClass}>
    <div className={getChildClass('backdrop')} />
    <div className={getChildClass('content')}>
      <header className={getChildClass('header')}>
        <h2 className={getChildClass('title')}>{title}</h2>
        <button className={getChildClass('close-button')} />
      </header>
      <div className={getChildClass('body')}>{children}</div>
    </div>
  </div>
);
```
