import { useEffect, useState, useMemo } from 'react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { Plus, ClipboardList, MapPin, Package, Truck, CheckCircle2, XCircle, ShoppingBag, Eye, Kanban, Table, Search, ShieldCheck, Calendar } from 'lucide-react';
import type { DeliveryOrder } from '../../types';
import './Tasks.css';

interface ColumnProps {
  title: string;
  orders: DeliveryOrder[];
  onNavigate: (id: string) => void;
  colorClass: string;
  icon: React.ElementType;
}

const Column = ({ title, orders, onNavigate, colorClass, icon: Icon }: ColumnProps) => (
  <div className={`task-column ${colorClass}`}>
    <div className="task-column-header">
      <div className="task-column-title">
        <div className="task-column-icon">
          <Icon size={16} />
        </div>
        <h4>{title}</h4>
      </div>
      <span className="task-column-count">{orders.length}</span>
    </div>

    <div className="task-column-body">
      {orders.length === 0 ? (
        <div className="task-column-empty">
          <ClipboardList size={28} />
          <p>No tasks here</p>
        </div>
      ) : (
        orders.map(o => (
          <div key={o.id} className="task-card" onClick={() => onNavigate(`/delivery-orders/${o.id}`)}>
            <div className="task-card-waybill">{o.waybillNo}</div>

            <div className="task-card-address">
              <MapPin size={13} />
              <span>{(o.recipientAddress || 'No address').substring(0, 45)}{(o.recipientAddress || '').length > 45 ? '…' : ''}</span>
            </div>

            {o.expectedDelivery && (
              <div className="task-card-address" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                <Calendar size={12} />
                <span style={{ fontSize: '0.75rem' }}>Due: {o.expectedDelivery}</span>
              </div>
            )}

            <div className="task-card-footer">
              <div className="task-card-driver">
                {o.driverInitials ? (
                  <div
                    className="task-card-avatar"
                    style={{ background: o.driverColor || 'var(--primary)' }}
                  >
                    {o.driverInitials}
                  </div>
                ) : null}
                <span className="task-card-driver-name">
                  {o.driverName ? o.driverName.split(',')[0] : 'Unassigned'}
                </span>
              </div>
              <StatusBadge status={o.status} size="sm" />
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export default function Tasks() {
  const { employees, deliveryOrders, refreshOrders, bulkAssignDriver, addActivityLog } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Layout View Mode State
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Filter options state for Table View
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [driverFilter, setDriverFilter] = useState('All');
  const [taskTypeFilter, setTaskTypeFilter] = useState('All');

  // Pagination state for Table View
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection & Bulk Action state for Table View
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkDriverId, setBulkDriverId] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  useEffect(() => {
    refreshOrders();
  }, []);

  // Reset pagination & checkboxes when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrderIds([]);
  }, [searchQuery, statusFilter, driverFilter, taskTypeFilter, pageSize]);

  const isDriver = user?.role === 'DRIVER';
  const isOpTeam = user?.role === 'OP. TEAM';

  const visibleOrders = useMemo(() => {
    return isDriver 
      ? deliveryOrders.filter(o => o.driverName === user?.name && o.taskType !== 'Pickup')
      : isOpTeam
      ? deliveryOrders.filter(o => o.encodedBy === user?.name || o.updatedBy === user?.name)
      : deliveryOrders;
  }, [deliveryOrders, isDriver, isOpTeam, user?.name]);

  const drivers = useMemo(() => {
    return employees ? employees.filter(e => e.role === 'DRIVER') : [];
  }, [employees]);

  // Filters logic for Table View
  const filteredTableOrders = useMemo(() => {
    return visibleOrders.filter(o => {
      // Search text query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesWaybill = (o.waybillNo || '').toLowerCase().includes(query);
        const matchesRecipient = (o.recipientName || '').toLowerCase().includes(query);
        const matchesClient = (o.clientName || '').toLowerCase().includes(query);
        if (!matchesWaybill && !matchesRecipient && !matchesClient) return false;
      }
      // Status dropdown filter
      if (statusFilter !== 'All') {
        if (o.status !== statusFilter) return false;
      }
      // Driver dropdown filter
      if (driverFilter !== 'All') {
        if (driverFilter === 'Unassigned') {
          if (o.driverName) return false;
        } else {
          if (o.driverName !== driverFilter) return false;
        }
      }
      // Task type dropdown filter
      if (taskTypeFilter !== 'All') {
        if (o.taskType !== taskTypeFilter) return false;
      }
      return true;
    });
  }, [visibleOrders, searchQuery, statusFilter, driverFilter, taskTypeFilter]);

  // Paginated subset of filtered orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTableOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredTableOrders, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTableOrders.length / pageSize) || 1;

  // Board columns filters (kept separate from table filters for stability)
  const pending   = visibleOrders.filter(o => (o.status === 'Pending' || o.status === 'Processing' || o.status === 'Assigned') && o.taskType !== 'Pickup');
  const inTransit = visibleOrders.filter(o => (o.status === 'In Transit' || o.status === 'Out for Delivery' || o.status === 'Picked Up') && o.taskType !== 'Pickup');
  const failed    = visibleOrders.filter(o => (o.status === 'Failed' || o.status === 'Returning' || o.status === 'Returned') && o.taskType !== 'Pickup');
  const completed = visibleOrders.filter(o => (o.status === 'Delivered' || o.status === 'Completed') && o.taskType !== 'Pickup');
  const pickups   = visibleOrders.filter(o => o.taskType === 'Pickup' && o.status !== 'Completed' && o.status !== 'Picked Up' && o.status !== 'Cancelled');

  // Checkbox Selection Handlers
  const handleToggleSelectAll = () => {
    const currentPageIds = paginatedOrders.map(o => o.id);
    const allSelected = currentPageIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => {
        const next = [...prev];
        currentPageIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk Assignment Handler
  const handleBulkAssign = async () => {
    if (!bulkDriverId) {
      alert("Please select a courier to assign.");
      return;
    }
    if (selectedOrderIds.length === 0) {
      alert("No orders selected.");
      return;
    }

    const selectedDriver = employees.find(e => e.id === bulkDriverId || String(e.id) === bulkDriverId);
    if (!selectedDriver) return;

    if (window.confirm(`Are you sure you want to assign ${selectedOrderIds.length} orders to driver ${selectedDriver.name}?`)) {
      setIsBulkAssigning(true);
      try {
        await bulkAssignDriver(selectedOrderIds, Number(bulkDriverId));
        
        await addActivityLog({
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          userName: user?.name || 'System',
          userRole: user?.role || 'Staff',
          userInitials: user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'SY',
          userColor: '#00A99D',
          action: 'Assign',
          description: `Bulk assigned ${selectedOrderIds.length} orders to driver ${selectedDriver.name}`,
        });

        setSelectedOrderIds([]);
        setBulkDriverId('');
        alert("Bulk assignment completed successfully!");
      } catch (err: any) {
        console.error("Bulk assign failed", err);
      } finally {
        setIsBulkAssigning(false);
      }
    }
  };

  return (
    <>
      <Header 
        title="Tasks Board" 
        subtitle={isDriver ? "My Tasks" : "Operations"}
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="view-mode-toggle" style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px' }}>
              <button 
                className={`btn btn-sm ${viewMode === 'board' ? 'btn-primary' : ''}`}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: viewMode === 'board' ? 'var(--primary)' : 'transparent', color: viewMode === 'board' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setViewMode('board')}
              >
                <Kanban size={13} /> Board
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : ''}`}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: viewMode === 'table' ? 'var(--primary)' : 'transparent', color: viewMode === 'table' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setViewMode('table')}
              >
                <Table size={13} /> Table
              </button>
            </div>
            {!isDriver && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/delivery-orders/new/edit')}>
                <Plus size={16} /> Add Task
              </button>
            )}
          </div>
        }
      />
      <div className="page-content">
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
          {isDriver ? "Manage and monitor your assigned delivery tasks." : "Manage and monitor delivery tasks across different stages."}
        </p>

        {viewMode === 'table' ? (
          <div className="table-view-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Filter Bar */}
            <div className="orders-filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div className="filter-search" style={{ flex: 1, minWidth: '200px' }}>
                <Search size={16} className="filter-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search waybill, client, recipient..." 
                  className="filter-search-input" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Transit">In Transit</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Returned">Returned</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select className="filter-select" value={taskTypeFilter} onChange={e => setTaskTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>

              {!isDriver && (
                <select className="filter-select" value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
                  <option value="All">All Drivers</option>
                  <option value="Unassigned">Unassigned</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.name}>{drv.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Bulk Actions Panel */}
            {!isDriver && selectedOrderIds.length > 0 && (
              <div className="bulk-actions-panel animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'var(--status-transit-bg)', border: '1px solid var(--primary)', padding: '12px 20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {selectedOrderIds.length} orders selected
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select 
                    className="filter-select" 
                    style={{ background: 'white' }} 
                    value={bulkDriverId} 
                    onChange={e => setBulkDriverId(e.target.value)}
                  >
                    <option value="">Select driver to assign...</option>
                    {drivers.map(drv => (
                      <option key={drv.id} value={drv.id}>{drv.name}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-primary btn-sm"
                    disabled={isBulkAssigning || !bulkDriverId}
                    onClick={handleBulkAssign}
                  >
                    {isBulkAssigning ? 'Assigning...' : 'Assign Courier'}
                  </button>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      {!isDriver && (
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrderIds.includes(o.id))}
                            onChange={handleToggleSelectAll}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                      )}
                      <th>WAYBILL NO.</th>
                      <th>TYPE</th>
                      <th>CLIENT</th>
                      <th>RECIPIENT</th>
                      <th>AREA / ROUTE</th>
                      <th>DRIVER</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={isDriver ? 8 : 9} style={{ textAlign: 'center', padding: '40px 20px' }}>
                          <ClipboardList size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                          <p style={{ color: 'var(--text-secondary)' }}>No orders found matching filters.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map(order => (
                        <tr key={order.id} style={{ opacity: order.status === 'Cancelled' ? 0.6 : 1 }}>
                          {!isDriver && (
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={() => handleToggleSelectOne(order.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                          )}
                          <td>
                            <strong style={{ color: 'var(--primary)' }}>{order.waybillNo}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.orderDate}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: order.taskType === 'Pickup' ? '#7C3AED' : '#00A99D', background: order.taskType === 'Pickup' ? '#F5F3FF' : '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                              {order.taskType || 'Delivery'}
                            </span>
                          </td>
                          <td>{order.clientName}</td>
                          <td>
                            <div>{order.recipientName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{order.recipientContact}</div>
                          </td>
                          <td>
                            <div>{order.area}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.recipientAddress}
                            </div>
                          </td>
                          <td>
                            {order.taskType === 'Pickup' ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Office Pickup</span>
                            ) : order.driverName ? (
                              <div className="driver-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="driver-avatar" style={{ background: order.driverColor, color: 'white', width: '24px', height: '24px', fontSize: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                  {order.driverInitials}
                                </div>
                                <span style={{ fontSize: '0.85rem' }}>{order.driverName}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unassigned</span>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={order.status} size="sm" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="action-icon-btn" 
                              title="View Details"
                              onClick={() => navigate(`/delivery-orders/${order.id}`)}
                              style={{ display: 'inline-flex', padding: '6px', borderRadius: '6px', background: 'var(--bg-main)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="table-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Showing {filteredTableOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredTableOrders.length)} of {filteredTableOrders.length} entries
                  </span>
                  <select 
                    className="filter-select" 
                    style={{ height: '32px', padding: '0 8px', fontSize: '0.8rem' }}
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                  >
                    <option value={10}>10 rows</option>
                    <option value={20}>20 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tasks-board-container">
            {!isDriver && (
              <Column title="Pickups" orders={pickups} onNavigate={navigate} colorClass="col-pickup" icon={ShoppingBag} />
            )}
            <Column title="Pending Dispatch" orders={pending}   onNavigate={navigate} colorClass="col-pending"   icon={Package} />
            <Column title="In Transit"        orders={inTransit} onNavigate={navigate} colorClass="col-transit"   icon={Truck} />
            <Column title="Failed / Returned" orders={failed}    onNavigate={navigate} colorClass="col-failed"    icon={XCircle} />
            <Column title="Delivered"         orders={completed} onNavigate={navigate} colorClass="col-completed" icon={CheckCircle2} />
          </div>
        )}
      </div>
    </>
  );
}
