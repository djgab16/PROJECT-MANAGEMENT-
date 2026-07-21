import type { StatusBadgeProps } from './contracts';
import {
  resolveCanonicalStatusPresentation,
  UNKNOWN_STATUS_PRESENTATION,
} from './statusPresentation';
import './StatusBadge.css';

const statusConfig: Readonly<Record<string, { className: string; label?: string }>> = {
  'Active': { className: 'status-active' },
  'Pending': { className: 'status-pending' },
  'Processing': { className: 'status-pending' },
  'Preparing': { className: 'status-pending' },
  'Ready for Pickup': { className: 'status-pending' },
  'Assigned': { className: 'status-transit' },
  'In Transit': { className: 'status-transit' },
  'Out for Delivery': { className: 'status-transit' },
  'Delivered': { className: 'status-delivered' },
  'Picked Up': { className: 'status-completed' },
  'Completed': { className: 'status-completed' },
  'Failed': { className: 'status-failed' },
  'Returning': { className: 'status-pending' },
  'Returned': { className: 'status-failed' },
  'Cancelled': { className: 'status-failed' },
  'Locked': { className: 'status-locked' },
  'Submitted': { className: 'status-active', label: 'Submitted' },
  'No POT': { className: 'status-failed', label: 'No POT' },
  'Not Submitted': { className: 'status-pending', label: 'Not Submitted' },
  'Urgent': { className: 'status-failed' },
  'Success': { className: 'status-active' },
  'New': { className: 'status-new' },
  'Alert': { className: 'status-failed' },
  'System': { className: 'status-system' },
  'Excellent': { className: 'status-active' },
  'Low': { className: 'status-low', label: 'Low Priority' },
  'Medium': { className: 'status-medium', label: 'Medium Priority' },
  'High': { className: 'status-high', label: 'High Priority' },
};

export default function StatusBadge({ status, size = 'md', domain }: StatusBadgeProps) {
  const rawStatus = String(status);
  const config = statusConfig[rawStatus] || { className: 'status-default' };
  const canonicalPresentation = domain
    ? resolveCanonicalStatusPresentation(domain, rawStatus)
    : undefined;
  const label =
    canonicalPresentation && canonicalPresentation !== UNKNOWN_STATUS_PRESENTATION
      ? canonicalPresentation.label
      : config.label || rawStatus;

  return (
    <span className={`status-badge ${config.className} status-${size}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}
