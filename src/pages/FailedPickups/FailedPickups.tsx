import { useState } from 'react';
import { AlertTriangle, Search, Eye, UserPlus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import './FailedPickups.css';

export default function FailedPickups() {
  const { deliveryOrders } = useData();
  const navigate = useNavigate();
  const failedOrdersAll = deliveryOrders.filter(o => o.status === 'Pending');

  const [searchQuery, setSearchQuery] = useState('');
  const [driverFilter, setDriverFilter] = useState('All Drivers');
  const [areaFilter, setAreaFilter] = useState('All Areas');

  const failedOrders = failedOrdersAll.filter(o => {
    if (searchQuery && !o.waybillNo.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (driverFilter !== 'All Drivers' && o.driverName !== driverFilter) return false;
    if (areaFilter !== 'All Areas' && o.area !== areaFilter) return false;
    return true;
  });

  const uniqueDrivers = Array.from(new Set(failedOrdersAll.map(o => o.driverName).filter(Boolean)));
  const uniqueAreas = Array.from(new Set(failedOrdersAll.map(o => o.area).filter(Boolean)));
  
  const overdueCount = failedOrdersAll.filter((_, i) => i < 2).length;
  const unassignedCount = failedOrdersAll.filter(o => !o.driverName).length;

  return (
    <>
      <Header title="Failed Pickup Monitoring" subtitle="Management" date="Sunday, March 29, 2026" />
      <div className="page-content">
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard icon={<AlertTriangle size={18} />} iconColor="var(--status-failed)" iconBg="var(--status-failed-bg)" label="TOTAL FAILED PICKUPS" value={failedOrdersAll.length} subtitle="Needs immediate action" subtitleColor="var(--status-failed)" />
          <StatCard icon={<Clock size={18} />} iconColor="var(--status-pending)" iconBg="var(--status-pending-bg)" label="OVERDUE > 2 DAYS" value={overdueCount} subtitle="Critical" subtitleColor="var(--status-failed)" />
          <StatCard icon={<UserPlus size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="UNASSIGNED" value={unassignedCount} subtitle="Needs driver assignment" />
          <StatCard icon={<AlertTriangle size={18} />} iconColor="var(--status-pending)" iconBg="var(--status-pending-bg)" label="AVG. DAYS OVERDUE" value="2.3" subtitle="Target: < 1 day" />
        </div>

        <div className="orders-filter-bar">
          <div className="filter-search">
            <Search size={16} className="filter-search-icon" />
            <input 
              type="text" 
              placeholder="Search failed pickups..." 
              className="filter-search-input" 
              id="failed-search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="filter-select" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
            <option>All Areas</option>
            {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="filter-select" value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
            <option>All Drivers</option>
            {uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>WAYBILL NO.</th>
                <th>CLIENT / SENDER</th>
                <th>RECIPIENT</th>
                <th>AREA</th>
                <th>DRIVER</th>
                <th>DAYS OVERDUE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {failedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No failed pickups found.
                  </td>
                </tr>
              ) : (
                failedOrders.map((order, i) => (
                  <tr key={order.id}>
                    <td><span className="waybill-link" onClick={() => navigate(`/delivery-orders/${order.id}`)} style={{ cursor: 'pointer', color: 'var(--primary)' }}>{order.waybillNo}</span></td>
                    <td className="cell-name">{order.clientName}</td>
                    <td>{order.recipientName}</td>
                    <td>{order.area}</td>
                    <td>
                      {order.driverName ? (
                        <div className="driver-cell">
                          <div className="driver-avatar" style={{ background: order.driverColor }}>{order.driverInitials}</div>
                          <span>{order.driverName.split(',')[0]}</span>
                        </div>
                      ) : <span style={{ color: 'var(--status-failed)', fontWeight: 600 }}>Unassigned</span>}
                    </td>
                    <td><span className="overdue-badge">{i === 0 ? '3 days' : '2 days'}</span></td>
                    <td><StatusBadge status="Pending" size="sm" /></td>
                    <td className="cell-actions">
                      <button className="action-icon-btn" title="View" onClick={() => navigate(`/delivery-orders/${order.id}`)}><Eye size={14} /></button>
                      <button className="action-icon-btn" title="Assign Driver" onClick={() => navigate(`/delivery-orders/${order.id}/edit`)}><UserPlus size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
