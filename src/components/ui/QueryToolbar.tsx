import type { ReactNode } from 'react';
import './queryComposition.css';

export interface QueryToolbarProps {
  label: string;
  search?: ReactNode;
  filters?: ReactNode;
  sort?: ReactNode;
  actions?: ReactNode;
  context?: ReactNode;
  pagination?: ReactNode;
  className?: string;
}

/** Presentation-only composition for caller-owned search, filter, sort, and pager controls. */
export default function QueryToolbar({
  label,
  search,
  filters,
  sort,
  actions,
  context,
  pagination,
  className = '',
}: QueryToolbarProps) {
  return (
    <section className={`ui-query-toolbar ${className}`.trim()} aria-label={label}>
      <div className="ui-query-toolbar__primary">
        {search && <div className="ui-query-toolbar__search">{search}</div>}
        {filters && <div className="ui-query-toolbar__filters">{filters}</div>}
        {sort && <div className="ui-query-toolbar__sort">{sort}</div>}
        {actions && <div className="ui-query-toolbar__actions">{actions}</div>}
      </div>
      {context && (
        <div className="ui-query-toolbar__context" role="status" aria-live="polite">
          {context}
        </div>
      )}
      {pagination && <div className="ui-query-toolbar__pagination">{pagination}</div>}
    </section>
  );
}
