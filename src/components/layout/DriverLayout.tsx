import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Home, ScanLine, Settings, ArrowLeft, Bell } from 'lucide-react';
import logo from '../../assets/logo.png';
import './DriverLayout.css';

export default function DriverLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === '/driver/dashboard';

  return (
    <div className="driver-layout ui-page-boundary ui-motion">
      <header className="driver-header">
        <div className="driver-header-left">
          {!isDashboard && (
            <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Go Back">
              <ArrowLeft size={24} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="driver-header-center">
          <img src={logo} alt="Speedex Logo" className="driver-logo" />
        </div>

        <div className="driver-header-right">
          <button
            type="button"
            className="icon-btn-plain"
            onClick={() => navigate('/driver/notifications')}
            aria-label="Notifications"
          >
            <Bell size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="driver-main-content">
        <Outlet />
      </main>

      <nav className="driver-bottom-nav" aria-label="Driver navigation">
        <NavLink
          to="/driver/dashboard"
          className={({ isActive }) => `driver-nav-item ${isActive ? 'active' : ''}`}
        >
          <Home size={24} aria-hidden="true" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/driver/scan"
          className={({ isActive }) => `driver-nav-item scan-nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="scan-icon-wrapper">
            <ScanLine size={28} aria-hidden="true" />
          </div>
          <span>Scan</span>
        </NavLink>

        <NavLink
          to="/driver/settings"
          className={({ isActive }) => `driver-nav-item ${isActive ? 'active' : ''}`}
        >
          <Settings size={24} aria-hidden="true" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}
