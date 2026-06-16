import { useState, useMemo } from 'react';
import { Download, Eye, Archive as ArchiveIcon, Lock, Plus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import EnterpriseFilters, { initialFilterState } from '../../components/ui/EnterpriseFilters';
import type { EnterpriseFilterState } from '../../components/ui/EnterpriseFilters';
import { fuzzyMatch, getDateRangeBounds, isDateInBounds } from '../../utils/filterUtils';
import './Archive.css';

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
  },
  {
    name: "Visayas",
    cities: ["Cebu City", "Mandaue", "Lapu-Lapu", "Iloilo City", "Bacolod", "Tacloban"]
  },
  {
    name: "Mindanao",
    cities: ["Davao City", "Cagayan de Oro", "Zamboanga City", "General Santos", "Butuan"]
  }
];

const getRegionForArea = (area: string) => {
  if (!area) return 'Unknown Region';
  for (const region of REGIONS) {
    if (region.cities.includes(area)) {
      return region.name;
    }
  }
  return 'Custom Area';
};

export default function Archive() {
  const { deliveryOrders } = useData();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<EnterpriseFilterState>({
    ...initialFilterState,
    dateType: 'Yearly' // Default archive filter to Yearly
  });

  const handleResetFilters = () => {
    setFilters({ ...initialFilterState, dateType: 'Yearly' });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Active archived base subset
  const archivedOrdersAll = useMemo(() => {
    return deliveryOrders.filter(
      o => o.status === 'Completed' || o.status === 'Delivered' || o.status === 'Cancelled' || o.isArchived
    );
  }, [deliveryOrders]);

  // Client counts cache for Frequent cohort matching
  const clientCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    archivedOrdersAll.forEach(o => {
      if (o.clientName) counts[o.clientName] = (counts[o.clientName] || 0) + 1;
    });
    return counts;
  }, [archivedOrdersAll]);

  // Filtered archived list
  const filteredOrders = useMemo(() => {
    return archivedOrdersAll.filter(order => {
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
  }, [archivedOrdersAll, filters, clientCounts]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  }, [filteredOrders, activePage]);

  const pageRange = [];
  const startPage = Math.max(1, activePage - 2);
  const endPage = Math.min(totalPages, activePage + 2);
  for (let i = startPage; i <= endPage; i++) {
    pageRange.push(i);
  }

  const handleExport = () => {
    const headers = ['Waybill No', 'Client', 'Recipient', 'Area', 'Driver', 'Date Completed', 'POT Status'];
    const rows = filteredOrders.map(o => [o.waybillNo, o.clientName, o.recipientName, o.area, o.driverName, o.dateCompleted, o.potStatus].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "archive_export_filtered.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header
        title="Data Archive"
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link to="/delivery-orders/new/edit" className="btn btn-primary btn-sm">
              <Plus size={14} /> New Order
            </Link>
            <button className="btn btn-outline btn-sm" id="export-archive" onClick={handleExport}>
              <Download size={14} /> Export Archive
            </button>
          </div>
        }
      />
      <div className="page-content">
        {/* Archive Banner */}
        <div className="archive-banner">
          <div className="archive-banner-left">
            <span className="label" style={{ color: 'rgba(255,255,255,0.6)' }}>DELIVERY TRACKER</span>
            <h2 style={{ color: 'white' }}>Completed Deliveries Archive</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>Read-only records. Admin override required for any edits.</p>
          </div>
          <div className="archive-stats">
            <div className="archive-stat"><strong>{archivedOrdersAll.length}</strong><span>TOTAL ARCHIVED</span></div>
            <div className="archive-stat"><strong>{archivedOrdersAll.filter(o => o.status === 'Completed' || o.status === 'Delivered').length}</strong><span>COMPLETED</span></div>
            <div className="archive-stat"><strong>{archivedOrdersAll.filter(o => o.status === 'Cancelled').length}</strong><span>CANCELLED</span></div>
            <div className="archive-stat"><strong>{archivedOrdersAll.filter(o => o.potStatus === 'Submitted').length}</strong><span>WITH POT</span></div>
          </div>
          <div className="archive-readonly">
            <Lock size={14} /> <strong>Read-only.</strong> Archived records cannot be edited.
          </div>
        </div>

        {/* Collapsible advanced filters */}
        <EnterpriseFilters filters={filters} onChange={setFilters} onReset={handleResetFilters} />

        {/* Table */}
        <div className="card animate-fade-in">
          <div className="card-header">
            <div className="flex items-center gap-sm">
              <h4>Archived Records</h4>
              <span className="archive-count-badge">{filteredOrders.length} records</span>
              <span className="archive-readonly-tag"><Lock size={12} /> READ-ONLY</span>
            </div>
            <span className="text-muted text-sm">Sort by: Date Completed (Newest)</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
            <thead>
              <tr>
                <th>WAYBILL NO.</th>
                <th>CLIENT / SENDER</th>
                <th>RECIPIENT</th>
                <th>AREA / REGION</th>
                <th>DRIVER</th>
                <th>DATE COMPLETED</th>
                <th>POT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <div style={{ padding: '24px' }}>
                      <EmptyState
                        icon={ArchiveIcon}
                        title="No archived records found"
                        description="We couldn't find any completed or delivered orders matching your search or filters."
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(order => (
                  <tr key={order.id} style={{ opacity: order.status === 'Cancelled' ? 0.75 : 1 }}>
                    <td>
                      <span className="waybill-link" onClick={() => navigate(`/delivery-orders/${order.id}`)} style={{ cursor: 'pointer', color: 'var(--primary)' }}>{order.waybillNo}</span>
                      <div className="cell-sub">{order.orderDate ? order.orderDate.split(',')[0] : 'No date'}</div>
                    </td>
                    <td>
                      <span className="cell-name">{order.clientName}</span>
                      <div className="cell-sub">{order.clientType}</div>
                    </td>
                    <td>
                      <span>{order.recipientName}</span>
                      <div className="cell-sub">{(order.recipientAddress || '').substring(0, 25)}...</div>
                    </td>
                    <td>
                      <span>{order.area}</span>
                      <div className="cell-sub">{getRegionForArea(order.area)}</div>
                    </td>
                    <td>
                      <div className="driver-cell">
                        <div className="driver-avatar" style={{ background: order.driverName ? order.driverColor : 'var(--text-tertiary)' }}>{order.driverName ? order.driverInitials : '?'}</div>
                        <span style={{ color: order.driverName ? 'inherit' : 'var(--text-secondary)' }}>
                          {order.driverName ? order.driverName.split(',')[0] : 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {order.status === 'Cancelled'
                        ? <span style={{ color: 'var(--status-failed)', fontWeight: 600, fontSize: '0.8rem' }}>Cancelled</span>
                        : order.dateCompleted || '—'}
                    </td>
                    <td><StatusBadge status={order.potStatus} size="sm" /></td>
                    <td className="cell-actions">
                      <button className="action-icon-btn" title="View" onClick={() => navigate(`/delivery-orders/${order.id}`)}><Eye size={14} /></button>
                      <button className="action-icon-btn" title="Archive" disabled><ArchiveIcon size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <div className="table-pagination">
            <span className="pagination-info">
              Showing {filteredOrders.length > 0 ? (activePage - 1) * itemsPerPage + 1 : 0} to {Math.min(activePage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} records
            </span>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button className="pagination-btn" disabled={activePage === 1} onClick={() => setCurrentPage(activePage - 1)}>‹</button>
                {startPage > 1 && <button className="pagination-btn" onClick={() => setCurrentPage(1)}>1</button>}
                {startPage > 2 && <span className="pagination-ellipsis">...</span>}
                {pageRange.map(p => (
                  <button key={p} className={`pagination-btn ${p === activePage ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                ))}
                {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                {endPage < totalPages && <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>}
                <button className="pagination-btn" disabled={activePage === totalPages} onClick={() => setCurrentPage(activePage + 1)}>›</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
