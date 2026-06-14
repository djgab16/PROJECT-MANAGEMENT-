import { useState } from 'react';
import Header from '../../components/layout/Header';
import { Save } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const permissionsData = [
  { module: 'View Dashboard Elements', op: true, admin: true },
  { module: 'Manage Delivery Orders', op: true, admin: true },
  { module: 'Upload/Verify POTs', op: true, admin: true },
  { module: 'View Analytics & Summaries', op: false, admin: true },
  { module: 'Manage Employee Directory', op: false, admin: true },
  { module: 'View System Activity Logs', op: false, admin: true },
  { module: 'Delete Records', op: false, admin: false },
  { module: 'Modify Role Access', op: false, admin: false },
];

export default function RoleAccess() {
  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('app-permissions');
    return saved ? JSON.parse(saved) : permissionsData;
  });
  const [isSaved, setIsSaved] = useState(false);
  const { addActivityLog } = useData();
  const { user } = useAuth();

  const handleToggle = (index: number, role: 'op' | 'admin') => {
    const updated = [...permissions];
    updated[index][role] = !updated[index][role];
    setPermissions(updated);
    setIsSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('app-permissions', JSON.stringify(permissions));
    setIsSaved(true);
    addActivityLog({
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      userName: user?.name || 'System',
      userRole: user?.role || 'Admin',
      userInitials: 'AD',
      userColor: '#E31A1A',
      action: 'Update',
      description: 'Modified role access permission matrix'
    });
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <>
      <Header title="Role Access Matrix" subtitle="System Configuration" actions={<button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={14}/> {isSaved ? 'Saved!' : 'Save Matrix'}</button>} />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h4>Global Permissions</h4>
            <span className="text-muted text-sm">Strict Configuration Mode</span>
          </div>
          <table className="data-table" style={{ marginTop: '16px' }}>
            <thead>
              <tr>
                <th>MODULE FEATURE</th>
                <th style={{ textAlign: 'center' }}>OP. TEAM</th>
                <th style={{ textAlign: 'center' }}>ADMIN</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p, idx) => (
                <tr key={p.module}>
                  <td><strong>{p.module}</strong></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={p.op} onChange={() => handleToggle(idx, 'op')} style={{ transform: 'scale(1.2)' }} /></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={p.admin} onChange={() => handleToggle(idx, 'admin')} style={{ transform: 'scale(1.2)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
