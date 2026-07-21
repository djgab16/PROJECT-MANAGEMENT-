import { ArrowLeft } from 'lucide-react';
import type { PageHeaderProps } from './contracts';
import Button from './Button';
import './primitives.css';

export default function PageHeader({
  title,
  eyebrow,
  description,
  backAction,
  actions,
}: PageHeaderProps) {
  return (
    <header className="ui-page-header ui-page-boundary">
      {backAction && (
        <Button variant="ghost" size="sm" onClick={backAction.onActivate}>
          <ArrowLeft aria-hidden="true" />
          {backAction.label}
        </Button>
      )}
      <div className="ui-page-header__content">
        {eyebrow && <p className="ui-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="ui-page-header__title">{title}</h1>
        {description && <p className="ui-page-header__description">{description}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}
