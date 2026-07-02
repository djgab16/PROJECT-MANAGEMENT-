import type { UserRole } from '../../types';
import './RoleBadge.css';

interface RoleBadgeProps {
  role: UserRole;
}

const roleConfig: Record<UserRole, { className: string; label: string }> = {
  'ADMIN': { className: 'role-admin', label: 'ADMIN' },
  'OP. TEAM': { className: 'role-ops', label: 'ENCODER' },
  'DRIVER': { className: 'role-driver', label: 'DRIVER' },
  'CLIENT': { className: 'role-client', label: 'CLIENT' },
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] || { className: 'role-default', label: role };
  return (
    <span className={`role-badge ${config.className}`}>
      {config.label}
    </span>
  );
}
