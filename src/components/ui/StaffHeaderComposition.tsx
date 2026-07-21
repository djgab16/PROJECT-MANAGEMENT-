import type { ReactNode } from 'react';
import './headerComposition.css';

export interface StaffHeaderCompositionProps {
  title: string;
  subtitle?: string;
  date?: ReactNode;
  navigationControl?: ReactNode;
  mobileNavigationControl?: ReactNode;
  search?: ReactNode;
  notifications?: ReactNode;
  theme?: ReactNode;
  profile?: ReactNode;
  logout?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Presentation-only ordering for caller-owned staff header controls. */
export default function StaffHeaderComposition({
  title,
  subtitle,
  date,
  navigationControl,
  mobileNavigationControl,
  search,
  notifications,
  theme,
  profile,
  logout,
  actions,
  className = '',
}: StaffHeaderCompositionProps) {
  return (
    <header className={`ui-staff-header staff-header header ${className}`.trim()}>
      <div className="header-left">
        {mobileNavigationControl}
        {navigationControl}
        <div className="header-title-container">
          {subtitle && <span className="header-breadcrumb">{subtitle}</span>}
          <h1 className="header-title">{title}</h1>
        </div>
      </div>
      <div className="header-right">
        {date && <span className="header-date">{date}</span>}
        {search}
        {notifications}
        {theme}
        {profile}
        {logout}
        {actions}
      </div>
    </header>
  );
}
