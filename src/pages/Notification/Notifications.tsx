import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Trash2, Eye, Check, Bell, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../../components/layout/Header';
import NotificationCollection from '../../components/ui/NotificationCollection';
import { notifyActionFeedback, resetActionFeedback } from '../../components/ui/actionFeedback';
import { runConfirmedNotificationMutation, type NotificationMutation } from '../../components/ui/notificationMutations';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import './Notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, deliveryOrders, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications, refreshOrders } = useData();
  const { user } = useAuth();

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const [activeTab, setActiveTab] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const selected = selectedId ? notifications.find(n => n.id === selectedId) : null;
  const matchedOrderForSelected = selected?.waybillNo
    ? deliveryOrders.find(o => o.waybillNo?.trim().toUpperCase() === selected.waybillNo?.trim().toUpperCase())
    : null;

  let parsedArea = '—';
  let parsedRecipient = '—';
  if (selected?.description) {
    const inMatch = selected.description.match(/in\s+([^for\n]+?)\s+for\s+([^\n.]+)/i);
    if (inMatch) {
      parsedArea = inMatch[1].trim();
      parsedRecipient = inMatch[2].trim();
    }
  }

  const selectedArea = matchedOrderForSelected ? (matchedOrderForSelected.area || '—') : parsedArea;
  const selectedRecipient = matchedOrderForSelected ? (matchedOrderForSelected.recipientName || '—') : parsedRecipient;
  const filtered = activeTab === 'all' ? notifications : activeTab === 'read' ? notifications.filter(n => n.read) : notifications.filter(n => n.type === activeTab && !n.read);

  const handleCheckedChange = (notificationId: string, checked: boolean) => {
    setCheckedIds((currentIds) => checked
      ? (currentIds.includes(notificationId) ? currentIds : [...currentIds, notificationId])
      : currentIds.filter((checkedId) => checkedId !== notificationId));
  };

  const handleNotificationActivate = (notification: (typeof notifications)[number]) => {
    if (isSelectionMode) {
      handleCheckedChange(notification.id, !checkedIds.includes(notification.id));
      return;
    }
    setSelectedId(notification.id);
  };

  const runOwnedMutation = async (
    mutation: NotificationMutation,
    execute: () => Promise<boolean>,
    actionId: string,
    successMessage: string,
  ) => {
    resetActionFeedback(actionId);
    const result = await runConfirmedNotificationMutation(notifications, mutation, execute);
    notifyActionFeedback({
      actionId,
      phase: result.confirmed ? 'success' : 'failure',
      toast: {
        type: result.confirmed ? 'success' : 'error',
        message: result.confirmed ? successMessage : result.message,
      },
    });
    return result.confirmed;
  };

  const handleMarkCheckedAsRead = async () => {
    if (checkedIds.length > 0) {
      const targetIds = [...checkedIds];
      const actionId = 'notifications:selection:read';
      resetActionFeedback(actionId);
      const results = await Promise.all(targetIds.map((notificationId) =>
        runConfirmedNotificationMutation(
          notifications,
          { kind: 'read', notificationId },
          () => markNotificationRead(notificationId),
        ),
      ));
      const failedIds = targetIds.filter((_, index) => !results[index]?.confirmed);
      setCheckedIds(failedIds);
      if (failedIds.length === 0) setIsSelectionMode(false);
      notifyActionFeedback({
        actionId,
        phase: failedIds.length === 0 ? 'success' : 'failure',
        toast: {
          type: failedIds.length === 0 ? 'success' : 'error',
          message: failedIds.length === 0
            ? `${targetIds.length} notifications marked as read`
            : `${failedIds.length} selected notifications could not be marked as read.`,
        },
      });
    } else if (selectedId) {
      const confirmed = await runOwnedMutation(
        { kind: 'read', notificationId: selectedId },
        () => markNotificationRead(selectedId),
        `notification:read:${selectedId}`,
        'Notification marked as read',
      );
      if (confirmed) setSelectedId('');
    }
  };

  const handleDeleteChecked = async () => {
    if (checkedIds.length > 0) {
      const targetIds = [...checkedIds];
      const actionId = 'notifications:selection:delete';
      resetActionFeedback(actionId);
      const results = await Promise.all(targetIds.map((notificationId) =>
        runConfirmedNotificationMutation(
          notifications,
          { kind: 'delete', notificationId },
          () => deleteNotification(notificationId),
        ),
      ));
      const failedIds = targetIds.filter((_, index) => !results[index]?.confirmed);
      const confirmedIds = targetIds.filter((_, index) => results[index]?.confirmed);
      setCheckedIds(failedIds);
      if (failedIds.length === 0) setIsSelectionMode(false);
      if (confirmedIds.includes(selectedId)) setSelectedId('');
      notifyActionFeedback({
        actionId,
        phase: failedIds.length === 0 ? 'success' : 'failure',
        toast: {
          type: failedIds.length === 0 ? 'success' : 'error',
          message: failedIds.length === 0
            ? `${targetIds.length} notifications deleted`
            : `${failedIds.length} selected notifications could not be deleted.`,
        },
      });
    } else if (selectedId) {
      const confirmed = await runOwnedMutation(
        { kind: 'delete', notificationId: selectedId },
        () => deleteNotification(selectedId),
        `notification:delete:${selectedId}`,
        'Notification deleted',
      );
      if (confirmed) setSelectedId('');
    }
  };

  const handleMarkAllRead = async () => {
    await runOwnedMutation(
      { kind: 'read-all' },
      markAllNotificationsRead,
      'notifications:read-all',
      'All notifications marked as read',
    );
  };

  const handleClearAll = async () => {
    const confirmed = await runOwnedMutation(
      { kind: 'clear' },
      clearAllNotifications,
      'notifications:clear',
      'All notifications cleared',
    );
    if (confirmed) {
      setCheckedIds([]);
      setSelectedId('');
      setIsSelectionMode(false);
    }
  };

  const handleSelectedRead = async () => {
    if (!selectedId) return;
    const confirmed = await runOwnedMutation(
      { kind: 'read', notificationId: selectedId },
      () => markNotificationRead(selectedId),
      `notification:read:${selectedId}`,
      'Notification marked as read',
    );
    if (confirmed) setSelectedId('');
  };

  const handleSelectedDelete = async () => {
    if (!selectedId) return;
    const confirmed = await runOwnedMutation(
      { kind: 'delete', notificationId: selectedId },
      () => deleteNotification(selectedId),
      `notification:delete:${selectedId}`,
      'Notification deleted',
    );
    if (confirmed) setSelectedId('');
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'alert', label: 'Alerts', count: notifications.filter(n => n.type === 'alert' && !n.read).length },
    { key: 'success', label: 'Success', count: notifications.filter(n => n.type === 'success' && !n.read).length },
    { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system' && !n.read).length },
    { key: 'read', label: 'Read' },
  ];

  const isDriver = user?.role === 'DRIVER';

  return (
    <>
      {isDriver ? (
        <div className="driver-notifications-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isSelectionMode && checkedIds.length > 0 ? (
              <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1rem' }}>{checkedIds.length} Selected</span>
            ) : (
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Notifications</h2>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isSelectionMode ? (
              <>
                {checkedIds.length > 0 && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={handleMarkCheckedAsRead} style={{ padding: '6px 10px' }}>
                      <Check size={14} /> <span style={{ marginLeft: '4px' }}>Read</span>
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={handleDeleteChecked} style={{ padding: '6px 10px' }}>
                      <Trash2 size={14} /> <span style={{ marginLeft: '4px' }}>Delete</span>
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={() => {
                    setIsSelectionMode(false);
                    setCheckedIds([]);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => setIsSelectionMode(true)}>Select</button>
                <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}><CheckCheck size={14} /> Mark all read</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <Header
          title="Notifications Center"
          actions={
            <div className="flex gap-sm">
              <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}><CheckCheck size={14} /> Mark all as read</button>
              <button className="btn btn-outline btn-sm" onClick={handleClearAll}><Trash2 size={14} /> Clear all</button>
            </div>
          }
        />
      )}
      <div className="page-content">
        <div className="notif-layout static-layout">
          {/* List - Full Width (Static Layout) */}
          <div className="notif-list-panel" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
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
            <NotificationCollection
              className="notif-list"
              notifications={filtered}
              variant="list"
              grouped
              selectedId={selectedId}
              checkedIds={checkedIds}
              selectionMode={isSelectionMode}
              showCheckboxes={!isDriver || isSelectionMode}
              onCheckedChange={handleCheckedChange}
              onActivate={handleNotificationActivate}
              renderStatus={(notification) => notification.statusBadge
                ? <StatusBadge status={notification.statusBadge} size="sm" />
                : null}
              empty={{
                title: 'No Notifications',
                description: activeTab === 'all'
                  ? "You don't have any notifications yet."
                  : `You don't have any ${activeTab} notifications.`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Detail Modal for Everyone (Universal Optimized Layout) */}
      {selected && (
        <Modal
          isOpen={!!selectedId}
          onClose={() => setSelectedId('')}
          title="Notification Detail"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="notif-detail-alert">
              <div className="notif-alert-icon">
                <Bell size={18} />
              </div>
              <div>
                <strong className="notif-alert-type" style={{ color: selected.type === 'alert' ? 'var(--status-failed)' : selected.type === 'success' ? 'var(--status-active)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selected.type === 'alert' && <AlertTriangle size={14} />} {selected.title.toUpperCase()}
                </strong>
                <span className="text-muted text-sm">Today, {selected.timestamp} · {selected.source}</span>
              </div>
            </div>

            <div className="notif-detail-body card" style={{ background: 'var(--bg-main)', boxShadow: 'none', padding: '16px' }}>
              <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '8px' }}>{selected.title}</strong>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description}</p>
            </div>

            <div className="summary-fields">
              <div className="summary-field" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Waybill No.</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{selected.waybillNo || '—'}</span>
              </div>
              <div className="summary-field" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Alert Type</span>
                <span style={{ fontWeight: 600 }}>{selected.type}</span>
              </div>
              <div className="summary-field" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Source</span>
                <span style={{ fontWeight: 600 }}>{selected.source}</span>
              </div>
              {!isDriver && (
                <>
                  <div className="summary-field" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Area</span>
                    <span style={{ fontWeight: 600 }}>{selectedArea}</span>
                  </div>
                  <div className="summary-field" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Recipient</span>
                    <span style={{ fontWeight: 600 }}>{selectedRecipient}</span>
                  </div>
                </>
              )}
            </div>

            <div className="detail-actions" style={{ display: 'flex', flexDirection: isDriver ? 'column' : 'row', gap: '10px', marginTop: '12px' }}>
              <button 
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  if (selected.waybillNo) {
                    const matched = deliveryOrders.find(o => o.waybillNo?.trim().toUpperCase() === selected.waybillNo?.trim().toUpperCase());
                    if (matched) {
                      setSelectedId('');
                      navigate(isDriver ? `/driver/delivery/${matched.id}` : `/delivery-orders/${matched.id}`);
                    } else {
                      toast.error(`Order with Waybill ${selected.waybillNo} was not found.`);
                    }
                  } else {
                    toast.error('This notification is not linked to any Waybill.');
                  }
                }}
              >
                <Eye size={16} style={{ marginRight: '6px' }} /> View Order Details
              </button>
              <button 
                className="btn btn-outline"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => void handleSelectedRead()}
              >
                <Check size={16} style={{ marginRight: '6px' }} /> Mark as Read
              </button>
              {!isDriver && (
                <button 
                  className="btn btn-danger"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => void handleSelectedDelete()}
                >
                  <Trash2 size={16} style={{ marginRight: '6px' }} /> Delete
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Floating Selection Bar (Admin/OP Only) */}
      {!isDriver && checkedIds.length > 0 && (
        <div className={`floating-selection-bar ${checkedIds.length > 0 ? 'visible' : ''}`}>
          <span className="floating-selection-count">{checkedIds.length} selected</span>
          <button className="btn btn-sm" onClick={handleMarkCheckedAsRead}>
            <Check size={14} /> Mark read
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleDeleteChecked}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </>
  );
}
