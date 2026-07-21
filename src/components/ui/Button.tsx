import { isValidElement, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { ButtonProps } from './contracts';
import './primitives.css';

function containsText(node: ReactNode): boolean {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).trim().length > 0;
  }

  if (Array.isArray(node)) {
    return node.some(containsText);
  }

  return isValidElement<{ children?: ReactNode }>(node)
    ? containsText(node.props.children)
    : false;
}

export default function Button({
  variant,
  size = 'md',
  loading = false,
  iconOnlyLabel,
  className,
  children,
  disabled,
  type = 'button',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...buttonProps
}: ButtonProps) {
  const accessibleLabel = iconOnlyLabel?.trim() || ariaLabel;

  if (!accessibleLabel && !ariaLabelledBy && !containsText(children)) {
    throw new Error('Icon-only Button instances require iconOnlyLabel, aria-label, or aria-labelledby.');
  }

  return (
    <button
      {...buttonProps}
      type={type}
      className={['ui-button', `ui-button--${variant}`, `ui-button--${size}`, 'ui-focus-ring', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={accessibleLabel}
      aria-labelledby={ariaLabelledBy}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      disabled={disabled || loading}
    >
      {loading && <LoaderCircle className="ui-button__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
