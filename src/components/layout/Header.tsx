import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Package, User, AlertCircle, CheckCircle2, Info, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { ROLE_DISPLAY } from '../../types';
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <header className="header">
      <div className="header-left">
        {showBack && (
          <button className="header-back-btn" onClick={handleBack} title="Go Back">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="header-title-container">
          {subtitle && <span className="header-breadcrumb">{subtitle}</span>}
          <h1 className="header-title">{title}</h1>
        </div>
      </div>
      <div className="header-right">
        <span className="header-date">{displayDate}</span>
        
        <div className="header-search-container" ref={searchRef}>
          <Search size={16} className="header-search-icon" />
          <input
            type="text"
            placeholder="Search waybill, client, employee..."
            className="header-search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          
          {showResults && searchQuery.trim() && (
            <div className="search-popover">
              {!hasResults ? (
                <div className="search-empty">No results found for "{searchQuery}"</div>
              ) : (
                <>
                  {orders.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Deliveries</div>
                      {orders.map(o => (
                        <div 
                          key={o.id} 
                          className="search-item"
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery('');
                            navigate(`/delivery-orders/${o.id}`);
                          }}
                        >
                          <Package size={14} />
                          <div className="search-item-info">
                            <span className="search-item-main">{o.waybillNo}</span>
                            <span className="search-item-sub">{o.recipientName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {empResults.length > 0 && (
                    <div className="search-group">
                      <div className="search-group-title">Employees</div>
                      {empResults.map(e => (
                        <div 
                          key={e.id} 
                          className="search-item"
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery('');
                            // Assuming an employee detail/edit route might exist later
                          }}
                        >
                          <User size={14} />
                          <div className="search-item-info">
                            <span className="search-item-main">{e.name}</span>
                            <span className="search-item-sub">{ROLE_DISPLAY[e.role as keyof typeof ROLE_DISPLAY] ?? e.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="header-notification-container" ref={notificationRef}>
          <button 
            className="header-notification-btn" 
            id="header-notifications" 
            title="Notifications" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-dot" />}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <span>Notifications Center</span>
                {unreadCount > 0 && <span className="notification-unread-pill">{unreadCount} unread</span>}
              </div>
              <div className="notification-dropdown-list">
                {notifications.length === 0 ? (
                  <div className="notification-dropdown-empty">
                    You don't have any notifications.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => {
                    const getIcon = () => {
                      switch (n.type) {
                        case 'alert':
                          return <AlertCircle size={14} />;
                        case 'success':
                          return <CheckCircle2 size={14} />;
                        default:
                          return <Info size={14} />;
                      }
                    };

                    return (
                      <div 
                        key={n.id} 
                        className={`notification-dropdown-item ${!n.read ? 'unread' : ''}`}
                        onClick={() => {
                          setShowNotifications(false);
                          if (!n.read) {
                            markNotificationRead(n.id);
                          }
                          if (n.waybillNo) {
                            const order = deliveryOrders.find(
                              o => o.waybillNo?.trim().toUpperCase() === n.waybillNo?.trim().toUpperCase()
                            );
                            if (order) {
                              navigate(`/delivery-orders/${order.id}`);
                            } else {
                              navigate('/notifications');
                            }
                          } else {
                            navigate('/notifications');
                          }
                        }}
                      >
                        <div className="notification-dropdown-item-content">
                          <div className={`notification-dropdown-icon-container ${n.type || 'info'}`}>
                            {getIcon()}
                          </div>
                          <div className="notification-dropdown-text-container">
                            <div className="notification-dropdown-item-header">
                              <span className="notification-dropdown-item-title">{n.title}</span>
                              {!n.read && <span className="notification-dropdown-unread-dot" />}
                            </div>
                            <p className="notification-dropdown-item-desc">{n.description}</p>
                            <span className="notification-dropdown-item-time">{n.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {notifications.length > 5 && (
                <div className="notification-dropdown-footer">
                  <span 
                    className="notification-dropdown-see-more" 
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications');
                    }}
                  >
                    See More <ChevronRight size={14} style={{ marginLeft: '2px' }} />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
