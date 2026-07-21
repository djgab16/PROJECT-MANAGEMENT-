import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './queryControls.css';

export type PagerPageId = string | number;

export interface PagerPage<Id extends PagerPageId> {
  id: Id;
  label: ReactNode;
  accessibleLabel: string;
  disabled?: boolean;
}

export interface ControlledPagerProps<Id extends PagerPageId> {
  label: string;
  currentPageId: Id;
  pages: readonly PagerPage<Id>[];
  onPageChange: (pageId: Id) => void;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled: boolean;
  nextDisabled: boolean;
  summary: ReactNode;
  pageSizeControl?: ReactNode;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

/** Renders caller-computed pages and forwards IDs without pagination logic. */
export default function ControlledPager<Id extends PagerPageId>({
  label,
  currentPageId,
  pages,
  onPageChange,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  summary,
  pageSizeControl,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  className = '',
}: ControlledPagerProps<Id>) {
  return (
    <nav className={`ui-controlled-pager ${className}`.trim()} aria-label={label}>
      <div className="ui-controlled-pager__context">
        <span className="ui-controlled-pager__summary">{summary}</span>
        {pageSizeControl && <div className="ui-controlled-pager__page-size">{pageSizeControl}</div>}
      </div>
      <div className="ui-controlled-pager__controls">
        <button
          type="button"
          className="ui-controlled-pager__button"
          aria-label={previousLabel}
          disabled={previousDisabled}
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className="ui-controlled-pager__pages">
          {pages.map((page) => {
            const current = Object.is(page.id, currentPageId);
            return (
              <button
                key={page.id}
                type="button"
                className="ui-controlled-pager__button"
                aria-label={page.accessibleLabel}
                aria-current={current ? 'page' : undefined}
                data-page-id={String(page.id)}
                disabled={page.disabled || current}
                onClick={() => onPageChange(page.id)}
              >
                {page.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="ui-controlled-pager__button"
          aria-label={nextLabel}
          disabled={nextDisabled}
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
