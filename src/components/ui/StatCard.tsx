import type { ReactNode } from 'react';
import './StatCard.css';

export interface StatCardProps {
  icon: ReactNode;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  accentColor?: string;
}

export default function StatCard({ icon, iconColor, iconBg: _iconBg, label, value, subtitle, subtitleColor, accentColor }: StatCardProps) {
  return (
    <div className="stat-card card animate-fade-in">
      <div className="stat-card-header">
        <div className="stat-card-icon" style={{ 
          color: 'white', 
          background: iconColor, 
          boxShadow: `0 8px 16px ${iconColor}40` 
        }}>
          {icon}
        </div>
        <span className="stat-card-label label">{label}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      {subtitle && (
        <div className="stat-card-subtitle" style={{ color: subtitleColor }}>
          {subtitle}
        </div>
      )}
      {accentColor && (
        <div className="stat-card-accent" style={{ background: accentColor }} />
      )}
    </div>
  );
}
