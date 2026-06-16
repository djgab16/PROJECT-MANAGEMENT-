import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Pencil, Trash2, Image, PackageX, RefreshCw, AlertTriangle } from 'lucide-react';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { DeliveryOrder } from '../../types';
import './DeliveryOrders.css';

export default function DeliveryOrders() {
  const { deliveryOrders, deleteDeliveryOrder } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [showFilters, setShowFilters] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<DeliveryOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { user } = useAuth();
  const isOpTeam = user?.role === 'OP. TEAM';

  const uniqueAreas = Array.from(new Set(deliveryOrders.map(o => o.area).filter(Boolean)));

  const baseOrders = isOpTeam
    ? deliveryOrders.filter(o => o.encodedBy === user?.name || o.updatedBy === user?.name || o.redeliveryStatus === 'Pending Approval')
    : deliveryOrders;

  // Only show active (non-archived) orders — cancelled orders go straight to Archive
  const visibleOrders = baseOrders.filter(order => !order.isArchived);

  const filteredOrders = visibleOrders.filter(order => {
    const matchesSearch =
      (order.waybillNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.recipientName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All Status' || order.status === statusFilter;
    const matchesArea = areaFilter === 'All Areas' || order.area === areaFilter;

    return matchesSearch && matchesStatus && matchesArea;
  });

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDeliveryOrder(deleteTarget.id);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Header
        title="Delivery Orders"
        subtitle="Delivery Tracker"
        date={new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        actions={
          <Link to="/delivery-orders/new/edit" className="btn btn-primary" id="new-order-btn">
            <Plus size={16} /> NEW ORDER
          </Link>
        }
      />
      <div className="page-content">
        {/* Summary Stats Bar */}
        <div className="order-stats-bar">
          <div className="order-stat">
            <span className="order-stat-value">{visibleOrders.filter(o => o.status !== 'Cancelled').length}</span>
            <span className="order-stat-label">TOTAL DELIVERIES</span>
          </div>
          <div className="order-stat-divider" />
          <div className="order-stat">
            <span className="order-stat-value">{visibleOrders.filter(o => o.status === 'Pending').length}</span>
            <span className="order-stat-label">PENDING DISPATCH</span>
          </div>
          <div className="order-stat-divider" />
          <div className="order-stat">
            <span className="order-stat-value">{visibleOrders.filter(o => o.status === 'Delivered').length}</span>
            <span className="order-stat-label">DELIVERED TODAY</span>
          </div>
          <div className="order-stat-divider" />
          <div className="order-stat">
            <span className="order-stat-value highlight-red">{visibleOrders.filter(o => o.status === 'Failed').length}</span>
            <span className="order-stat-label">FAILED PICKUPS</span>
          </div>
          <div className="order-stat-divider" />
          <div className="order-stat">
            <span className="order-stat-value">{visibleOrders.filter(o => o.potStatus === 'Submitted').length}</span>
            <span className="order-stat-label">POT SUBMITTED</span>
          </div>
        </div>

        {/* Filters */}
        <div className="orders-filter-bar">
          <div className="filter-search">
            <Search size={16} className="filter-search-icon" />
            <input
              type="text"
              placeholder="Search by waybill, client..."
              className="filter-search-input"
              id="order-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            id="status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Assigned</option>
            <option>Picked Up</option>
            <option>In Transit</option>
            <option>Out for Delivery</option>
            <option>Delivered</option>
            <option>Failed</option>
          </select>
          <select
            className="filter-select"
            id="area-filter"
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
          >
            <option>All Areas</option>
            {uniqueAreas.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-outline'}`}
            id="more-filters-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} /> More Filters
          </button>
        </div>

        {showFilters && (
          <div
            style={{
              background: 'white',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #eee',
              display: 'flex',
              gap: '16px',
            }}
          >
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Date Range (Placeholder)</label>
              <input type="date" className="filter-select" style={{ width: '100%', height: '40px' }} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Clear Filters</label>
              <button
                className="btn btn-outline"
                style={{ height: '40px' }}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All Status');
                  setAreaFilter('All Areas');
                }}
              >
                Reset Options
              </button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>WAYBILL NO.</th>
                  <th>CLIENT / SENDER</th>
                  <th>RECIPIENT</th>
                  <th>AREA / ROUTE</th>
                  <th>DRIVER</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    style={{ opacity: order.status === 'Cancelled' ? 0.65 : 1 }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link to={`/delivery-orders/${order.id}`} className="waybill-link">
                          {order.waybillNo}
                        </Link>
                        {order.priority && <StatusBadge status={order.priority} size="sm" />}
                      </div>
                      <div className="cell-sub">{order.orderDate}</div>
                      {order.redeliveryAttemptCount && order.redeliveryAttemptCount > 0 ? (
                        <div
                          className="cell-sub"
                          style={{
                            color: 'var(--status-failed)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px',
                          }}
                        >
                          <RefreshCw size={10} />
                          Re-delivery #{order.redeliveryAttemptCount}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className="cell-name">{order.clientName}</span>
                      <div className="cell-sub">{order.clientType}</div>
                    </td>
                    <td>
                      <span>{order.recipientName}</span>
                      <div className="cell-sub">{(order.recipientAddress || '').substring(0, 30)}...</div>
                    </td>
                    <td>{order.area}</td>
                    <td>
                      {order.driverName ? (
                        <div className="driver-cell">
                          <div className="driver-avatar" style={{ background: order.driverColor }}>
                            {order.driverInitials}
                          </div>
                          <span>{order.driverName.split(',')[0]}</span>
                        </div>
                      ) : (
                        <span className="cell-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={order.status} size="sm" />
                      {order.podStatus === 'Submitted' && (
                        <div
                          className="cell-sub"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px',
                            color: 'var(--status-active)',
                          }}
                        >
                          <Image size={12} /> POD Attached
                        </div>
                      )}
                    </td>
                    <td className="cell-actions">
                      <Link
                        to={`/delivery-orders/${order.id}`}
                        className="action-icon-btn"
                        title="View"
                      >
                        <Eye size={14} />
                      </Link>
                      {order.status === 'Cancelled' ? (
                        /* Cancelled orders are read-only — no edit/delete */
                        <span
                          className="action-icon-btn disabled"
                          title="Order is cancelled"
                          style={{
                            opacity: 0.4,
                            cursor: 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span>🚫</span>
                        </span>
                      ) : order.status === 'In Transit' || order.status === 'Out for Delivery' ? (
                        <span
                          className="action-icon-btn disabled"
                          title="Order is in transit (Locked)"
                          style={{
                            opacity: 0.6,
                            cursor: 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span>🔒</span>
                        </span>
                      ) : (
                        <>
                          <Link
                            to={`/delivery-orders/${order.id}/edit`}
                            className="action-icon-btn"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button
                            className="action-icon-btn danger"
                            title="Cancel / Delete"
                            onClick={() => setDeleteTarget(order)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div style={{ padding: '24px' }}>
                        <EmptyState
                          icon={PackageX}
                          title="No delivery orders found"
                          description="We couldn't find any delivery orders matching your current search or filter criteria."
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-pagination">
            <span className="pagination-info">Showing {filteredOrders.length} records</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Cancel Delivery Order"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              background: 'var(--status-failed-bg)',
              border: '1px solid #ffdcd9',
              borderRadius: '8px',
              padding: '14px',
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--status-failed)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--status-failed)', marginBottom: '4px' }}>
                Cancel order {deleteTarget?.waybillNo}?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This will cancel the order and immediately move it to the Archive. You can restore it from the Archive if needed.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              Keep Order
            </button>
            <button
              className="btn btn-danger btn-sm"
              disabled={isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? 'Cancelling...' : 'Yes, Cancel Order'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
