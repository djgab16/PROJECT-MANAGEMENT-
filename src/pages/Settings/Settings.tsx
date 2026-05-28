import { useState } from 'react';
import Header from '../../components/layout/Header';
import { Save } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';

export default function Settings() {
  const [isSaved, setIsSaved] = useState(false);
  const { addActivityLog } = useData();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({ emailNotifs: true, smsNotifs: false, timezone: 'Asia/Manila' });

  const handleSave = () => {
    setIsSaved(true);
    addActivityLog({
      id: Date.now().toString(), timestamp: new Date().toLocaleString(),
      userName: 'System', userRole: 'Admin', userInitials: 'SY', userColor: '#A3AED0',
      action: 'Update', description: 'Updated system preferences'
    });
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <>
      <Header title="Settings" subtitle="System Preferences" actions={<button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={14}/> {isSaved ? 'Saved!' : 'Save Settings'}</button>} />
      <div className="page-content">
        <div className="edit-grid">
          <div className="card">
            <h4>Appearance</h4>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">THEME</label>
              <select className="form-input" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
                <option value="system">System Default</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">TIMEZONE</label>
              <select className="form-input" value={settings.timezone} onChange={(e) => setSettings({...settings, timezone: e.target.value})}>
                <option value="Asia/Manila">Asia/Manila (PHT)</option>
                <option value="UTC">UTC (Universal)</option>
              </select>
            </div>
          </div>
          <div className="card">
            <h4>Notifications</h4>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="check-option">
                <input type="checkbox" checked={settings.emailNotifs} onChange={(e) => setSettings({...settings, emailNotifs: e.target.checked})} style={{ transform: 'scale(1.2)' }} />
                Enable Email Alerts
              </label>
              <p className="text-muted text-sm" style={{ paddingLeft: '24px', marginTop: '4px' }}>Receive daily summaries and urgent failed pickup alerts.</p>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="check-option">
                <input type="checkbox" checked={settings.smsNotifs} onChange={(e) => setSettings({...settings, smsNotifs: e.target.checked})} style={{ transform: 'scale(1.2)' }} />
                Enable SMS Push
              </label>
              <p className="text-muted text-sm" style={{ paddingLeft: '24px', marginTop: '4px' }}>Receive instant push for high priority actions.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
