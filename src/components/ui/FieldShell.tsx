import { cloneElement } from 'react';
import type { FieldShellProps } from './contracts';
import './primitives.css';

function appendDescriptionIds(current: string | undefined, additions: readonly string[]) {
  const ids = new Set(current?.split(/\s+/).filter(Boolean));
  additions.forEach((id) => ids.add(id));
  return Array.from(ids).join(' ') || undefined;
}

export default function FieldShell({
  id,
  label,
  required = false,
  hint,
  error,
  hintId: suppliedHintId,
  errorId: suppliedErrorId,
  className,
  children,
}: FieldShellProps) {
  const controlId = children.props.id?.trim() || id;
  const hintText = hint?.trim();
  const errorText = error?.trim();
  const hintId = suppliedHintId || `${controlId}-hint`;
  const errorId = suppliedErrorId || `${controlId}-error`;
  const isRequired = Boolean(required || children.props.required);
  const describedBy = appendDescriptionIds(children.props['aria-describedby'], [
    ...(hintText ? [hintId] : []),
    ...(errorText ? [errorId] : []),
  ]);

  const control = cloneElement(children, {
    id: controlId,
    required: isRequired ? true : children.props.required,
    'aria-invalid': errorText ? true : children.props['aria-invalid'],
    'aria-describedby': describedBy,
  });

  return (
    <div className={['ui-field-shell', className].filter(Boolean).join(' ')} data-invalid={errorText ? 'true' : undefined}>
      <label className="ui-field-shell__label" htmlFor={controlId}>
        {label}
        {isRequired && <><span className="ui-field-shell__required-marker" aria-hidden="true">*</span><span className="ui-field-shell__required-text"> (required)</span></>}
      </label>
      <div className="ui-field-shell__control">{control}</div>
      {hintText && <p className="ui-field-shell__hint" id={hintId}>{hintText}</p>}
      {errorText && <p className="ui-field-shell__error" id={errorId}>{errorText}</p>}
    </div>
  );
}
