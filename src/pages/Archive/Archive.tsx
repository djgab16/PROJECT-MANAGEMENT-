import { useState } from 'react';
import { Search, Download, Eye, Archive as ArchiveIcon, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import './Archive.css';

export default function Archive() {
  const { deliveryOrders } = useData();
  const navigate = useNavigate();
  const archivedOrdersAll = deliveryOrders.filter(o => o.status === 'Completed' || o.status === 'Delivered');

  const [searchQuery, setSearchQuery] = useState('');
  const [driverFilter, setDriverFilter] = useState('All Drivers');
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [podFilter, setPodFilter] = useState('POD: All');

  const filteredOrders = archivedOrdersAll.filter(o => {
    if (searchQuery && !o.waybillNo.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (driverFilter !== 'All Drivers' && o.driverName !== driverFilter) return false;
    if (areaFilter !== 'All Areas' && o.area !== areaFilter) return false;
    
    if (podFilter === 'POD: Submitted' && o.podStatus !== 'Submitted') return false;
    if (podFilter === 'No POD' && o.podStatus !== 'No POD') return false;
    return true;
  });

  const uniqueDrivers = Array.from(new Set(archivedOrdersAll.map(o => o.driverName).filter(Boolean)));
  const uniqueAreas = Array.from(new Set(archivedOrdersAll.map(o => o.area).filter(Boolean)));

  return (
    <>
      <Header
        title="Archive — Completed Deliveries"
        date="Sunday, March 29, 2026"
        actions={<button className="btn btn-outline btn-sm" id="export-archive"><Download size={14} /> Export Archive</button>}
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
            <div className="archive-stat"><strong>{archivedOrdersAll.filter(o => o.podStatus === 'Submitted').length}</strong><span>WITH POD</span></div>
            <div className="archive-stat"><strong>{archivedOrdersAll.filter(o => o.podStatus === 'No POD').length}</strong><span>NO POD</span></div>
            <div className="archive-stat"><strong>{archivedOrdersAll.length > 0 ? ((archivedOrdersAll.filter(o => o.podStatus === 'Submitted').length / archivedOrdersAll.length) * 100).toFixed(1) : 0}%</strong><span>SUCCESS RATE</span></div>
          </div>
          <div className="archive-readonly">
            <Lock size={14} /> <strong>Read-only.</strong> Archived records cannot be edited.
          </div>
        </div>

        {/* Filters */}
        <div className="orders-filter-bar">
          <div className="filter-search">
            <Search size={16} className="filter-search-icon" />
            <input 
              type="text" 
              placeholder="Search archived records by waybill..." 
              className="filter-search-input" 
              id="archive-search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="filter-select"><option>All Months</option></select>
          <select className="filter-select" value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
            <option>All Drivers</option>
            {uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="filter-select" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
            <option>All Areas</option>
            {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="filter-select" value={podFilter} onChange={e => setPodFilter(e.target.value)}>
            <option>POD: All</option>
            <option>POD: Submitted</option>
            <option>No POD</option>
          </select>
          <button className="btn btn-outline btn-sm"><Download size={14} /> Export</button>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-sm">
              <h4>Archived Records</h4>
              <span className="archive-count-badge">{filteredOrders.length} records</span>
              <span className="archive-readonly-tag"><Lock size={12} /> READ-ONLY</span>
            </div>
            <span className="text-muted text-sm">Sort by: Date Completed (Newest)</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>WAYBILL NO.</th>
                <th>CLIENT / SENDER</th>
                <th>RECIPIENT</th>
                <th>AREA</th>
                <th>DRIVER</th>
                <th>DATE COMPLETED</th>
                <th>POD</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No archived orders found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <span className="waybill-link" onClick={() => navigate(`/delivery-orders/${order.id}`)} style={{ cursor: 'pointer', color: 'var(--primary)' }}>{order.waybillNo}</span>
                      <div className="cell-sub">{order.orderDate.split(',')[0]}</div>
                    </td>
                    <td>
                      <span className="cell-name">{order.clientName}</span>
                      <div className="cell-sub">{order.clientType}</div>
                    </td>
                    <td>
                      <span>{order.recipientName}</span>
                      <div className="cell-sub">{order.recipientAddress.substring(0, 25)}...</div>
                    </td>
                    <td>{order.area}</td>
                    <td>
                      <div className="driver-cell">
                        <div className="driver-avatar" style={{ background: order.driverColor }}>{order.driverInitials}</div>
                        <span>{order.driverName.split(',')[0]}</span>
                      </div>
                    </td>
                    <td className="text-sm">{order.dateCompleted || '—'}</td>
                    <td><StatusBadge status={order.podStatus} size="sm" /></td>
                    <td className="cell-actions">
                      <button className="action-icon-btn" title="View" onClick={() => navigate(`/delivery-orders/${order.id}`)}><Eye size={14} /></button>
                      <button className="action-icon-btn" title="Archive" disabled><ArchiveIcon size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="table-pagination">
            <span className="pagination-info">Showing {filteredOrders.length} archived records</span>
            <div className="pagination-controls">
              <button className="pagination-btn" disabled>‹</button>
              <button className="pagination-btn active">1</button>
              <button className="pagination-btn">2</button>
              <button className="pagination-btn">3</button>
              <span className="pagination-ellipsis">...</span>
              <button className="pagination-btn">129</button>
              <button className="pagination-btn">›</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
