import {
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useControlledPopup } from './useControlledPopup';
import './queryControls.css';

export interface ControlledFilterPanelProps {
  id: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  activeSummary?: ReactNode;
  footer?: ReactNode;
  className?: string;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnOutsidePointer?: boolean;
}

/** Controlled disclosure/popup mechanics around caller-owned filter controls. */
export default function ControlledFilterPanel({
  id,
  label,
  open,
  onOpenChange,
  children,
  activeSummary,
  footer,
  className = '',
  restoreFocusRef,
  closeOnEscape = true,
  closeOnOutsidePointer = true,
}: ControlledFilterPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { closeAndRestore } = useControlledPopup({
    open,
    onOpenChange,
    rootRef,
    triggerRef,
    restoreFocusRef,
    closeOnEscape,
    closeOnOutsidePointer,
  });

  const triggerId = `${id}-trigger`;
  return (
    <div className={`ui-filter-panel ${className}`.trim()} ref={rootRef}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="ui-filter-panel__trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={() => (open ? closeAndRestore() : onOpenChange(true))}
      >
        <SlidersHorizontal aria-hidden="true" />
        <span>{label}</span>
      </button>
      {activeSummary && <div className="ui-filter-panel__summary">{activeSummary}</div>}
      {open && (
        <section
          id={id}
          className="ui-filter-panel__popup"
          role="dialog"
          aria-modal="false"
          aria-labelledby={triggerId}
        >
          <div className="ui-filter-panel__body">{children}</div>
          {footer && <div className="ui-filter-panel__footer">{footer}</div>}
        </section>
      )}
    </div>
  );
}
