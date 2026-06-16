import { useState } from 'react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from '../../components/ui/RoleBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import type { Employee } from '../../types';

export default function Employees() {
  const { employees, addEmployee, deleteEmployee, updateEmployee } = useData();
  const { user } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<{id: string, name: string} | null>(null);
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
    if (!formData.name || !formData.employeeId) return alert("Please fill in Name and Employee ID.");
    
    if (editingId) {
      updateEmployee(editingId, formData);
    } else {
      addEmployee(formData as Employee);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setEmpToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (empToDelete) {
      deleteEmployee(empToDelete.id);
      setShowDeleteConfirm(false);
      setEmpToDelete(null);
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
                <input className="form-input" value={formData.employeeId || ''} onChange={(e) => setFormData({...formData, employeeId: e.target.value})} placeholder="e.g. EMP-999" disabled={!!editingId} />
              </div>
              <div className="form-group">
                <label className="form-label">ROLE</label>
                <select className="form-input" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as Employee['role']})}>
                  <option>ADMIN</option>
                  <option value="OP. TEAM">ENCODER</option>
                  <option>DRIVER</option>
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
              {[...employees]
                .sort((a, b) => {
                  const hierarchy: Record<string, number> = { 'ADMIN': 1, 'OP. TEAM': 2, 'DRIVER': 3 };
                  return (hierarchy[a.role] || 99) - (hierarchy[b.role] || 99);
                })
                .map(emp => (
                <tr key={emp.id}>
                  <td className="cell-name">{emp.name}</td>
                  <td className="cell-id">{emp.employeeId || emp.id}</td>
                  <td><RoleBadge role={emp.role} /></td>
                  <td className="cell-muted">{emp.systemAccess}</td>
                  <td><StatusBadge status={emp.status} size="sm" /></td>
                  <td className="cell-actions">
                    <button className="action-icon-btn" title="Edit" onClick={() => handleOpenForm(emp)}><Pencil size={14} /></button>
                    {emp.role !== 'ADMIN' && (
                      <button className="action-icon-btn danger" title="Remove" onClick={() => handleDelete(emp.id, emp.name)}><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#E31A1A' }}>
              <Trash2 size={24} />
              <h4 style={{ margin: 0 }}>Remove Employee</h4>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Are you sure you want to remove <strong>{empToDelete?.name}</strong>? This action will permanently delete their account and access.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={confirmDelete}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
