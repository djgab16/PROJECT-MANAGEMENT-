import type { ReactNode } from 'react';
import type { PageHeaderProps } from './contracts';
import PageHeader from './PageHeader';
import './routeTemplates.css';

type TemplateHeaderProps = Pick<
  PageHeaderProps,
  'title' | 'eyebrow' | 'description' | 'backAction'
>;

interface TemplateSectionProps {
  label: string;
  children?: ReactNode;
  className?: string;
}

function TemplateSection({ label, children, className = '' }: TemplateSectionProps) {
  if (children == null) return null;
  return (
    <section
      className={`ui-route-template__section ${className}`.trim()}
      aria-label={label}
    >
      {children}
    </section>
  );
}

export interface DataPageTemplateProps extends TemplateHeaderProps {
  headerActions?: ReactNode;
  summary?: ReactNode;
  controls?: ReactNode;
  state?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
  dataRegionLabel: string;
  className?: string;
}

export function DataPageTemplate({
  title,
  eyebrow,
  description,
  backAction,
  headerActions,
  summary,
  controls,
  state,
  children,
  pagination,
  dataRegionLabel,
  className = '',
}: DataPageTemplateProps) {
  return (
    <div className={`ui-route-template ui-data-page-template ${className}`.trim()}>
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        backAction={backAction}
        actions={headerActions}
      />
      <TemplateSection label={`${title} summary`} className="ui-route-template__summary">
        {summary}
      </TemplateSection>
      <TemplateSection label={`${title} query controls`} className="ui-route-template__controls">
        {controls}
      </TemplateSection>
      <TemplateSection label={`${title} status`} className="ui-route-template__state">
        {state}
      </TemplateSection>
      <TemplateSection label={dataRegionLabel} className="ui-route-template__data">
        {children}
      </TemplateSection>
      <TemplateSection label={`${title} pagination`} className="ui-route-template__pagination">
        {pagination}
      </TemplateSection>
    </div>
  );
}

export interface DetailPageTemplateProps extends TemplateHeaderProps {
  headerActions?: ReactNode;
  status?: ReactNode;
  metadata?: ReactNode;
  details?: ReactNode;
  timeline?: ReactNode;
  map?: ReactNode;
  proof?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DetailPageTemplate({
  title,
  eyebrow,
  description,
  backAction,
  headerActions,
  status,
  metadata,
  details,
  timeline,
  map,
  proof,
  actions,
  className = '',
}: DetailPageTemplateProps) {
  return (
    <div className={`ui-route-template ui-detail-page-template ${className}`.trim()}>
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        backAction={backAction}
        actions={headerActions}
      />
      <TemplateSection label={`${title} status`} className="ui-route-template__status">
        {status}
      </TemplateSection>
      <div className="ui-detail-page-template__grid">
        <TemplateSection label={`${title} metadata`} className="ui-route-template__metadata">
          {metadata}
        </TemplateSection>
        <TemplateSection label={`${title} details`} className="ui-route-template__details">
          {details}
        </TemplateSection>
        <TemplateSection label={`${title} timeline`} className="ui-route-template__timeline">
          {timeline}
        </TemplateSection>
        <TemplateSection label={`${title} map`} className="ui-route-template__map">
          {map}
        </TemplateSection>
        <TemplateSection label={`${title} proof`} className="ui-route-template__proof">
          {proof}
        </TemplateSection>
      </div>
      <TemplateSection label={`${title} actions`} className="ui-route-template__actions">
        {actions}
      </TemplateSection>
    </div>
  );
}

export interface FormPageTemplateProps extends TemplateHeaderProps {
  headerActions?: ReactNode;
  validationSummary?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  formRegionLabel: string;
  className?: string;
}

/** Does not render a form element; the existing owner retains submit semantics. */
export function FormPageTemplate({
  title,
  eyebrow,
  description,
  backAction,
  headerActions,
  validationSummary,
  children,
  actions,
  formRegionLabel,
  className = '',
}: FormPageTemplateProps) {
  return (
    <div className={`ui-route-template ui-form-page-template ${className}`.trim()}>
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        backAction={backAction}
        actions={headerActions}
      />
      <TemplateSection label={`${title} validation`} className="ui-route-template__state">
        {validationSummary}
      </TemplateSection>
      <TemplateSection label={formRegionLabel} className="ui-form-page-template__fields">
        {children}
      </TemplateSection>
      <TemplateSection label={`${title} form actions`} className="ui-route-template__actions">
        {actions}
      </TemplateSection>
    </div>
  );
}

export interface AnalyticsTemplateProps extends TemplateHeaderProps {
  headerActions?: ReactNode;
  metrics?: ReactNode;
  filters?: ReactNode;
  state?: ReactNode;
  charts?: ReactNode;
  table?: ReactNode;
  drillDown?: ReactNode;
  exports?: ReactNode;
  className?: string;
}

export function AnalyticsTemplate({
  title,
  eyebrow,
  description,
  backAction,
  headerActions,
  metrics,
  filters,
  state,
  charts,
  table,
  drillDown,
  exports,
  className = '',
}: AnalyticsTemplateProps) {
  return (
    <div className={`ui-route-template ui-analytics-template ${className}`.trim()}>
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        backAction={backAction}
        actions={headerActions}
      />
      <TemplateSection label={`${title} metrics`} className="ui-analytics-template__metrics">
        {metrics}
      </TemplateSection>
      <TemplateSection label={`${title} filters`} className="ui-route-template__controls">
        {filters}
      </TemplateSection>
      <TemplateSection label={`${title} status`} className="ui-route-template__state">
        {state}
      </TemplateSection>
      <TemplateSection label={`${title} charts`} className="ui-analytics-template__charts">
        {charts}
      </TemplateSection>
      <TemplateSection label={`${title} data table`} className="ui-route-template__data">
        {table}
      </TemplateSection>
      <TemplateSection label={`${title} drill-down`} className="ui-analytics-template__drilldown">
        {drillDown}
      </TemplateSection>
      <TemplateSection label={`${title} export actions`} className="ui-route-template__actions">
        {exports}
      </TemplateSection>
    </div>
  );
}
