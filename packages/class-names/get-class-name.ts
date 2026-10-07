import classnames from 'classnames';

interface IGetClassNameProps {
  /** className prop generally passed in from the parent component */
  className?: string;
  /**
        object where the key is any additional classNames used to modify the elements of the compoent.
        If the value of the key is true, it will add the name of the key to the className
    */
  modifiers?: { [key: string]: boolean };
  /** className for the component */
  rootClass: string;
  styles?: { [key: string]: string };
}

export const getClassName = ({
  className,
  modifiers = {},
  rootClass,
  styles = {},
}: IGetClassNameProps): [string, (childClassName: string) => string] => {
  function getModifiers() {
    const updatedModifiers: { [key: string]: boolean } = {};
    const modifierKeys = Object.keys(modifiers);
    if (modifierKeys.length) {
      modifierKeys.forEach((modKey) => {
        const classKey = `${rootClass}--${modKey}`;
        const newClassName: string = styles[classKey] || classKey;

        updatedModifiers[newClassName] = modifiers[modKey] ?? false;
      });
    }

    return updatedModifiers;
  }

  function getChildClass(childClassName: string) {
    const classKey = `${rootClass}__${childClassName}`;
    return styles[classKey] || classKey;
  }

  function getRootStyles() {
    return classnames(
      className,
      {
        ...getModifiers(),
      },
      styles[rootClass] || rootClass
    );
  }

  return [getRootStyles(), getChildClass];
};
