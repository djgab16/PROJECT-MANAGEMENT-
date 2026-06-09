import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Trash2, Eye, Check, Bell, X } from 'lucide-react';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import EmptyState from '../../components/ui/EmptyState';
import './Notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, deliveryOrders, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications, refreshOrders } = useData();

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedId, setSelectedId] = useState(notifications.length > 0 ? notifications[0].id : '');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  
  const selected = selectedId ? notifications.find(n => n.id === selectedId) : null;
  const filtered = activeTab === 'all' ? notifications : activeTab === 'read' ? notifications.filter(n => n.read) : notifications.filter(n => n.type === activeTab && !n.read);

  const handleToggleCheck = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) {
      setCheckedIds(prev => [...prev, id]);
    } else {
      setCheckedIds(prev => prev.filter(checkedId => checkedId !== id));
    }
  };

  const handleMarkCheckedAsRead = () => {
    if (checkedIds.length > 0) {
      checkedIds.forEach(id => markNotificationRead(id));
      setCheckedIds([]);
    } else if (selectedId) {
      markNotificationRead(selectedId);
    }
  };

  const handleDeleteChecked = () => {
    if (checkedIds.length > 0) {
      checkedIds.forEach(id => deleteNotification(id));
      setCheckedIds([]);
      if (checkedIds.includes(selectedId)) setSelectedId('');
    } else if (selectedId) {
      deleteNotification(selectedId);
      setSelectedId('');
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'alert', label: 'Alerts', count: notifications.filter(n => n.type === 'alert' && !n.read).length },
    { key: 'success', label: 'Success', count: notifications.filter(n => n.type === 'success' && !n.read).length },
    { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system' && !n.read).length },
    { key: 'read', label: 'Read' },
  ];

  const grouped = filtered.reduce((acc, n) => {
    if (!acc[n.date]) acc[n.date] = [];
    acc[n.date].push(n);
    return acc;
  }, {} as Record<string, typeof notifications>);

  return (
    <>
      <Header
        title="Notifications Center"
        actions={
          <div className="flex gap-sm">
            <button className="btn btn-outline btn-sm" onClick={markAllNotificationsRead}><CheckCheck size={14} /> Mark all as read</button>
            <button className="btn btn-outline btn-sm" onClick={clearAllNotifications}><Trash2 size={14} /> Clear all</button>
          </div>
        }
      />
      <div className="page-content">
        <div className="notif-layout">
          {/* List */}
          <div className="notif-list-panel">
            <div className="notif-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`notif-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label} {tab.count !== undefined && tab.count > 0 && <span className="notif-tab-count">{tab.count}</span>}
                </button>
              ))}
            </div>
            <div className="notif-actions-row">
              <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>{notifications.filter(n => !n.read).length} unread notifications</span>
            </div>
            <div className="notif-list">
              {filtered.length === 0 ? (
                <div style={{ padding: '48px 24px' }}>
                  <EmptyState 
                    icon={Bell} 
                    title="No Notifications" 
                    description={activeTab === 'all' ? "You don't have any notifications yet." : `You don't have any ${activeTab} notifications.`} 
                  />
                </div>
              ) : (
                Object.entries(grouped).map(([date, items]) => (
                  <div key={date}>
                    <div className="notif-date-header">{date.replace('March', 'MARCH').toUpperCase()}</div>
                    {items.map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${selectedId === n.id ? 'selected' : ''} ${!n.read ? 'unread' : ''}`}
                        onClick={() => setSelectedId(n.id)}
                      >
                        <input 
                          type="checkbox" 
                          className="notif-checkbox" 
                          checked={checkedIds.includes(n.id)}
                          onChange={(e) => handleToggleCheck(e, n.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="notif-item-content">
                          <div className="notif-item-header">
                            <strong>{n.title}</strong>
                            {n.waybillNo && <span className="notif-waybill">{n.waybillNo}</span>}
                            {n.statusBadge && <StatusBadge status={n.statusBadge} size="sm" />}
                          </div>
                          <p className="notif-item-desc">{n.description}</p>
                          <span className="notif-item-meta">{n.timestamp} · {n.source}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="notif-detail-panel card">
              <div className="notif-detail-header">
                <h4>Notification Detail</h4>
                <button className="action-icon-btn" title="Close" onClick={() => setSelectedId('')}><X size={14} /></button>
              </div>
              <div className="notif-detail-alert">
                <div className="notif-alert-icon">
                  <Bell size={18} />
                </div>
                <div>
                  <strong className="notif-alert-type" style={{ color: selected.type === 'alert' ? 'var(--status-failed)' : selected.type === 'success' ? 'var(--status-active)' : 'var(--text-primary)' }}>
                    ▲ {selected.title.toUpperCase()}
                  </strong>
                  <span className="text-muted text-sm">Today, {selected.timestamp} · {selected.source}</span>
                </div>
              </div>

              <div className="notif-detail-body card" style={{ background: 'var(--bg-main)', boxShadow: 'none' }}>
                <strong>{selected.title} — Urgent Action Required</strong>
                <p>{selected.description}</p>
              </div>

              <div className="summary-fields">
                <div className="summary-field"><span>Waybill No.</span><span className="summary-val teal">{selected.waybillNo || '—'}</span></div>
                <div className="summary-field"><span>Alert Type</span><span className="summary-val" style={{ color: 'var(--status-failed)' }}>{selected.type === 'alert' ? 'Failed Pickup' : selected.type}</span></div>
                <div className="summary-field"><span>Days Overdue</span><span className="summary-val" style={{ color: 'var(--status-failed)' }}>3 days</span></div>
                <div className="summary-field"><span>Area</span><span>Marikina City</span></div>
                <div className="summary-field"><span>Assigned Driver</span><span className="summary-val" style={{ color: 'var(--status-failed)' }}>Unassigned</span></div>
                <div className="summary-field"><span>Client / Sender</span><span>Shopee Express</span></div>
                <div className="summary-field"><span>Recipient</span><span>Torres, Miguel</span></div>
                <div className="summary-field"><span>Notification Sent</span><span>Mar 29 · 10:15 AM</span></div>
              </div>

              <span className="label" style={{ marginTop: '16px' }}>ACTIONS</span>
              <div className="detail-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    if (selected.waybillNo) {
                      const matched = deliveryOrders.find(o => o.waybillNo?.trim().toUpperCase() === selected.waybillNo?.trim().toUpperCase());
                      if (matched) {
                        navigate(`/delivery-orders/${matched.id}`);
                      } else {
                        alert(`Order with Waybill ${selected.waybillNo} was not found.`);
                      }
                    } else {
                      alert('This notification is not linked to any Waybill.');
                    }
                  }}
                >
                  <Eye size={16} /> View Order Details
                </button>
                <button className="btn btn-outline" onClick={() => { markNotificationRead(selected.id); setSelectedId(''); }}><Check size={16} /> Mark as Read</button>
                <button className="btn btn-danger" onClick={() => { deleteNotification(selected.id); setSelectedId(''); }}><Trash2 size={16} /> Delete Notification</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Selection Bar */}
      <div className={`floating-selection-bar ${checkedIds.length > 0 ? 'visible' : ''}`}>
        <span className="floating-selection-count">{checkedIds.length} selected</span>
        <button className="btn btn-sm" onClick={handleMarkCheckedAsRead}><Check size={14} /> Mark as read</button>
        <button className="btn btn-sm btn-danger" onClick={handleDeleteChecked}><Trash2 size={14} /> Delete</button>
      </div>
    </>
  );
}
