import type { ControlledFormProps } from './contracts';
import './primitives.css';

/**
 * Stable, presentation-only native form boundary.
 * All native attributes and callbacks are forwarded without wrapping them.
 */
export default function ControlledForm({
  className,
  children,
  ...nativeFormProps
}: ControlledFormProps) {
  return (
    <form
      {...nativeFormProps}
      className={['ui-controlled-form', className].filter(Boolean).join(' ')}
    >
      {children}
    </form>
  );
}
