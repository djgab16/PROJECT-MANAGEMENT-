import { useState, useMemo } from 'react';
import { AlertTriangle, Eye, UserPlus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import EnterpriseFilters, { initialFilterState } from '../../components/ui/EnterpriseFilters';
import type { EnterpriseFilterState } from '../../components/ui/EnterpriseFilters';
import { fuzzyMatch, getDateRangeBounds, isDateInBounds } from '../../utils/filterUtils';
import './FailedPickups.css';
import type { DeliveryOrder } from '../../types';

export default function FailedPickups() {
  const { deliveryOrders } = useData();
  const navigate = useNavigate();

  // Unified Filtering State
  const [filters, setFilters] = useState<EnterpriseFilterState>({
    ...initialFilterState,
    dateType: 'Last 30 Days'
  });

  const failedOrdersAll = useMemo(() => {
    return deliveryOrders.filter((o: DeliveryOrder) => o.status === 'Pending' || o.redeliveryStatus === 'Pending Approval');
  }, [deliveryOrders]);

  const clientCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    failedOrdersAll.forEach(o => {
      if (o.clientName) counts[o.clientName] = (counts[o.clientName] || 0) + 1;
    });
    return counts;
  }, [failedOrdersAll]);

  // Helper mapping region for cities
  const getRegionForArea = (area: string): string => {
    if (!area) return 'Unknown Region';
    const REGIONS_INTERNAL = [
      {
        name: "National Capital Region",
        cities: ["Manila", "Quezon City", "Makati", "Pasig", "Taguig", "Pasay", "Parañaque", "Las Piñas", "Muntinlupa", "Marikina", "Mandaluyong", "San Juan", "Caloocan", "Malabon", "Navotas", "Valenzuela"]
      },
      {
        name: "Central Luzon",
        cities: ["Angeles", "San Fernando", "Olongapo", "Tarlac City", "Cabanatuan"]
      },
      {
        name: "CALABARZON",
        cities: ["Antipolo", "Dasmariñas", "Bacoor", "Tagaytay", "Batangas City", "Lucena"]
      }
    ];
    for (const region of REGIONS_INTERNAL) {
      if (region.cities.includes(area)) return region.name;
    }
    return 'Custom Area';
  };

  // Advanced filtered subset
  const failedOrders = useMemo(() => {
    return failedOrdersAll.filter(order => {
      // Smart Fuzzy Search
      if (filters.searchQuery) {
        const q = filters.searchQuery;
        const matches = 
          fuzzyMatch(order.waybillNo, q) ||
          fuzzyMatch(order.clientName, q) ||
          fuzzyMatch(order.recipientName, q) ||
          fuzzyMatch(order.driverName, q);
        if (!matches) return false;
      }

      // Date Range Match
      const bounds = getDateRangeBounds(filters.dateType, filters.customStartDate, filters.customEndDate);
      const oDateStr = order.dateCompleted || order.lastUpdated || order.orderDate;
      if (!isDateInBounds(oDateStr, bounds)) return false;

      // Order Task Type
      if (filters.orderType !== 'All') {
        if (order.taskType !== filters.orderType) return false;
      }

      // Status
      if (filters.status !== 'All') {
        if (order.status !== filters.status) return false;
      }

      // Driver
      if (filters.driver !== 'All') {
        if (filters.driver === 'Unassigned') {
          if (order.driverName) return false;
        } else if (order.driverName !== filters.driver) {
          return false;
        }
      }

      // Route
      if (filters.route !== 'All') {
        if (order.route !== filters.route) return false;
      }

      // Region
      if (filters.region !== 'All') {
        const reg = getRegionForArea(order.area);
        if (reg !== filters.region) return false;
      }

      // Dispatcher
      if (filters.dispatcher !== 'All') {
        const disp = order.encodedBy || order.updatedBy;
        if (disp !== filters.dispatcher) return false;
      }

      // Client Type
      if (filters.clientType !== 'All') {
        const count = clientCounts[order.clientName || ''] || 0;
        if (filters.clientType === 'Frequent' && count < 3) return false;
        if (filters.clientType === 'Repeat' && count < 2) return false;
      }

      // Package Type
      if (filters.packageType !== 'All') {
        if (order.packageType !== filters.packageType) return false;
      }

      return true;
    });
  }, [failedOrdersAll, filters, clientCounts]);

  const getOverdueDays = (order: DeliveryOrder) => {
    const today = new Date();
    const dateStr = order.orderDate || order.dateEncoded;
    if (!dateStr) return 0;
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return 0;
    
    const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d2 = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const overdueCount = failedOrdersAll.filter((o: DeliveryOrder) => getOverdueDays(o) > 2).length;
  const unassignedCount = failedOrdersAll.filter((o: DeliveryOrder) => !o.driverName).length;
  const totalOverdueDays = failedOrdersAll.reduce((sum: number, o: DeliveryOrder) => sum + getOverdueDays(o), 0);
  const avgDaysOverdue = failedOrdersAll.length > 0 ? (totalOverdueDays / failedOrdersAll.length).toFixed(1) : '0.0';

  return (
    <>
      <Header title="Failed Pickup Monitoring" subtitle="Management" />
      <div className="page-content">
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard icon={<AlertTriangle size={18} />} iconColor="var(--status-failed)" iconBg="var(--status-failed-bg)" label="TOTAL FAILED PICKUPS" value={failedOrdersAll.length} subtitle="Needs immediate action" subtitleColor="var(--status-failed)" />
          <StatCard icon={<Clock size={18} />} iconColor="var(--status-pending)" iconBg="var(--status-pending-bg)" label="OVERDUE > 2 DAYS" value={overdueCount} subtitle="Critical" subtitleColor="var(--status-failed)" />
          <StatCard icon={<UserPlus size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="UNASSIGNED" value={unassignedCount} subtitle="Needs driver assignment" />
          <StatCard icon={<AlertTriangle size={18} />} iconColor="var(--status-pending)" iconBg="var(--status-pending-bg)" label="AVG. DAYS OVERDUE" value={avgDaysOverdue} subtitle="Target: < 1 day" />
        </div>

        {/* Collapsible advanced filters component */}
        <EnterpriseFilters 
          filters={filters} 
          onChange={setFilters} 
          onReset={() => setFilters({ ...initialFilterState, dateType: 'Last 30 Days' })} 
        />

        <div className="card animate-fade-in">
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
                failedOrders.map((order: DeliveryOrder) => (
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
                    <td><span className="overdue-badge">{getOverdueDays(order)} days</span></td>
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
