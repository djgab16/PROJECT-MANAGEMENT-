import type { RefObject } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, FileText, BarChart3,
  Settings, Activity, LogOut, FileBarChart, Archive as ArchiveIcon,
  ChevronLeft, ChevronRight, X, Truck, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DISPLAY } from '../../types';
import logo from '../../assets/logo.png';
import './Sidebar.css';

import type { UserRole } from '../../types';

interface NavLinkConfig {
  to: string;
  icon: React.ElementType;
  label: string;
  allowedRoles?: UserRole[];
}

const mainLinks: NavLinkConfig[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/dispatch', icon: Truck, label: 'Dispatch Control', allowedRoles: ['ADMIN', 'OP. TEAM'] },
  { to: '/sla-monitoring', icon: ShieldAlert, label: 'SLA Monitoring', allowedRoles: ['ADMIN', 'OP. TEAM'] },
  { to: '/archive', icon: ArchiveIcon, label: 'Archive' },
];

const integrationLinks: NavLinkConfig[] = [
  { to: '/reports', icon: FileBarChart, label: 'Reports', allowedRoles: ['ADMIN'] },
  { to: '/delivery-summary', icon: FileText, label: 'Delivery Summary', allowedRoles: ['ADMIN'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics View', allowedRoles: ['ADMIN'] },
];

const systemLinks: NavLinkConfig[] = [
  { to: '/settings', icon: Settings, label: 'Settings', allowedRoles: ['ADMIN'] },
  { to: '/activity-logs', icon: Activity, label: 'Activity Logs' },
];

interface SidebarProps {
  drawerRef?: RefObject<HTMLElement | null>;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  isMobileDrawer?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  drawerRef,
  closeButtonRef,
  isMobileDrawer = false,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRouteSelection = () => {
    if (isOpen) onClose?.();
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const hasAccess = (link: NavLinkConfig) => {
    if (!link.allowedRoles) return true;
    if (!user) return false;
    return link.allowedRoles.includes(user.role);
  };

  const roleLabel = user?.role
    ? (ROLE_DISPLAY[user.role as keyof typeof ROLE_DISPLAY] ?? user.role)
    : 'EMPLOYEE';

  const isModalOpen = isMobileDrawer && isOpen;

  return (
    <aside
      ref={drawerRef}
      id="staff-navigation-drawer"
      className={`staff-sidebar sidebar ${isOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      aria-label="Staff navigation"
      aria-hidden={isMobileDrawer && !isOpen ? true : undefined}
      aria-modal={isModalOpen ? true : undefined}
      role={isModalOpen ? 'dialog' : undefined}
      tabIndex={isMobileDrawer ? -1 : undefined}
    >
      <div className="sidebar-logo">
        <div className="sidebar-logo-wrapper">
          <img src={logo} alt="Speedex Logo" className="sidebar-logo-img" />
        </div>

        <button
          type="button"
          className="sidebar-toggle-btn ui-touch-target ui-touch-target--icon"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand staff navigation' : 'Collapse staff navigation'}
        >
          {isCollapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
        </button>

        <button
          ref={closeButtonRef}
          type="button"
          className="sidebar-close-btn ui-touch-target ui-touch-target--icon"
          onClick={onClose}
          aria-label="Close staff navigation"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-role-section">
        <div className={`sidebar-role-badge ${user?.role ? user.role.toLowerCase().replaceAll('.', '').replaceAll(' ', '-') : 'employee'}`}>
          <span className="sidebar-role-label">{roleLabel}</span>
          <span className="sidebar-role-initial" aria-hidden="true">{user?.role?.[0] || 'E'}</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Staff destinations">
        <div className="nav-section">
          <span className="nav-section-title">MAIN MENU</span>
          {mainLinks.filter(hasAccess).map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              title={isCollapsed ? link.label : ''}
              onClick={handleRouteSelection}
              className={({ isActive }) =>
                `nav-item ${isActive || (link.to === '/dashboard' && location.pathname === '/') ? 'nav-item-active' : ''}`
              }
            >
              <link.icon size={18} aria-hidden="true" />
              <span className="nav-item-label">{link.label}</span>
            </NavLink>
          ))}
        </div>

        {integrationLinks.filter(hasAccess).length > 0 && (
          <div className="nav-section">
            <span className="nav-section-title">INTEGRATION</span>
            {integrationLinks.filter(hasAccess).map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                title={isCollapsed ? link.label : ''}
                onClick={handleRouteSelection}
                className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <link.icon size={18} aria-hidden="true" />
                <span className="nav-item-label">{link.label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {systemLinks.filter(hasAccess).length > 0 && (
          <div className="nav-section">
            <span className="nav-section-title">SYSTEM</span>
            {systemLinks.filter(hasAccess).map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                title={isCollapsed ? link.label : ''}
                onClick={handleRouteSelection}
                className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <link.icon size={18} aria-hidden="true" />
                <span className="nav-item-label">{link.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile-card">
          <div className="profile-avatar">{user ? getInitials(user.name) : '??'}</div>
          <div className="profile-info">
            <span className="profile-name">{user?.name || 'Guest User'}</span>
            <span className="profile-role">{user?.role || 'Staff'}</span>
          </div>
          <button
            type="button"
            className="profile-logout ui-touch-target ui-touch-target--icon"
            title="Logout"
            aria-label="Log out"
            onClick={handleLogout}
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
