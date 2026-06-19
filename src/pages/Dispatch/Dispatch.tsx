import { useEffect, useState, useMemo } from 'react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import { 
  Truck, ShieldCheck, MapPin, Calendar, 
  Search, ClipboardList, CircleDot, RefreshCw
} from 'lucide-react';
import './Dispatch.css';

export default function Dispatch() {
  const { employees, deliveryOrders, refreshOrders, bulkAssignDriver } = useData();
  
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync data on load
  useEffect(() => {
    refreshOrders();
  }, []);

  // Filter out Pickups, Cancelled, Completed/Delivered, and already assigned orders
  const unassignedOrders = useMemo(() => {
    return deliveryOrders.filter(o => 
      !o.driverName && 
      o.status !== 'Cancelled' && 
      o.status !== 'Completed' && 
      o.status !== 'Delivered' && 
      o.taskType !== 'Pickup'
    );
  }, [deliveryOrders]);

  // Extract all couriers
  const drivers = useMemo(() => {
    return employees.filter(e => e.role === 'DRIVER');
  }, [employees]);

  // Calculate current active workload for each driver
  const driverWorkloads = useMemo(() => {
    const workloads: Record<string, number> = {};
    drivers.forEach(drv => {
      workloads[drv.name] = deliveryOrders.filter(o => 
        o.driverName === drv.name && 
        o.status !== 'Cancelled' && 
        o.status !== 'Completed' && 
        o.status !== 'Delivered'
      ).length;
    });
    return workloads;
  }, [deliveryOrders, drivers]);

  // Unique areas represented in the unassigned list
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    unassignedOrders.forEach(o => {
      if (o.area) areas.add(o.area);
    });
    return ['All', ...Array.from(areas)].sort();
  }, [unassignedOrders]);

  // Apply search and area filter
  const filteredOrders = useMemo(() => {
    return unassignedOrders.filter(order => {
      // Area filter
      if (selectedArea !== 'All' && order.area !== selectedArea) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (order.waybillNo || '').toLowerCase().includes(q) ||
          (order.clientName || '').toLowerCase().includes(q) ||
          (order.recipientName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unassignedOrders, selectedArea, searchQuery]);

  // Clear selections when filtered orders change
  useEffect(() => {
    setSelectedOrderIds([]);
  }, [selectedArea, searchQuery]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    const allSelected = filteredOrders.every(o => selectedOrderIds.includes(o.id));
    if (allSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAssignToDriver = async (driverId: string, driverName: string) => {
    if (selectedOrderIds.length === 0) {
      toast.warning("Please select at least one order to assign.");
      return;
    }

    try {
      await bulkAssignDriver(selectedOrderIds, Number(driverId));
      toast.success(`Successfully assigned ${selectedOrderIds.length} orders to ${driverName}`);
      setSelectedOrderIds([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to assign driver.");
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrders();
      toast.success("Orders list updated");
    } catch {
      toast.error("Failed to refresh orders");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <Header 
        title="Dispatch Control" 
        subtitle="Operations"
        actions={
          <button 
            className="btn btn-outline btn-sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />
      <div className="page-content dispatch-page-container">
        <div className="dispatch-layout-grid">
          
          {/* Left Column: Unassigned Orders */}
          <div className="dispatch-column unassigned-column">
            <div className="column-card">
              <div className="column-header">
                <div className="column-header-title">
                  <CircleDot size={18} className="text-pending" />
                  <h3>Pending Dispatch</h3>
                  <span className="count-badge count-pending">{unassignedOrders.length}</span>
                </div>
                {filteredOrders.length > 0 && (
                  <label className="select-all-label">
                    <input 
                      type="checkbox"
                      checked={filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                      onChange={handleToggleSelectAll}
                    />
                    <span>Select All</span>
                  </label>
                )}
              </div>

              {/* Filters */}
              <div className="dispatch-filters">
                <div className="search-box">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search waybill, client, recipient..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={selectedArea}
                  onChange={e => setSelectedArea(e.target.value)}
                  className="area-select"
                >
                  <option value="All">All Routes / Areas</option>
                  {uniqueAreas.filter(a => a !== 'All').map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* List */}
              <div className="unassigned-list-container">
                {filteredOrders.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList size={36} />
                    <p>No orders pending dispatch matching the filters.</p>
                  </div>
                ) : (
                  <div className="orders-card-list">
                    {filteredOrders.map(order => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <div 
                          key={order.id} 
                          className={`unassigned-order-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleSelectOne(order.id)}
                        >
                          <div className="card-checkbox-section">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by card onClick
                              onClick={e => e.stopPropagation()} // prevent double trigger
                            />
                          </div>
                          
                          <div className="card-main-content">
                            <div className="card-top-row">
                              <span className="waybill-tag">{order.waybillNo}</span>
                              <span className="pkg-tag">{order.packageType}</span>
                            </div>
                            
                            <div className="card-info-item">
                              <MapPin size={12} />
                              <span className="route-text">{order.area || 'No Area Specified'}</span>
                            </div>

                            <div className="card-address-preview">
                              {order.recipientAddress}
                            </div>

                            <div className="card-bottom-row">
                              <span className="client-name-text">From: <strong>{order.clientName}</strong></span>
                              {order.expectedDelivery && (
                                <span className="date-tag">
                                  <Calendar size={11} />
                                  {order.expectedDelivery}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Couriers workload & Assignment */}
          <div className="dispatch-column drivers-column">
            <div className="column-card">
              <div className="column-header">
                <div className="column-header-title">
                  <Truck size={18} className="text-primary" />
                  <h3>Courier Workloads</h3>
                  <span className="count-badge count-primary">{drivers.length}</span>
                </div>
                {selectedOrderIds.length > 0 && (
                  <div className="floating-selected-count">
                    <ShieldCheck size={14} />
                    <span>{selectedOrderIds.length} Selected</span>
                  </div>
                )}
              </div>

              {/* Drivers Grid */}
              <div className="drivers-list-container">
                {drivers.length === 0 ? (
                  <div className="empty-state">
                    <Truck size={36} />
                    <p>No active courier accounts found.</p>
                  </div>
                ) : (
                  <div className="drivers-grid">
                    {drivers.map(drv => {
                      const load = driverWorkloads[drv.name] || 0;
                      const hasSelection = selectedOrderIds.length > 0;
                      return (
                        <div key={drv.id} className="courier-dispatch-card">
                          <div className="courier-card-info">
                            <div 
                              className="courier-card-avatar"
                              style={{ background: drv.color || 'var(--primary)' }}
                            >
                              {drv.initials || drv.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="courier-card-details">
                              <h4 className="courier-name">{drv.name}</h4>
                              <div className="courier-workload-status">
                                <span className={`workload-indicator ${load > 5 ? 'heavy' : load > 2 ? 'medium' : 'light'}`}>
                                  {load} Active Tasks
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="courier-card-actions">
                            <button
                              className="btn btn-primary btn-sm assign-button"
                              disabled={!hasSelection}
                              onClick={() => handleAssignToDriver(drv.id, drv.name)}
                            >
                              Assign {hasSelection ? `(${selectedOrderIds.length})` : ''}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
