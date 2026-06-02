import type { DeliveryStatus, AccountStatus, POTStatus } from '../../types';
import './StatusBadge.css';

interface StatusBadgeProps {
  status: DeliveryStatus | AccountStatus | POTStatus | string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { className: string; label?: string }> = {
  'Active': { className: 'status-active' },
  'Pending': { className: 'status-pending' },
  'In Transit': { className: 'status-transit' },
  'Delivered': { className: 'status-delivered' },
  'Completed': { className: 'status-completed' },
  'Failed': { className: 'status-failed' },
  'Returned': { className: 'status-failed' },
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

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { className: 'status-default' };
  return (
    <span className={`status-badge ${config.className} status-${size}`}>
      <span className="status-dot" />
      {config.label || status}
    </span>
  );
}
