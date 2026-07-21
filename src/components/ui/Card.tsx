import type { CardProps } from './contracts';
import './primitives.css';

export default function Card({
  as: Component = 'div',
  padding = 'md',
  elevated = false,
  className,
  children,
  ...cardProps
}: CardProps) {
  return (
    <Component
      {...cardProps}
      className={[
        'ui-card',
        `ui-card--padding-${padding}`,
        elevated && 'ui-card--elevated',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Component>
  );
}
