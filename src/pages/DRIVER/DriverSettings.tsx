import { useAuth } from '../../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './DriverSettings.css';

export default function DriverSettings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="driver-settings">
      <h2>Settings</h2>
      
      <div className="driver-profile-card">
        <div className="driver-profile-avatar">
          <User size={40} color="var(--primary)" />
        </div>
        <div className="driver-profile-info">
          <h3>{user?.name}</h3>
          <p>{user?.role}</p>
        </div>
      </div>

      <div className="settings-options">
        <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '1rem' }}>Appearance</h4>
          <div className="form-group">
            <label className="form-label">THEME</label>
            <select className="form-input" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="system">System Default</option>
            </select>
          </div>
        </div>

        <button className="btn btn-danger btn-block" onClick={logout}>
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}
