import { Download, FileText, Plus, Pencil, CheckCircle2, Users, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { ActionType } from '../../types';
import './ActivityLogs.css';

const actionColors: Record<ActionType, string> = {
  'Create': '#01B574', 'Update': '#FFB547', 'Assign': '#4318FF',
  'POT Upload': '#FF7B42', 'Login': '#00A99D', 'Archive': '#A3AED0', 'Delete': '#E31A1A',
};

export default function ActivityLogs() {
  const { activityLogs, deliveryOrders } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const displayedLogs = isAdmin ? activityLogs : activityLogs.filter(log => log.userName === user?.name);

  return (
    <>
      <Header
        title={isAdmin ? "System Activity Logs" : "Your Activity Logs"}
        subtitle="DELIVERY TRACKER · SYSTEM"
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={
          <div className="flex gap-sm">
            <button className="btn btn-outline btn-sm"><Download size={14} /> Export Logs</button>
            <button className="btn btn-dark btn-sm"><FileText size={14} /> View Full Report</button>
          </div>
        }
      />
      <div className="page-content">
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <StatCard icon={<FileText size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label={isAdmin ? "TOTAL LOGS TODAY" : "YOUR LOGS TODAY"} value={displayedLogs.length} />
          <StatCard icon={<Plus size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="RECORDS CREATED" value={displayedLogs.filter(l => l.action === 'Create').length} />
          <StatCard icon={<Pencil size={18} />} iconColor="var(--status-pending)" iconBg="var(--status-pending-bg)" label="UPDATES MADE" value={displayedLogs.filter(l => l.action === 'Update').length} />
          <StatCard icon={<CheckCircle2 size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="POT UPLOADS" value={displayedLogs.filter(l => l.action === 'POT Upload').length} />
          {isAdmin && <StatCard icon={<Users size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="ACTIVE USERS" value="8" />}
          {isAdmin && <StatCard icon={<X size={18} />} iconColor="var(--status-failed)" iconBg="var(--status-failed-bg)" label="DELETIONS" value={displayedLogs.filter(l => l.action === 'Delete').length} />}
        </div>

        <div className="logs-layout">
          <div className="card logs-filter">
            <div className="card-header"><h4>Filters</h4><button className="text-link">Clear</button></div>
            <div className="form-group"><label className="form-label">SEARCH</label><input className="form-input" placeholder="Search user, waybill..." /></div>
            <div className="form-group"><label className="form-label">DATE RANGE</label><input className="form-input" type="date" defaultValue="2026-03-29" /><input className="form-input" type="date" defaultValue="2026-03-29" style={{ marginTop: '6px' }} /></div>
            <div className="form-group">
              <label className="form-label">ACTION TYPE</label>
              <label className="check-option"><input type="checkbox" defaultChecked /> All Actions <span className="check-count">1,482</span></label>
              <label className="check-option"><input type="checkbox" /> Create <span className="check-count">284</span></label>
              <label className="check-option"><input type="checkbox" /> Update <span className="check-count">931</span></label>
              <label className="check-option"><input type="checkbox" /> Upload POT <span className="check-count">98</span></label>
              <label className="check-option"><input type="checkbox" /> Login <span className="check-count">56</span></label>
              <label className="check-option"><input type="checkbox" /> Archive <span className="check-count">110</span></label>
              <label className="check-option"><input type="checkbox" /> Delete <span className="check-count">3</span></label>
            </div>
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">USERS</label>
                  <label className="check-option"><input type="checkbox" /> Gabriel, D.</label>
                  <label className="check-option"><input type="checkbox" /> Conag, R.</label>
                  <label className="check-option"><input type="checkbox" /> Panaligan, S.</label>
                  <label className="check-option"><input type="checkbox" /> Dumlao, J.</label>
                </div>
              )}

          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div className="flex items-center gap-sm">
                <h4>{isAdmin ? 'System Activity Log' : 'Your Activity Log'}</h4>
                <span className="archive-count-badge">{displayedLogs.length} entries</span>
              </div>
              <a href="#" className="view-all-link">Export →</a>
            </div>
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
                {displayedLogs.map(log => (
                  <tr key={log.id}>
                    <td className="text-sm text-muted">{log.timestamp}</td>
                    <td>
                      <div className="driver-cell">
                        <div className="driver-avatar" style={{ background: log.userColor }}>{log.userInitials}</div>
                        <div><strong className="text-sm">{log.userName}</strong><div className="cell-sub">{log.userRole}</div></div>
                      </div>
                    </td>
                    <td><span className="action-badge" style={{ background: actionColors[log.action] + '18', color: actionColors[log.action] }}>{log.action}</span></td>
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
                ))}
              </tbody>
            </table>
            <div className="table-pagination">
              <span className="pagination-info">Showing {displayedLogs.length} log entries today</span>
              <div className="pagination-controls">
                <button className="pagination-btn" disabled>‹</button>
                <button className="pagination-btn active">1</button>
                <button className="pagination-btn">2</button>
                <button className="pagination-btn">3</button>
                <span className="pagination-ellipsis">...</span>
                <button className="pagination-btn">186</button>
                <button className="pagination-btn">›</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
