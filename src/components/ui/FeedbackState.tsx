import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { FeedbackStateProps } from './contracts';
import './primitives.css';

const iconByKind = {
  loading: LoaderCircle,
  empty: Inbox,
  error: TriangleAlert,
} as const;

export default function FeedbackState({
  kind,
  title,
  description,
  action,
  announce,
}: FeedbackStateProps) {
  const live = announce ?? (kind === 'loading' ? 'polite' : kind === 'error' ? 'assertive' : 'off');
  const Icon = iconByKind[kind];
  const announces = live !== 'off';

  return (
    <div
      className={`ui-feedback-state ui-feedback-state--${kind}`}
      role={announces ? (kind === 'error' ? 'alert' : 'status') : undefined}
      aria-live={announces ? live : undefined}
      aria-atomic={announces || undefined}
      aria-busy={kind === 'loading' || undefined}
    >
      <div className="ui-feedback-state__icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="ui-feedback-state__content">
        <h2 className="ui-feedback-state__title">{title}</h2>
        {description && <p className="ui-feedback-state__description">{description}</p>}
        {action && <div className="ui-feedback-state__action">{action}</div>}
      </div>
    </div>
  );
}
