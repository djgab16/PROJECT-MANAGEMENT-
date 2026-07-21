import type {
  AriaAttributes,
  ButtonHTMLAttributes,
  ComponentPropsWithRef,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from 'react';

import type {
  AccountStatus,
  DeliveryStatus,
  NotificationType,
  PODStatus,
  POTStatus,
} from '../../types';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: Size;
  loading?: boolean;
  iconOnlyLabel?: string;
}

export type CardElement = 'article' | 'div' | 'section';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  padding?: 'none' | Size;
  elevated?: boolean;
}

export type StatusBadgeStatus =
  | DeliveryStatus
  | AccountStatus
  | POTStatus
  | PODStatus
  | NotificationType;

export type StatusBadgeDomain = 'delivery' | 'account' | 'pod' | 'pot';

/**
 * Additive compatibility contract. `string` remains accepted for legacy priority,
 * notification, and design-system labels; canonical resolution is opt-in via `domain`.
 */
export interface StatusBadgeProps {
  status: StatusBadgeStatus | string;
  size?: Extract<Size, 'sm' | 'md'>;
  domain?: StatusBadgeDomain;
}

export interface FeedbackStateProps {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  action?: ReactNode;
  announce?: 'polite' | 'assertive' | 'off';
}

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  backAction?: Readonly<{ label: string; onActivate: () => void }>;
  actions?: ReactNode;
}

/** A presentation snapshot derived by an existing state owner; it never initiates I/O. */
export interface AsyncViewState<T> {
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  confirmedData?: T;
  errorMessage?: string;
  retry?: () => void;
}

export type ControlledFormProps = ComponentPropsWithRef<'form'>;

export interface FieldControlProps {
  id?: string;
  required?: boolean;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-describedby'?: string;
}

export interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  hintId?: string;
  errorId?: string;
  className?: string;
  children: ReactElement<FieldControlProps>;
}

export interface ValidationSummaryError {
  fieldId: string;
  message: string;
}

export interface ValidationSummaryProps {
  errors: readonly ValidationSummaryError[];
  title?: string;
  id?: string;
  className?: string;
  focusFirstInvalid?: boolean;
  /** Change this key to request focus again while `focusFirstInvalid` remains true. */
  focusRequestKey?: string | number;
}