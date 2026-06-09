import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { Package, MapPin, Navigation } from 'lucide-react';
import './DriverDashboard.css';

export default function DriverDashboard() {
  const { deliveryOrders } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Pending' | 'In Transit' | 'Delivered'>('Pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a brief loading state for premium aesthetic
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [activeTab]); // Retrigger animation slightly on tab change for that premium feel

  // Fetch deliveries assigned to this driver or unassigned
  const assignedRoutes = deliveryOrders.filter(
    (order) =>
      (order.driverName === user?.name || !order.driverName) &&
      (activeTab === 'Delivered'
        ? (order.status === 'Delivered' || order.status === 'Completed')
        : order.status === activeTab)
  );

  return (
    <div className="driver-dashboard">
      <div className="driver-greeting">
        <div className="driver-greeting-content">
          <div className="driver-greeting-text">
            <h2>Hello, {user?.name?.split(' ')[0] || 'Driver'}!</h2>
            <p className="driver-role">Speedex Courier</p>
            <p className="driver-active-count">
              You have {deliveryOrders.filter(o => (o.driverName === user?.name || !o.driverName) && (o.status === 'Pending' || o.status === 'In Transit')).length} active deliveries today.
            </p>
          </div>
          <div className="driver-avatar-wrapper">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
              alt="Driver Avatar"
              className="driver-avatar-img"
            />
          </div>
        </div>
      </div>

      <div className="driver-tabs">
        <button
          className={`driver-tab ${activeTab === 'Pending' ? 'active' : ''}`}
          onClick={() => { setIsLoading(true); setActiveTab('Pending'); }}
        >
          To Do
        </button>
        <button
          className={`driver-tab ${activeTab === 'In Transit' ? 'active' : ''}`}
          onClick={() => { setIsLoading(true); setActiveTab('In Transit'); }}
        >
          In Transit
        </button>
        <button
          className={`driver-tab ${activeTab === 'Delivered' ? 'active' : ''}`}
          onClick={() => { setIsLoading(true); setActiveTab('Delivered'); }}
        >
          Delivered
        </button>
      </div>

      <div className="route-list">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="delivery-card skeleton" style={{ height: '160px' }}></div>
            <div className="delivery-card skeleton" style={{ height: '160px' }}></div>
          </div>
        ) : assignedRoutes.length > 0 ? (
          assignedRoutes.map((order) => (
            <div
              key={order.id}
              className={`delivery-card animate-fade-in ${order.status === 'In Transit' ? 'active-transit' : ''}`}
              onClick={() => navigate(`/driver/delivery/${order.id}`)}
            >
              <div className="card-header">
                <span className="waybill-no">{order.waybillNo}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {order.priority && <StatusBadge status={order.priority} size="sm" />}
                  <StatusBadge status={order.status} size="sm" />
                </div>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <Package size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Recipient</span>
                    <span className="info-value">{order.recipientName}</span>
                  </div>
                </div>

                <div className="info-row">
                  <MapPin size={16} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Address</span>
                    <span className="info-value address-text">{order.recipientAddress}</span>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <button
                  className={`btn btn-block ${order.status === 'In Transit' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/driver/delivery/${order.id}`);
                  }}
                >
                  {order.status === 'In Transit' ? 'Update Delivery' : 'View Details'}
                  <Navigation size={16} style={{ marginLeft: '8px' }} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state animate-fade-in">
            <Package size={48} color="var(--text-muted)" />
            <p>No deliveries found for this status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
