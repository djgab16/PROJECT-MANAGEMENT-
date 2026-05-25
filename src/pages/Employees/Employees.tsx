import { useState } from 'react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from '../../components/ui/RoleBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import type { Employee } from '../../types';

export default function Employees() {
  const { employees, addEmployee, deleteEmployee, updateEmployee, addActivityLog } = useData();
  const { user } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({ status: 'Active', role: 'OP. TEAM', systemAccess: 'Delivery Tracker' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleOpenForm = (emp?: Employee) => {
    if (emp) {
      setFormData(emp);
      setEditingId(emp.id);
    } else {
      setFormData({ status: 'Active', role: 'OP. TEAM', systemAccess: 'Delivery Tracker' });
      setEditingId(null);
    }
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.id) return alert("Please fill in Name and ID.");
    
    if (editingId) {
      updateEmployee(editingId, formData);
      addActivityLog({
        id: Date.now().toString(), timestamp: new Date().toLocaleString(),
        userName: user?.name || 'System', userRole: user?.role || 'Admin',
        userInitials: 'SY', userColor: '#FFB547', action: 'Update',
        description: `Updated details for employee ${formData.name}`
      });
    } else {
      addEmployee(formData as Employee);
      addActivityLog({
        id: Date.now().toString(), timestamp: new Date().toLocaleString(),
        userName: user?.name || 'System', userRole: user?.role || 'Admin',
        userInitials: 'SY', userColor: '#01B574', action: 'Create',
        description: `Added new employee ${formData.name}`
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name}?`)) {
      deleteEmployee(id);
      addActivityLog({
        id: Date.now().toString(), timestamp: new Date().toLocaleString(),
        userName: user?.name || 'System', userRole: user?.role || 'Admin',
        userInitials: 'SY', userColor: '#E31A1A', action: 'Delete',
        description: `Removed employee ${name}`
      });
    }
  };

  return (
    <>
      <Header 
        title="Employees / HR" 
        subtitle="Management" 
        actions={<button className="btn btn-primary btn-sm" onClick={() => handleOpenForm()}><Plus size={14}/> Add Employee</button>}
      />
      <div className="page-content">
        {isFormOpen && (
          <div className="card" style={{ marginBottom: '20px', border: '2px solid var(--primary)' }}>
            <div className="card-header">
              <h4>{editingId ? 'Edit Employee' : 'Add New Employee'}</h4>
              <button className="action-icon-btn" onClick={() => setIsFormOpen(false)}><X size={16} /></button>
            </div>
            <div className="form-row three-col">
              <div className="form-group">
                <label className="form-label">FULL NAME</label>
                <input className="form-input" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">EMPLOYEE ID</label>
                <input className="form-input" value={formData.id || ''} onChange={(e) => setFormData({...formData, id: e.target.value})} placeholder="e.g. EMP-999" disabled={!!editingId} />
              </div>
              <div className="form-group">
                <label className="form-label">ROLE</label>
                <select className="form-input" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as Employee['role']})}>
                  <option>OP. TEAM</option>
                  <option>ADMIN</option>
                  <option>SUPER ADMIN</option>
                </select>
              </div>
            </div>
            <div className="form-row two-col" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">SYSTEM ACCESS</label>
                <select className="form-input" value={formData.systemAccess} onChange={(e) => setFormData({...formData, systemAccess: e.target.value})}>
                  <option>Delivery Tracker</option>
                  <option>Operations</option>
                  <option>All Systems</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">STATUS</label>
                <select className="form-input" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as Employee['status']})}>
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Locked</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={handleSave}>Save Employee</button>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h4>Employee Directory</h4>
            <span className="archive-count-badge">{employees.length} Records</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>ID</th>
                <th>ROLE</th>
                <th>SYSTEM ACCESS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td className="cell-name">{emp.name}</td>
                  <td className="cell-id">{emp.id}</td>
                  <td><RoleBadge role={emp.role} /></td>
                  <td className="cell-muted">{emp.systemAccess}</td>
                  <td><StatusBadge status={emp.status} size="sm" /></td>
                  <td className="cell-actions">
                    <button className="action-icon-btn" title="Edit" onClick={() => handleOpenForm(emp)}><Pencil size={14} /></button>
                    {emp.role !== 'SUPER ADMIN' && (
                      <button className="action-icon-btn danger" title="Remove" onClick={() => handleDelete(emp.id, emp.name)}><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
