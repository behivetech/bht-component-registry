import { useToggle } from './use-toggle.js';

/** Each exported component here is a live, editable example on the docs site. This comment is its description. */
export const BasicUseToggle = () => {
  const [on, toggle] = useToggle(false);
  return (
    <button type="button" onClick={toggle}>
      {on ? 'On' : 'Off'}
    </button>
  );
};
