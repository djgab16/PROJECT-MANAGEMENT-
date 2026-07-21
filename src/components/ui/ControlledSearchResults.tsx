import {
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import ControlledSearch, { type ControlledSearchProps } from './ControlledSearch';
import { useControlledPopup } from './useControlledPopup';
import './queryControls.css';

export type SearchResultId = string | number;

export interface SearchResultsEmptyState {
  title: ReactNode;
  description?: ReactNode;
}

export interface ControlledSearchResultsProps<Result, Id extends SearchResultId>
  extends Omit<
    ControlledSearchProps,
    'id' | 'inputRef' | 'results' | 'resultsExpanded' | 'resultsPopupId'
  > {
  id: string;
  inputId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: readonly Result[];
  getResultId: (result: Result) => Id;
  getResultLabel: (result: Result) => string;
  onResultActivate: (result: Result) => void;
  selectedResultId?: Id | null;
  getResultDisabled?: (result: Result) => boolean;
  renderResult?: (result: Result) => ReactNode;
  empty: SearchResultsEmptyState;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnOutsidePointer?: boolean;
}

/** Search results are supplied in final display order; this component never matches or sorts. */
export default function ControlledSearchResults<Result, Id extends SearchResultId>({
  id,
  inputId = `${id}-input`,
  open,
  onOpenChange,
  results,
  getResultId,
  getResultLabel,
  onResultActivate,
  selectedResultId,
  getResultDisabled,
  renderResult,
  empty,
  restoreFocusRef,
  closeOnEscape = true,
  closeOnOutsidePointer = true,
  onKeyDown,
  className = '',
  ...searchProps
}: ControlledSearchResultsProps<Result, Id>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const resultRefs = useRef(new Map<Id, HTMLLIElement>());
  const { closeAndRestore } = useControlledPopup({
    open,
    onOpenChange,
    rootRef,
    triggerRef: inputRef,
    restoreFocusRef,
    closeOnEscape,
    closeOnOutsidePointer,
  });

  const enabledResults = results.filter((result) => !getResultDisabled?.(result));

  const focusResult = (result: Result | undefined) => {
    if (!result) return;
    resultRefs.current.get(getResultId(result))?.focus({ preventScroll: true });
  };

  const focusRelativeResult = (resultId: Id, offset: number) => {
    const index = enabledResults.findIndex((result) => Object.is(getResultId(result), resultId));
    if (index < 0 || enabledResults.length === 0) return;
    focusResult(enabledResults[(index + offset + enabledResults.length) % enabledResults.length]);
  };

  const activateResult = (result: Result) => {
    onResultActivate(result);
    closeAndRestore();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusResult(event.key === 'ArrowDown' ? enabledResults[0] : enabledResults.at(-1));
    }
  };

  const handleResultKeyDown = (
    event: KeyboardEvent<HTMLLIElement>,
    result: Result,
    resultId: Id,
  ) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusRelativeResult(resultId, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusResult(event.key === 'Home' ? enabledResults[0] : enabledResults.at(-1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateResult(result);
    }
  };

  return (
    <div className={`ui-search-results ${className}`.trim()} ref={rootRef}>
      <ControlledSearch
        {...searchProps}
        id={inputId}
        inputRef={inputRef}
        resultsPopupId={id}
        resultsExpanded={open}
        onKeyDown={handleInputKeyDown}
      />
      {open && (
        <ul
          id={id}
          ref={listRef}
          className="ui-search-results__list"
          role="listbox"
          aria-label={`${searchProps.label} results`}
          tabIndex={results.length === 0 ? -1 : undefined}
        >
          {results.length === 0 ? (
            <li className="ui-search-results__empty" role="presentation">
              <div role="status">
                <strong>{empty.title}</strong>
                {empty.description && <span>{empty.description}</span>}
              </div>
            </li>
          ) : results.map((result) => {
            const resultId = getResultId(result);
            const disabled = Boolean(getResultDisabled?.(result));
            return (
              <li
                id={`${id}-result-${encodeURIComponent(String(resultId))}`}
                key={resultId}
                ref={(element) => {
                  if (element) resultRefs.current.set(resultId, element);
                  else resultRefs.current.delete(resultId);
                }}
                className="ui-search-results__option"
                role="option"
                aria-label={getResultLabel(result)}
                aria-selected={selectedResultId != null && Object.is(selectedResultId, resultId)}
                aria-disabled={disabled || undefined}
                data-domain-id={String(resultId)}
                tabIndex={disabled ? undefined : -1}
                onClick={() => {
                  if (!disabled) activateResult(result);
                }}
                onKeyDown={(event) => {
                  if (!disabled) handleResultKeyDown(event, result, resultId);
                }}
              >
                {renderResult?.(result) ?? getResultLabel(result)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
