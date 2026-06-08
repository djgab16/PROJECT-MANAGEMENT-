import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, FileText, BarChart3,
  Settings, Activity, LogOut, FileBarChart, Archive as ArchiveIcon, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
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
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const hasAccess = (link: NavLinkConfig) => {
    if (!link.allowedRoles) return true;
    if (!user) return false;
    return link.allowedRoles.includes(user.role);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-wrapper">
          <img src={logo} alt="Speedex Logo" className="sidebar-logo-img" />
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>×</button>
      </div>

      <div className="sidebar-role-section">
        <div className={`sidebar-role-badge ${user?.role ? user.role.toLowerCase().replaceAll('.', '').replaceAll(' ', '-') : 'employee'}`}>
          {theme === 'dark' ? <Moon size={14} className="role-icon" /> : <Sun size={14} className="role-icon" />}
          {user?.role || 'EMPLOYEE'}
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">MAIN MENU</span>
          {mainLinks.filter(hasAccess).map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-item ${isActive || (link.to === '/dashboard' && location.pathname === '/') ? 'nav-item-active' : ''}`
              }
            >
              <link.icon size={18} />
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
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''}`
                }
              >
                <link.icon size={18} />
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
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''}`
                }
              >
                <link.icon size={18} />
                <span className="nav-item-label">{link.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer-profile">
        <div className="sidebar-profile-card">
          <div className="profile-avatar">{user ? getInitials(user.name) : '??'}</div>
          <div className="profile-info">
            <span className="profile-name">{user?.name || 'Guest User'}</span>
            <span className="profile-role">{user?.role || 'Staff'}</span>
          </div>
          <button className="profile-logout" title="Logout" onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
