# Use Toggle

TODO: One sentence on what this hook is for. This first paragraph becomes the summary on the catalog card.

## Usage

```jsx
import { useToggle } from '@example/hooks.use-toggle';

const Example = () => {
  const [on, toggle] = useToggle();
  return <button type="button" onClick={toggle}>{on ? 'On' : 'Off'}</button>;
};

<Example />
```

The ```jsx block above runs live on the docs site. The signature, parameters and return value shown there come from the hook's TypeScript and JSDoc; keep the `@param`, `@returns` and `@example` tags current.
