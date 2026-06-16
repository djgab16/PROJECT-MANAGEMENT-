import { useState, useMemo } from 'react';
import { Download, FileText, Plus, Pencil, CheckCircle2, Users, X, Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { ActionType } from '../../types';
import './ActivityLogs.css';

const actionColors: Record<ActionType, string> = {
  'Create': '#01B574', 'Update': '#FFB547', 'Assign': '#4318FF',
  'POT Upload': '#FF7B42', 'POD Upload': '#10B981', 'Login': '#00A99D', 'Archive': '#A3AED0', 'Delete': '#E31A1A',
};

export default function ActivityLogs() {
  const { activityLogs, deliveryOrders } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const isAdmin = user?.role === 'ADMIN';
  
  const allActions = useMemo(() => {
    const actions = Array.from(new Set(activityLogs.map(l => l.action)));
    return actions.sort();
  }, [activityLogs]);

  const allUsers = useMemo(() => {
    const users = Array.from(new Set(activityLogs.map(l => l.userName)));
    return users.sort();
  }, [activityLogs]);

  const filteredLogs = useMemo(() => {
    let logs = isAdmin ? activityLogs : activityLogs.filter(log => log.userName === user?.name);

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      logs = logs.filter(l => 
        l.userName.toLowerCase().includes(s) || 
        l.description.toLowerCase().includes(s) || 
        (l.reference || '').toLowerCase().includes(s)
      );
    }

    if (dateFrom) {
      logs = logs.filter(l => new Date(l.timestamp) >= new Date(dateFrom));
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      logs = logs.filter(l => new Date(l.timestamp) <= end);
    }

    if (selectedActions.length > 0) {
      logs = logs.filter(l => selectedActions.includes(l.action));
    }

    if (selectedUsers.length > 0) {
      logs = logs.filter(l => selectedUsers.includes(l.userName));
    }

    return logs;
  }, [activityLogs, isAdmin, user?.name, searchTerm, dateFrom, dateTo, selectedActions, selectedUsers]);

  const handleActionToggle = (action: string) => {
    setSelectedActions(prev => 
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    );
  };

  const handleUserToggle = (userName: string) => {
    setSelectedUsers(prev => 
      prev.includes(userName) ? prev.filter(u => u !== userName) : [...prev, userName]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedActions([]);
    setSelectedUsers([]);
  };

  const stats = {
    total: filteredLogs.length,
    created: filteredLogs.filter(l => l.action === 'Create').length,
    updated: filteredLogs.filter(l => l.action === 'Update').length,
    uploads: filteredLogs.filter(l => l.action === 'POT Upload' || l.action === 'POD Upload').length,
    deletions: filteredLogs.filter(l => l.action === 'Delete').length,
  };

  return (
    <>
      <Header
        title={isAdmin ? "System Activity Logs" : "Your Activity Logs"}
        subtitle="DELIVERY TRACKER · SYSTEM"
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={
          <div className="flex gap-sm">
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Download size={14} /> Export Logs</button>
            <button className="btn btn-dark btn-sm"><FileText size={14} /> View Full Report</button>
          </div>
        }
      />
      <div className="page-content">
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <StatCard icon={<FileText size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label={isAdmin ? "TOTAL LOGS" : "YOUR LOGS"} value={stats.total} />
          <StatCard icon={<Plus size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="RECORDS CREATED" value={stats.created} />
          <StatCard icon={<Pencil size={18} />} iconColor="var(--status-pending)" iconBg="var(--status-pending-bg)" label="UPDATES MADE" value={stats.updated} />
          <StatCard icon={<CheckCircle2 size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="POT/POD UPLOADS" value={stats.uploads} />
          {isAdmin && <StatCard icon={<Users size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="ACTIVE USERS" value={allUsers.length} />}
          {isAdmin && <StatCard icon={<X size={18} />} iconColor="var(--status-failed)" iconBg="var(--status-failed-bg)" label="DELETIONS" value={stats.deletions} />}
        </div>

        <div className="logs-layout">
          <div className="card logs-filter">
            <div className="card-header">
              <h4>Filters</h4>
              <button className="text-link" onClick={clearFilters}>Clear</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">SEARCH</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  className="form-input" 
                  style={{ paddingLeft: '32px' }}
                  placeholder="User, waybill, desc..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">DATE RANGE</label>
              <input 
                className="form-input" 
                type="date" 
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
              <input 
                className="form-input" 
                type="date" 
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{ marginTop: '6px' }} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">ACTION TYPE</label>
              <div className="filter-options-list">
                {allActions.map(action => (
                  <label key={action} className="check-option">
                    <input 
                      type="checkbox" 
                      checked={selectedActions.includes(action)}
                      onChange={() => handleActionToggle(action)}
                    /> 
                    {action} 
                    <span className="check-count">{activityLogs.filter(l => l.action === action).length}</span>
                  </label>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="form-group">
                <label className="form-label">USERS</label>
                <div className="filter-options-list">
                  {allUsers.map(userName => (
                    <label key={userName} className="check-option">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(userName)}
                        onChange={() => handleUserToggle(userName)}
                      /> 
                      {userName}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div className="flex items-center gap-sm">
                <h4>{isAdmin ? 'System Activity Log' : 'Your Activity Log'}</h4>
                <span className="archive-count-badge">{filteredLogs.length} entries</span>
              </div>
              <button className="view-all-link" onClick={() => window.print()} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Export →</button>
            </div>
            <div className="table-responsive">
              <table className="data-table logs-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>USER</th>
                    <th>ACTION</th>
                    <th>DESCRIPTION</th>
                    <th>REFERENCE</th>
                    <th>VIEW</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>No logs found matching your filters.</td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id}>
                        <td className="text-sm text-muted">
                          {new Date(log.timestamp).toLocaleString('en-US', { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </td>
                        <td>
                          <div className="driver-cell">
                            <div className="driver-avatar" style={{ background: log.userColor }}>{log.userInitials}</div>
                            <div><strong className="text-sm">{log.userName}</strong><div className="cell-sub">{log.userRole}</div></div>
                          </div>
                        </td>
                        <td><span className="action-badge" style={{ background: (actionColors[log.action as ActionType] || '#A3AED0') + '18', color: actionColors[log.action as ActionType] || '#A3AED0' }}>{log.action}</span></td>
                        <td className="text-sm desc-cell">{log.description}</td>
                        <td className="text-sm text-muted">{log.reference || '—'}</td>
                        <td>
                          <button 
                            className="action-icon-btn" 
                            onClick={() => {
                              if (log.reference && log.reference.startsWith('SPX-')) {
                                const order = deliveryOrders.find(o => o.waybillNo === log.reference);
                                if (order) navigate(`/delivery-orders/${order.id}/history`);
                                else alert('Delivery Order not found for reference: ' + log.reference);
                              } else {
                                alert('No valid Delivery Order reference for this event.');
                              }
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-pagination">
              <span className="pagination-info">Showing {filteredLogs.length} log entries</span>
              <div className="pagination-controls">
                <button className="pagination-btn" disabled>‹</button>
                <button className="pagination-btn active">1</button>
                <button className="pagination-btn" disabled>›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

