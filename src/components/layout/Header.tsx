import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Package, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationCollection from '../ui/NotificationCollection';
import StaffHeaderComposition from '../ui/StaffHeaderComposition';
import { notifyActionFeedback, resetActionFeedback } from '../ui/actionFeedback';
import { runConfirmedNotificationMutation } from '../ui/notificationMutations';
import { useData } from '../../context/DataContext';
import { ROLE_DISPLAY, type Notification } from '../../types';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  date?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ title, subtitle, date, actions, showBack, onBack }: HeaderProps) {
  const navigate = useNavigate();
  const { notifications, deliveryOrders, employees, markNotificationRead } = useData();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const displayDate = date || new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowResults(false);
      setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const searchResults = () => {
    if (!searchQuery.trim()) return { orders: [], employees: [] };
    const term = searchQuery.toLowerCase();
    
    const matchingOrders = deliveryOrders.filter(o => 
      (o.waybillNo || '').toLowerCase().includes(term) ||
      (o.clientName || '').toLowerCase().includes(term) ||
      (o.recipientName || '').toLowerCase().includes(term)
    ).slice(0, 3);

    const matchingEmployees = employees.filter(e => 
      (e.name || '').toLowerCase().includes(term) ||
      (e.id || '').toLowerCase().includes(term)
    ).slice(0, 3);

    return { orders: matchingOrders, employees: matchingEmployees };
  };

  const { orders, employees: empResults } = searchResults();
  const hasResults = orders.length > 0 || empResults.length > 0;

  const handleNotificationActivate = (notification: Notification) => {
    setShowNotifications(false);

    if (!notification.read) {
      const actionId = `header-notification-read:${notification.id}`;
      resetActionFeedback(actionId);
      void runConfirmedNotificationMutation(
        notifications,
        { kind: 'read', notificationId: notification.id },
        () => markNotificationRead(notification.id),
      ).then((result) => {
        if (!result.confirmed) {
          notifyActionFeedback({
            actionId,
            phase: 'failure',
            toast: { type: 'error', message: result.message },
          });
        }
      });
    }

    if (notification.waybillNo) {
      const order = deliveryOrders.find(
        (candidate) => candidate.waybillNo?.trim().toUpperCase()
          === notification.waybillNo?.trim().toUpperCase(),
      );
      navigate(order ? `/delivery-orders/${order.id}` : '/notifications');
      return;
    }

    navigate('/notifications');
  };

  return (
    <StaffHeaderComposition
      title={title}
      subtitle={subtitle}
      date={displayDate}
      navigationControl={showBack ? (
        <button
          type="button"
          className="header-back-btn"
          onClick={handleBack}
          title="Go Back"
          aria-label="Go back"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      ) : undefined}
      search={(
        <div className="header-search-container" ref={searchRef}>
          <label className="ui-sr-only" htmlFor="staff-global-search">
            Search waybills, clients, and employees
          </label>
          <Search size={16} className="header-search-icon" aria-hidden="true" />
          <input
            id="staff-global-search"
            type="search"
            placeholder="Search waybill, client, employee..."
            className="header-search-input"
            role="combobox"
            aria-haspopup="dialog"
            value={searchQuery}
            aria-controls={showResults && searchQuery.trim() ? 'staff-global-search-results' : undefined}
            aria-expanded={Boolean(showResults && searchQuery.trim())}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />

          {showResults && searchQuery.trim() && (
            <div
              className="search-popover"
              id="staff-global-search-results"
              role="dialog"
              aria-label="Global search results"
            >
              {!hasResults ? (
                <div className="search-empty" role="status">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <>
                  {orders.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Deliveries</div>
                      {orders.map((order) => (
                        <button
                          type="button"
                          key={order.id}
                          className="search-item"
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery('');
                            navigate(`/delivery-orders/${order.id}`);
                          }}
                        >
                          <Package size={14} aria-hidden="true" />
                          <span className="search-item-info">
                            <span className="search-item-main">{order.waybillNo}</span>
                            <span className="search-item-sub">{order.recipientName}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {empResults.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Employees</div>
                      {empResults.map((employee) => (
                        <button
                          type="button"
                          key={employee.id}
                          className="search-item"
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                        >
                          <User size={14} aria-hidden="true" />
                          <span className="search-item-info">
                            <span className="search-item-main">{employee.name}</span>
                            <span className="search-item-sub">
                              {ROLE_DISPLAY[employee.role as keyof typeof ROLE_DISPLAY] ?? employee.role}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      notifications={(
        <div className="header-notification-container" ref={notificationRef}>
          <button
            type="button"
            className="header-notification-btn"
            id="header-notifications"
            title="Notifications"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-expanded={showNotifications}
            aria-controls="staff-header-notification-dropdown"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && <span className="notification-dot" aria-hidden="true" />}
          </button>

          {showNotifications && (
            <div
              className="notification-dropdown"
              id="staff-header-notification-dropdown"
              role="region"
              aria-label="Notifications Center"
            >
              <div className="notification-dropdown-header">
                <span>Notifications Center</span>
                {unreadCount > 0 && <span className="notification-unread-pill">{unreadCount} unread</span>}
              </div>
              <div className="notification-dropdown-list">
                <NotificationCollection
                  notifications={notifications}
                  variant="compact"
                  limit={5}
                  onActivate={handleNotificationActivate}
                  empty={{ title: "You don't have any notifications." }}
                />
              </div>
              {notifications.length > 5 && (
                <div className="notification-dropdown-footer">
                  <button
                    type="button"
                    className="notification-dropdown-see-more"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications');
                    }}
                  >
                    See More <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      actions={actions}
    />
  );
}
