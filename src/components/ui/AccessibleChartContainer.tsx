import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import './chartContainer.css';

export interface ChartRenderContext {
  reducedMotion: boolean;
}

export interface AccessibleChartContainerProps {
  title: string;
  summary: ReactNode;
  children: ReactNode | ((context: ChartRenderContext) => ReactNode);
  controls?: ReactNode;
  legend?: ReactNode;
  dataAlternative?: ReactNode;
  drillDown?: ReactNode;
  exports?: ReactNode;
  minHeight?: number;
  className?: string;
}

function getReducedMotionPreference() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Presentation-only boundary; chart series, labels, values, and callbacks remain caller-owned. */
export default function AccessibleChartContainer({
  title,
  summary,
  children,
  controls,
  legend,
  dataAlternative,
  drillDown,
  exports,
  minHeight = 220,
  className = '',
}: AccessibleChartContainerProps) {
  const generatedId = useId().replace(/:/g, '');
  const titleId = `ui-chart-title-${generatedId}`;
  const summaryId = `ui-chart-summary-${generatedId}`;
  const [reducedMotion, setReducedMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const chart = typeof children === 'function'
    ? children({ reducedMotion })
    : children;

  return (
    <figure
      className={`ui-chart-container ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={summaryId}
    >
      <figcaption className="ui-chart-container__header">
        <div>
          <h2 className="ui-chart-container__title" id={titleId}>{title}</h2>
          <p className="ui-chart-container__summary" id={summaryId}>{summary}</p>
        </div>
        {controls && <div className="ui-chart-container__controls">{controls}</div>}
      </figcaption>
      <div className="ui-chart-container__plot" style={{ height: minHeight, minHeight }}>
        {chart}
      </div>
      {legend && <div className="ui-chart-container__legend" aria-label={`${title} legend`}>{legend}</div>}
      {dataAlternative && (
        <details className="ui-chart-container__alternative">
          <summary>View {title.toLowerCase()} data</summary>
          <div className="ui-scroll-region" role="region" aria-label={`${title} data table`} tabIndex={0}>
            {dataAlternative}
          </div>
        </details>
      )}
      {drillDown && <div className="ui-chart-container__drilldown">{drillDown}</div>}
      {exports && <div className="ui-chart-container__exports">{exports}</div>}
    </figure>
  );
}
