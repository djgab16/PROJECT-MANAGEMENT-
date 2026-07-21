import { useEffect, useId, useMemo, useRef, type MouseEvent } from 'react';
import type { ValidationSummaryProps } from './contracts';
import './primitives.css';

const BOOLEAN_FOCUS_REQUEST = Symbol('validation-summary-focus');

function focusAndScrollToField(fieldId: string): boolean {
  const target = document.getElementById(fieldId);
  if (!(target instanceof HTMLElement)) return false;

  target.focus({ preventScroll: true });
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  target.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
  return true;
}

export default function ValidationSummary({
  errors,
  title = 'Please review the following fields',
  id,
  className,
  focusFirstInvalid = false,
  focusRequestKey,
}: ValidationSummaryProps) {
  const generatedId = useId().replace(/:/g, '');
  const summaryId = id || `ui-validation-summary-${generatedId}`;
  const titleId = `${summaryId}-title`;
  const fieldIds = useMemo(() => errors.map(({ fieldId }) => fieldId), [errors]);
  const completedRequestRef = useRef<string | number | symbol | null>(null);
  const requestIdentity = focusRequestKey ?? BOOLEAN_FOCUS_REQUEST;

  useEffect(() => {
    if (!focusFirstInvalid || fieldIds.length === 0) {
      completedRequestRef.current = null;
      return;
    }

    if (completedRequestRef.current === requestIdentity) return;

    const frameId = window.requestAnimationFrame(() => {
      for (const fieldId of fieldIds) {
        if (focusAndScrollToField(fieldId)) break;
      }
      completedRequestRef.current = requestIdentity;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [fieldIds, focusFirstInvalid, requestIdentity]);

  if (errors.length === 0) return null;

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, fieldId: string) => {
    event.preventDefault();
    focusAndScrollToField(fieldId);
  };

  return (
    <div
      id={summaryId}
      className={['ui-validation-summary', className].filter(Boolean).join(' ')}
      role="alert"
      aria-labelledby={titleId}
    >
      <h2 className="ui-validation-summary__title" id={titleId}>{title}</h2>
      <ul className="ui-validation-summary__list">
        {errors.map(({ fieldId, message }) => (
          <li key={fieldId}>
            <a
              className="ui-validation-summary__link ui-focus-ring"
              href={`#${encodeURIComponent(fieldId)}`}
              onClick={(event) => handleLinkClick(event, fieldId)}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
