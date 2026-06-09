import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Home, ScanLine, Settings, ArrowLeft, Menu, Bell } from 'lucide-react';
import logo from '../../assets/logo.png';
import './DriverLayout.css';

export default function DriverLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === '/driver/dashboard';

  return (
    <div className="driver-layout">
      <header className="driver-header">
        <div className="driver-header-left">
          {!isDashboard ? (
            <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Go Back">
              <ArrowLeft size={24} />
            </button>
          ) : (
            <button className="icon-btn-plain" aria-label="Menu">
              <Menu size={24} />
            </button>
          )}
        </div>
        
        <div className="driver-header-center">
          <img src={logo} alt="Speedex Logo" className="driver-logo" />
        </div>

        <div className="driver-header-right">
          <button className="icon-btn-plain" onClick={() => navigate('/notifications')} aria-label="Notifications">
            <Bell size={24} />
          </button>
        </div>
      </header>
      
      <main className="driver-main-content">
        <Outlet />
      </main>

      <nav className="driver-bottom-nav">
        <NavLink 
          to="/driver/dashboard" 
          className={({ isActive }) => `driver-nav-item ${isActive ? 'active' : ''}`}
        >
          <Home size={24} />
          <span>Home</span>
        </NavLink>
        
        <NavLink 
          to="/driver/scan" 
          className={({ isActive }) => `driver-nav-item scan-nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="scan-icon-wrapper">
            <ScanLine size={28} />
          </div>
          <span style={{ marginTop: '8px' }}>Scan</span>
        </NavLink>
        
        <NavLink 
          to="/driver/settings" 
          className={({ isActive }) => `driver-nav-item ${isActive ? 'active' : ''}`}
        >
          <Settings size={24} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}
