import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { useControlledPopup } from './useControlledPopup';
import './queryControls.css';

export type DropdownOptionId = string | number;

export interface DropdownEmptyState {
  title: string;
  description?: string;
}

export interface ControlledDropdownProps<Option, Id extends DropdownOptionId> {
  id: string;
  label: string;
  triggerContent?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: readonly Option[];
  getOptionId: (option: Option) => Id;
  getOptionLabel: (option: Option) => string;
  selectedId?: Id | null;
  onSelectedIdChange: (selectedId: Id) => void;
  getOptionDisabled?: (option: Option) => boolean;
  renderOption?: (option: Option) => ReactNode;
  empty: DropdownEmptyState;
  disabled?: boolean;
  className?: string;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnOutsidePointer?: boolean;
}

type OpenFocus = 'selected' | 'first' | 'last';

/** A controlled listbox: option identity and selected value remain caller-owned. */
export default function ControlledDropdown<Option, Id extends DropdownOptionId>({
  id,
  label,
  triggerContent,
  open,
  onOpenChange,
  options,
  getOptionId,
  getOptionLabel,
  selectedId,
  onSelectedIdChange,
  getOptionDisabled,
  renderOption,
  empty,
  disabled = false,
  className = '',
  restoreFocusRef,
  closeOnEscape = true,
  closeOnOutsidePointer = true,
}: ControlledDropdownProps<Option, Id>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef(new Map<Id, HTMLLIElement>());
  const wasOpenRef = useRef(false);
  const openFocusRef = useRef<OpenFocus>('selected');
  const { closeAndRestore } = useControlledPopup({
    open,
    onOpenChange,
    rootRef,
    triggerRef,
    restoreFocusRef,
    closeOnEscape,
    closeOnOutsidePointer,
  });

  const enabledOptions = options.filter((option) => !getOptionDisabled?.(option));

  useLayoutEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      const enabledIds = enabledOptions.map(getOptionId);
      const selectedIsEnabled = selectedId != null && enabledIds.includes(selectedId);
      const focusId = openFocusRef.current === 'last'
        ? enabledIds.at(-1)
        : openFocusRef.current === 'first'
          ? enabledIds[0]
          : selectedIsEnabled
            ? selectedId
            : enabledIds[0];
      if (focusId != null) optionRefs.current.get(focusId)?.focus({ preventScroll: true });
      else listRef.current?.focus({ preventScroll: true });
      openFocusRef.current = 'selected';
    });
    return () => window.cancelAnimationFrame(frame);
  });

  const requestOpen = (focus: OpenFocus) => {
    if (disabled) return;
    openFocusRef.current = focus;
    onOpenChange(true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    requestOpen(event.key === 'ArrowUp' ? 'last' : 'selected');
  };

  const focusRelativeOption = (optionId: Id, offset: number) => {
    const enabledIds = enabledOptions.map(getOptionId);
    const currentIndex = enabledIds.indexOf(optionId);
    const nextIndex = (currentIndex + offset + enabledIds.length) % enabledIds.length;
    const nextId = enabledIds[nextIndex];
    if (nextId != null) optionRefs.current.get(nextId)?.focus({ preventScroll: true });
  };

  const selectOption = (optionId: Id) => {
    onSelectedIdChange(optionId);
    closeAndRestore();
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLLIElement>, optionId: Id) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusRelativeOption(optionId, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const target = event.key === 'Home' ? enabledOptions[0] : enabledOptions.at(-1);
      if (target) optionRefs.current.get(getOptionId(target))?.focus({ preventScroll: true });
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(optionId);
    }
  };

  const triggerId = `${id}-trigger`;
  return (
    <div className={`ui-controlled-dropdown ${className}`.trim()} ref={rootRef}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="ui-controlled-dropdown__trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => (open ? closeAndRestore() : requestOpen('selected'))}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="ui-controlled-dropdown__trigger-content">
          {triggerContent ?? label}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>

      {open && (
        <ul
          id={id}
          ref={listRef}
          className="ui-controlled-dropdown__list"
          role="listbox"
          aria-labelledby={triggerId}
          tabIndex={options.length === 0 ? -1 : undefined}
        >
          {options.length === 0 ? (
            <li className="ui-controlled-dropdown__empty" role="status">
              <strong>{empty.title}</strong>
              {empty.description && <span>{empty.description}</span>}
            </li>
          ) : options.map((option) => {
            const optionId = getOptionId(option);
            const optionDisabled = Boolean(getOptionDisabled?.(option));
            const selected = selectedId != null && Object.is(selectedId, optionId);
            return (
              <li
                id={`${id}-option-${encodeURIComponent(String(optionId))}`}
                key={optionId}
                ref={(element) => {
                  if (element) optionRefs.current.set(optionId, element);
                  else optionRefs.current.delete(optionId);
                }}
                className="ui-controlled-dropdown__option"
                role="option"
                aria-selected={selected}
                aria-disabled={optionDisabled || undefined}
                data-domain-id={String(optionId)}
                tabIndex={optionDisabled ? undefined : -1}
                onClick={() => {
                  if (!optionDisabled) selectOption(optionId);
                }}
                onKeyDown={(event) => {
                  if (!optionDisabled) handleOptionKeyDown(event, optionId);
                }}
              >
                {renderOption?.(option) ?? getOptionLabel(option)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
