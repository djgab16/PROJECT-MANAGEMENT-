import { useState, useMemo } from 'react';
import { Download, FileBarChart, TrendingUp, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import { useData } from '../../context/DataContext';
import EnterpriseFilters, { initialFilterState } from '../../components/ui/EnterpriseFilters';
import type { EnterpriseFilterState } from '../../components/ui/EnterpriseFilters';
import { fuzzyMatch, getDateRangeBounds, isDateInBounds } from '../../utils/filterUtils';
import './Reports.css';
import type { DeliveryOrder } from '../../types';

export default function Reports() {
  const { deliveryOrders } = useData();

  // Advanced Filters State
  const [filters, setFilters] = useState<EnterpriseFilterState>({
    ...initialFilterState,
    dateType: 'Today' // Default reports to Today (Daily)
  });

  // Drilldown Overlay State
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownOrders, setDrilldownOrders] = useState<DeliveryOrder[]>([]);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  // Client counts cache for Frequent cohort matching
  const clientCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    deliveryOrders.forEach(o => {
      if (o.clientName) counts[o.clientName] = (counts[o.clientName] || 0) + 1;
    });
    return counts;
  }, [deliveryOrders]);

  // Unified Filtered Orders
  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter(order => {
      // Fuzzy Smart Search
      if (filters.searchQuery) {
        const q = filters.searchQuery;
        const matches = 
          fuzzyMatch(order.waybillNo, q) ||
          fuzzyMatch(order.clientName, q) ||
          fuzzyMatch(order.recipientName, q) ||
          fuzzyMatch(order.driverName, q) ||
          fuzzyMatch(order.id, q) ||
          fuzzyMatch(order.encodedBy, q);
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
        if (filters.status === 'Archived') {
          if (!order.isArchived) return false;
        } else {
          if (order.status !== filters.status) return false;
        }
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
  }, [deliveryOrders, filters, clientCounts]);

  const handleFilterChange = (nextFilters: EnterpriseFilterState) => {
    setFilters(nextFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      ...initialFilterState,
      dateType: 'Today'
    });
  };

  const handleQuickReportType = (type: 'daily' | 'monthly') => {
    setFilters(prev => ({
      ...prev,
      dateType: type === 'daily' ? 'Today' : 'This Month'
    }));
  };

  const handleQuickDriverFilter = (driver: string) => {
    setFilters(prev => ({ ...prev, driver }));
  };

  // Helper mapping region for cities
  const getRegionForArea = (area: string): string => {
    if (!area) return 'Unknown Region';
    for (const region of REGIONS) {
      if (region.cities.includes(area)) return region.name;
    }
    return 'Custom Area';
  };

  const REGIONS = [
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

  // Compute stats and performance based on fully filtered list
  const { driverPerformance, pieData, dynamicDailyDeliveries, stats } = useMemo(() => {
    const totalDeliveries = filteredOrders.length;
    let completed = 0;
    let failed = 0;
    let potSubmitted = 0;

    const dMap: Record<string, any> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dData = days.map(day => ({ day, weekday: 0, weekend: 0, peak: 0 }));

    filteredOrders.forEach(o => {
      const isCompleted = o.status === 'Completed' || o.status === 'Delivered';
      const isFailed = o.status === 'Failed';
      
      if (isCompleted) completed++;
      if (isFailed) failed++;
      if (o.potStatus === 'Submitted') potSubmitted++;

      if (o.status !== 'Pending') {
        const dateStr = o.dateCompleted || o.lastUpdated || o.orderDate;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const dayIdx = date.getDay();
            const isWeekend = dayIdx === 0 || dayIdx === 6;
            const hasTime = dateStr.includes(':') || dateStr.toLowerCase().includes('am') || dateStr.toLowerCase().includes('pm');
            const isPeak = hasTime && (date.getHours() >= 16 || date.getHours() <= 8);
            if (isWeekend) dData[dayIdx].weekend++;
            else dData[dayIdx].weekday++;
            if (isPeak) dData[dayIdx].peak++;
          }
        }
      }

      const dName = o.driverName || 'Unassigned';
      if (!dMap[dName]) {
        dMap[dName] = { 
          name: dName, 
          totalOrders: 0, 
          delivered: 0, 
          failed: 0, 
          potCount: 0, 
          initials: dName === 'Unassigned' ? '?' : dName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(), 
          color: dName === 'Unassigned' ? 'var(--text-tertiary)' : 'var(--primary)',
          orders: []
        };
      }
      dMap[dName].totalOrders++;
      dMap[dName].orders.push(o);
      if (isCompleted) dMap[dName].delivered++;
      if (isFailed) dMap[dName].failed++;
      if (o.potStatus === 'Submitted') dMap[dName].potCount++;
    });

    const driverPerf = Object.values(dMap).map(d => {
       const successRate = d.totalOrders ? ((d.delivered / d.totalOrders) * 100).toFixed(1) + '%' : '0%';
       const potRate = d.delivered ? ((d.potCount / d.delivered) * 100).toFixed(1) + '%' : '0%';
       let rating = 4.5;
       if (d.delivered > 0) rating = 4.0 + (d.delivered / (d.totalOrders || 1));
       if (rating > 5) rating = 5.0;
       return { ...d, successRate, potRate, avgTime: '4.2h', rating: rating.toFixed(1) };
    });

    const sunday = dData.shift();
    if (sunday) dData.push(sunday);

    return {
      stats: {
        total: totalDeliveries,
        successRate: totalDeliveries ? ((completed / totalDeliveries) * 100).toFixed(1) + '%' : '0%',
        potSubmitted,
        failed
      },
      driverPerformance: driverPerf,
      pieData: [
        { name: 'Completed', value: completed, color: '#01B574' },
        { name: 'Failed', value: failed, color: '#E31A1A' }
      ].filter(p => p.value > 0),
      dynamicDailyDeliveries: dData
    };
  }, [filteredOrders]);

  const handleExport = () => {
    const headers = ['Driver', 'Total Orders', 'Delivered', 'Failed', 'POT Rate', 'Success Rate', 'Avg Time', 'Rating'];
    const rows = driverPerformance.map((d: any) => [d.name, d.totalOrders, d.delivered, d.failed, d.potRate, d.successRate, d.avgTime, d.rating].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `filtered_delivery_report_${filters.dateType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerDrilldown = (title: string, list: DeliveryOrder[]) => {
    setDrilldownTitle(title);
    setDrilldownOrders(list);
    setIsDrilldownOpen(true);
  };

  const uniqueDriversList = useMemo(() => {
    return Array.from(new Set(deliveryOrders.map(o => o.driverName).filter(Boolean)));
  }, [deliveryOrders]);

  const activeReportType = filters.dateType === 'Today' ? 'daily' : filters.dateType === 'This Month' ? 'monthly' : 'custom';

  return (
    <>
      <Header
        title="Reports"
        actions={
          <button className="btn btn-primary btn-sm" id="export-report-btn" onClick={handleExport}>
            <Download size={14} /> EXPORT REPORT
          </button>
        }
      />
      <div className="page-content">
        
        {/* Advanced Collapsible Filter Header */}
        <EnterpriseFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} />

        <div className="reports-layout">
          {/* Left Panel - Config */}
          <div className="reports-config card">
            <h4>Report Configuration</h4>
            <p className="card-subtitle">Select options to quickly adjust standard bounds</p>
            <div className="config-section">
              <span className="label">REPORT TYPE</span>
              <label className={`radio-option ${activeReportType === 'daily' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="type" 
                  checked={activeReportType === 'daily'} 
                  onChange={() => handleQuickReportType('daily')} 
                />
                <div className="radio-content">
                  <span className="radio-label">Daily Report</span>
                  <span className="radio-desc">Today's delivery breakdown</span>
                </div>
              </label>
              <label className={`radio-option ${activeReportType === 'monthly' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="type" 
                  checked={activeReportType === 'monthly'} 
                  onChange={() => handleQuickReportType('monthly')} 
                />
                <div className="radio-content">
                  <span className="radio-label">Monthly Report</span>
                  <span className="radio-desc">Full month at a glance</span>
                </div>
              </label>
            </div>
            
            <div className="config-section">
              <span className="label">DRIVER FILTER</span>
              <select 
                className="filter-select" 
                style={{ width: '100%' }} 
                value={filters.driver} 
                onChange={e => handleQuickDriverFilter(e.target.value)}
              >
                <option value="All">All Drivers</option>
                {uniqueDriversList.map(d => (
                  <option key={d as string} value={d as string}>{d}</option>
                ))}
              </select>
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} id="generate-report-btn" onClick={handleExport}>
              <FileBarChart size={16} /> GENERATE CSV
            </button>
          </div>

          {/* Right Panel - Report */}
          <div className="reports-main">
            <div className="card">
              <div className="report-header">
                <div>
                  <span className="label" style={{ color: 'var(--primary)' }}>DYNAMIC REPORT</span>
                  <h2>Delivery Performance Report</h2>
                  <p className="text-sm text-muted">
                    Generated {new Date().toLocaleString()} · Date Bound: {filters.dateType} · Active Driver: {filters.driver}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div onClick={() => triggerDrilldown('Total Deliveries', filteredOrders)} style={{ cursor: 'pointer', display: 'flex', flex: 1 }}>
                <StatCard 
                  icon={<FileBarChart size={18} />} 
                  iconColor="var(--primary)" 
                  iconBg="var(--status-transit-bg)" 
                  label="TOTAL DELIVERIES" 
                  value={stats.total} 
                />
              </div>
              <div onClick={() => triggerDrilldown('Successful Deliveries', filteredOrders.filter(o => o.status === 'Completed' || o.status === 'Delivered'))} style={{ cursor: 'pointer', display: 'flex', flex: 1 }}>
                <StatCard 
                  icon={<TrendingUp size={18} />} 
                  iconColor="var(--status-active)" 
                  iconBg="var(--status-active-bg)" 
                  label="SUCCESS RATE" 
                  value={stats.successRate} 
                />
              </div>
              <div onClick={() => triggerDrilldown('POT Submitted Deliveries', filteredOrders.filter(o => o.potStatus === 'Submitted'))} style={{ cursor: 'pointer', display: 'flex', flex: 1 }}>
                <StatCard 
                  icon={<CheckCircle2 size={18} />} 
                  iconColor="var(--status-active)" 
                  iconBg="var(--status-active-bg)" 
                  label="POT SUBMITTED" 
                  value={stats.potSubmitted} 
                />
              </div>
              <div onClick={() => triggerDrilldown('Failed / Returned Deliveries', filteredOrders.filter(o => o.status === 'Failed' || o.status === 'Returned'))} style={{ cursor: 'pointer', display: 'flex', flex: 1 }}>
                <StatCard 
                  icon={<AlertTriangle size={18} />} 
                  iconColor="var(--status-failed)" 
                  iconBg="var(--status-failed-bg)" 
                  label="FAILED / RETURNED" 
                  value={stats.failed} 
                />
              </div>
              <div style={{ display: 'flex', flex: 1 }}>
                <StatCard 
                  icon={<Clock size={18} />} 
                  iconColor="var(--primary)" 
                  iconBg="var(--status-transit-bg)" 
                  label="AVG. DELIVERY TIME" 
                  value="4.2h" 
                />
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
              <div className="card chart-card" style={{ flex: 2 }}>
                <div className="card-header">
                  <h4>Daily Deliveries Activity</h4>
                  <div className="chart-legend">
                    <span className="legend-item"><span className="legend-dot" style={{ background: '#00A99D' }} /> Weekday</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: '#A3AED0' }} /> Weekend</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: '#FFB547' }} /> Peak</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dynamicDailyDeliveries} barCategoryGap="20%" barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF7" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#A3AED0' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#A3AED0' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="weekday" fill="#00A99D" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="weekend" fill="#A3AED0" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="peak" fill="#FFB547" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card chart-card" style={{ flex: 1 }}>
                <h4>Status Breakdown</h4>
                {pieData.length > 0 ? (
                  <div className="pie-chart-wrapper">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-center-text">
                      <strong>{stats.total}</strong>
                      <span>total</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No status data in current filters.</div>
                )}
              </div>
            </div>

            {/* Driver Performance Table */}
            <div className="card" style={{ overflowX: 'auto' }}>
              <div className="card-header">
                <h4>Per Driver Performance Summary</h4>
                <span className="text-muted text-sm">Click driver rows to view matching dispatches</span>
              </div>
              <table className="data-table driver-perf-table">
                <thead>
                  <tr>
                    <th>DRIVER</th>
                    <th>TOTAL ORDERS</th>
                    <th>DELIVERED</th>
                    <th>FAILED</th>
                    <th>POT RATE</th>
                    <th>SUCCESS RATE</th>
                    <th>AVG. TIME</th>
                    <th>RATING</th>
                  </tr>
                </thead>
                <tbody>
                  {driverPerformance.map((d: any) => (
                    <tr 
                      key={d.name} 
                      style={{ opacity: d.name === 'Unassigned' ? 0.7 : 1, cursor: 'pointer' }}
                      onClick={() => triggerDrilldown(`Dispatches assigned to ${d.name}`, d.orders)}
                    >
                      <td>
                        <div className="driver-cell">
                          <div className="driver-avatar" style={{ background: d.color, color: '#fff' }}>{d.initials}</div>
                          <div><strong style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.name}</strong></div>
                        </div>
                      </td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.totalOrders}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-active)' }}>{d.delivered}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-failed)' }}>{d.failed}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>
                        <div className="rate-bar-wrapper">
                          <div className="rate-bar"><div className="rate-bar-fill" style={{ width: d.potRate, background: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-active)' }} /></div>
                          {d.potRate}
                        </div>
                      </td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.successRate}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.avgTime}</td>
                      <td><span className="rating-badge" style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-active)' }}>● {d.rating}</span></td>
                    </tr>
                  ))}
                  {driverPerformance.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No driver records match filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Drill-down Detail Modal Overlay */}
      {isDrilldownOpen && (
        <div className="drilldown-modal-backdrop" onClick={() => setIsDrilldownOpen(false)}>
          <div className="drilldown-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="drilldown-modal-header">
              <h3>{drilldownTitle}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" onClick={handleExport}>
                  <Download size={12} /> CSV
                </button>
                <button className="action-icon-btn" onClick={() => setIsDrilldownOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="drilldown-modal-body">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>WAYBILL</th>
                    <th>CLIENT / SENDER</th>
                    <th>RECIPIENT</th>
                    <th>AREA / ZONE</th>
                    <th>DRIVER</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldownOrders.map(o => (
                    <tr key={o.id}>
                      <td><span className="waybill-link" onClick={() => window.open(`/delivery-orders/${o.id}`, '_blank')}>{o.waybillNo}</span></td>
                      <td className="cell-name">{o.clientName}</td>
                      <td>{o.recipientName}</td>
                      <td>{o.area}</td>
                      <td>{o.driverName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.78rem', fontWeight: 700, 
                          color: o.status === 'Completed' || o.status === 'Delivered' ? 'var(--status-active)' : o.status === 'Failed' ? 'var(--status-failed)' : 'var(--status-pending)',
                          background: o.status === 'Completed' || o.status === 'Delivered' ? 'var(--status-active-bg)' : o.status === 'Failed' ? 'var(--status-failed-bg)' : 'var(--status-pending-bg)',
                          padding: '2px 8px', borderRadius: '4px' 
                        }}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {drilldownOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No orders found for this segment.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="drilldown-modal-footer">
              <span className="text-muted text-sm" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center' }}>
                Showing {drilldownOrders.length} matching orders
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => setIsDrilldownOpen(false)}>
                Close Overlay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
