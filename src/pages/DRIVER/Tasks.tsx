import { useEffect, useState, useMemo } from 'react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { 
  Plus, ClipboardList, MapPin, Package, Truck, CheckCircle2, 
  XCircle, ShoppingBag, Eye, Kanban, Table, ShieldCheck, Calendar 
} from 'lucide-react';
import EnterpriseFilters, { initialFilterState } from '../../components/ui/EnterpriseFilters';
import type { EnterpriseFilterState } from '../../components/ui/EnterpriseFilters';
import Modal from '../../components/ui/Modal';
import { fuzzyMatch, getDateRangeBounds, isDateInBounds } from '../../utils/filterUtils';
import type { DeliveryOrder, Employee } from '../../types';
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
  const { employees, deliveryOrders, refreshOrders, bulkAssignDriver } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Layout View Mode State
  const [viewMode, setViewMode] = useState<'board' | 'table'>('table');

  // Enterprise Advanced Filters State for Table View
  const [filters, setFilters] = useState<EnterpriseFilterState>({
    ...initialFilterState,
    dateType: 'Last 30 Days' // Default Tasks page to Last 30 Days
  });

  // Pagination state for Table View
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection & Bulk Action state for Table View
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkDriverId, setBulkDriverId] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [targetDriver, setTargetDriver] = useState<Employee | null>(null);
  const [activeAssignDropdown, setActiveAssignDropdown] = useState<string | null>(null);

  useEffect(() => {
    refreshOrders();
  }, []);

  // Reset pagination & checkboxes when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrderIds([]);
  }, [filters, pageSize]);

  const isDriver = user?.role === 'DRIVER';
  const isOpTeam = user?.role === 'OP. TEAM';
  const isClient = user?.role === 'CLIENT';

  const visibleOrders = useMemo(() => {
    return isDriver 
      ? deliveryOrders.filter(o => o.driverName === user?.name && o.taskType !== 'Pickup')
      : isClient
      ? deliveryOrders.filter(o => o.clientName === user?.name || o.encodedBy === user?.name)
      : isOpTeam
      ? deliveryOrders.filter(o => o.encodedBy === user?.name || o.updatedBy === user?.name || o.redeliveryStatus === 'Pending Approval')
      : deliveryOrders;
  }, [deliveryOrders, isDriver, isClient, isOpTeam, user?.name]);

  const drivers = useMemo(() => {
    return employees ? employees.filter(e => e.role === 'DRIVER') : [];
  }, [employees]);

  // Client counts cache for Frequent cohort matching
  const clientCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleOrders.forEach(o => {
      if (o.clientName) counts[o.clientName] = (counts[o.clientName] || 0) + 1;
    });
    return counts;
  }, [visibleOrders]);

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

  // Filters logic for Table View
  const filteredTableOrders = useMemo(() => {
    return visibleOrders.filter(order => {
      // Exclude Cancelled orders from active Tasks view
      if (order.status === 'Cancelled') return false;

      // Exclude archived orders unless explicitly filtering for Archived status
      if (order.isArchived && filters.status !== 'Archived') return false;

      // Smart Fuzzy Search
      if (filters.searchQuery) {
        const q = filters.searchQuery;
        const matches = 
          fuzzyMatch(order.waybillNo, q) ||
          fuzzyMatch(order.clientName, q) ||
          fuzzyMatch(order.recipientName, q) ||
          fuzzyMatch(order.driverName, q) ||
          fuzzyMatch(order.id, q);
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
  }, [visibleOrders, filters, clientCounts]);

  // Paginated subset of filtered orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTableOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredTableOrders, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTableOrders.length / pageSize) || 1;

  // Board columns filters (kept separate from table filters for stability)
  const pending   = visibleOrders.filter(o => !o.isArchived && (o.status === 'Pending' || o.status === 'Processing' || o.status === 'Assigned') && o.taskType !== 'Pickup');
  const inTransit = visibleOrders.filter(o => !o.isArchived && (o.status === 'In Transit' || o.status === 'Out for Delivery' || o.status === 'Picked Up') && o.taskType !== 'Pickup');
  const failed    = visibleOrders.filter(o => !o.isArchived && (o.status === 'Failed' || o.status === 'Returning' || o.status === 'Returned') && o.taskType !== 'Pickup');
  const completed = visibleOrders.filter(o => !o.isArchived && (o.status === 'Delivered' || o.status === 'Completed') && o.taskType !== 'Pickup');
  const pickups   = visibleOrders.filter(o => !o.isArchived && o.taskType === 'Pickup' && o.status !== 'Completed' && o.status !== 'Picked Up' && o.status !== 'Cancelled');

  // Checkbox Selection Handlers
  const handleToggleSelectAll = () => {
    const currentPageIds = paginatedOrders.filter(o => o.taskType !== 'Pickup').map(o => o.id);
    if (currentPageIds.length === 0) return;
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
  const handleBulkAssign = () => {
    if (!bulkDriverId) {
      alert("Please select a courier to assign.");
      return;
    }
    if (selectedOrderIds.length === 0) {
      alert("No orders selected.");
      return;
    }

    const matchedDriver = employees.find(e => e.id === bulkDriverId || String(e.id) === bulkDriverId);
    if (!matchedDriver) return;

    setTargetDriver(matchedDriver);
    setShowBulkConfirm(true);
  };

  const confirmBulkAssign = async () => {
    if (!targetDriver) return;
    setIsBulkAssigning(true);
    setShowBulkConfirm(false);

    try {
      await bulkAssignDriver(selectedOrderIds, Number(targetDriver.id));
      
      setSelectedOrderIds([]);
      setBulkDriverId('');
      setTargetDriver(null);
    } catch (err: any) {
      console.error("Bulk assign failed", err);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  return (
    <>
      <Header 
        title="Tasks Board" 
        subtitle={isDriver ? "My Tasks" : "Operations"}
      />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {isDriver ? "Manage and monitor your assigned delivery tasks." : "Manage and monitor delivery tasks across different stages."}
          </p>
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
        </div>

        {viewMode === 'table' ? (
          <div className="table-view-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <EnterpriseFilters 
              filters={filters} 
              onChange={setFilters} 
              onReset={() => setFilters({ ...initialFilterState, dateType: 'Last 30 Days' })} 
              showReset={false}
            />

            {/* Bulk Actions Panel (Floating Action Bar) */}
            {!isDriver && selectedOrderIds.length > 0 && (
              <div className="bulk-actions-panel-floating">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {selectedOrderIds.length} orders selected
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select 
                    className="filter-select" 
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', height: '38px', fontSize: '0.85rem' }} 
                    value={bulkDriverId} 
                    onChange={e => setBulkDriverId(e.target.value)}
                  >
                    <option value="">Select courier to assign...</option>
                    {drivers.map(drv => (
                      <option key={drv.id} value={drv.id}>{drv.name}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-primary btn-sm"
                    style={{ height: '38px', padding: '0 16px' }}
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
                            checked={paginatedOrders.filter(o => o.taskType !== 'Pickup').length > 0 && paginatedOrders.filter(o => o.taskType !== 'Pickup').every(o => selectedOrderIds.includes(o.id))}
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
                              {order.taskType !== 'Pickup' && (
                                <input 
                                  type="checkbox" 
                                  checked={selectedOrderIds.includes(order.id)}
                                  onChange={() => handleToggleSelectOne(order.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                              )}
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
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <button 
                                  className="inline-driver-btn"
                                  disabled={isDriver}
                                  onClick={() => setActiveAssignDropdown(activeAssignDropdown === order.id ? null : order.id)}
                                >
                                  {order.driverName ? (
                                    <>
                                      <div className="driver-avatar" style={{ background: order.driverColor }}>
                                        {order.driverInitials}
                                      </div>
                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{order.driverName}</span>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '0.8rem', color: '#D97706', background: 'rgba(217, 119, 6, 0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      + Assign Courier
                                    </span>
                                  )}
                                </button>
                                
                                {activeAssignDropdown === order.id && (
                                  <>
                                    <div 
                                      style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                      onClick={() => setActiveAssignDropdown(null)} 
                                    />
                                    <div className="inline-driver-dropdown">
                                      <div style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Select Courier
                                      </div>
                                      {drivers.map(drv => (
                                        <button
                                          key={drv.id}
                                          className="dropdown-item"
                                          onClick={async () => {
                                            setActiveAssignDropdown(null);
                                            try {
                                              await bulkAssignDriver([order.id], Number(drv.id));
                                            } catch (err) {
                                              console.error("Assignment failed:", err);
                                            }
                                          }}
                                        >
                                          <div style={{ background: drv.color || '#6B7280', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                                            {drv.initials || drv.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                          </div>
                                          <span style={{ fontWeight: 500 }}>{drv.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
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

      {/* Bulk Assignment Confirmation Modal */}
      <Modal
        isOpen={showBulkConfirm}
        onClose={() => !isBulkAssigning && setShowBulkConfirm(false)}
        title="Confirm Bulk Assignment"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--status-transit-bg)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '14px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>Assign {selectedOrderIds.length} orders?</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>You are about to assign these orders to <strong>{targetDriver?.name}</strong>. This will notify the driver immediately.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" disabled={isBulkAssigning} onClick={() => setShowBulkConfirm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={isBulkAssigning} onClick={confirmBulkAssign}>{isBulkAssigning ? 'Assigning...' : 'Yes, Assign Driver'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
