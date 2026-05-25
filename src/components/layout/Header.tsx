import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Package, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  date?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, date, actions }: HeaderProps) {
  const navigate = useNavigate();
  const { notifications, deliveryOrders, employees } = useData();
  const unreadCount = notifications.filter(n => !n.read).length;

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const displayDate = date || new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
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
        {subtitle && <span className="header-breadcrumb">{subtitle}</span>}
        <h1 className="header-title">{title}</h1>
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
                            <span className="search-item-sub">{e.role}</span>
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

        <button className="header-notification-btn" id="header-notifications" title="Notifications" onClick={() => navigate('/notifications')}>
          <Bell size={20} />
          {unreadCount > 0 && <span className="notification-dot" />}
        </button>
        {actions}
      </div>
    </header>
  );
}
