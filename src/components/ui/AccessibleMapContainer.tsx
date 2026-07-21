import { useId, type ReactNode } from 'react';
import './mapContainer.css';

export interface AccessibleMapContainerProps {
  title: string;
  status: ReactNode;
  locationText: ReactNode;
  children: ReactNode;
  lastUpdated?: ReactNode;
  actions?: ReactNode;
  interactive?: boolean;
  minHeight?: number;
  className?: string;
}

/** Presentation-only boundary; map coordinates, markers, polling, and cleanup stay in callers. */
export default function AccessibleMapContainer({
  title,
  status,
  locationText,
  children,
  lastUpdated,
  actions,
  interactive = false,
  minHeight = 250,
  className = '',
}: AccessibleMapContainerProps) {
  const generatedId = useId().replace(/:/g, '');
  const titleId = `ui-map-title-${generatedId}`;
  const descriptionId = `ui-map-description-${generatedId}`;

  return (
    <section
      className={`ui-map-container ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <header className="ui-map-container__header">
        <div>
          <h2 className="ui-map-container__title" id={titleId}>{title}</h2>
          <div className="ui-map-container__status" role="status" aria-live="polite">
            {status}
          </div>
        </div>
        {actions && <div className="ui-map-container__actions">{actions}</div>}
      </header>
      <div
        className="ui-map-container__viewport"
        role="region"
        aria-label={`${title} map`}
        tabIndex={interactive ? 0 : undefined}
        style={{ height: minHeight, minHeight }}
      >
        {children}
      </div>
      <div className="ui-map-container__alternative" id={descriptionId}>
        <span>{locationText}</span>
        {lastUpdated && <span>Last updated: {lastUpdated}</span>}
      </div>
    </section>
  );
}
