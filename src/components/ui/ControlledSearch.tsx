import {
  useId,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { Search } from 'lucide-react';
import './queryControls.css';

export interface ControlledSearchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'onChange' | 'type' | 'value'
> {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  resultsPopupId?: string;
  resultsExpanded?: boolean;
  visuallyHideLabel?: boolean;
  trailingAction?: ReactNode;
  inputRef?: RefObject<HTMLInputElement | null>;
}

/** A labelled search input that forwards its native controlled contract unchanged. */
export default function ControlledSearch({
  id,
  label,
  value,
  onChange,
  resultsPopupId,
  resultsExpanded,
  visuallyHideLabel = false,
  trailingAction,
  inputRef,
  className = '',
  ...inputProps
}: ControlledSearchProps) {
  const generatedId = `ui-search-${useId()}`;
  const inputId = id ?? generatedId;

  return (
    <div className={`ui-controlled-search ${className}`.trim()}>
      <label
        className={visuallyHideLabel ? 'ui-controlled-search__label ui-sr-only' : 'ui-controlled-search__label'}
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className="ui-controlled-search__control">
        <Search aria-hidden="true" className="ui-controlled-search__icon" />
        <input
          {...inputProps}
          ref={inputRef}
          id={inputId}
          type="search"
          value={value}
          onChange={onChange}
          className="ui-controlled-search__input"
          role={resultsPopupId ? 'combobox' : inputProps.role}
          aria-autocomplete={resultsPopupId ? 'list' : undefined}
          aria-controls={resultsPopupId}
          aria-expanded={resultsPopupId ? Boolean(resultsExpanded) : undefined}
          aria-haspopup={resultsPopupId ? 'listbox' : undefined}
        />
        {trailingAction && <div className="ui-controlled-search__action">{trailingAction}</div>}
      </div>
    </div>
  );
}
