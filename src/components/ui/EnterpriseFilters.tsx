import { useId, useMemo, useRef, useState } from 'react';
import {
  Search, Calendar, Truck, UserCheck, Users, SlidersHorizontal,
  RefreshCw, AlertCircle, Package, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { validateDateRange } from '../../utils/filterUtils';
import { useControlledPopup } from './useControlledPopup';
import './EnterpriseFilters.css';

export interface EnterpriseFilterState {
  searchQuery: string;
  dateType: string;
  customStartDate: string;
  customEndDate: string;
  orderType: string; // All, Delivery, Pickup
  status: string; // All, or specific DeliveryStatus
  driver: string; // All, Unassigned, or driver name
  region: string; // All, or region name
  route: string; // All, or route/zone name
  driverRating: string; // All, High (>4.5), Med (4.0-4.5), Low (<4.0)
  dispatcher: string; // All, or encoder name
  clientType: string; // All, Standard, Frequent
  packageType: string; // All, or package type
}

interface EnterpriseFiltersProps {
  filters: EnterpriseFilterState;
  onChange: (filters: EnterpriseFilterState) => void;
  onReset: () => void;
  title?: string;
  showCategoryFilters?: {
    date?: boolean;
    order?: boolean;
    driver?: boolean;
    operations?: boolean;
    client?: boolean;
  };
  showReset?: boolean;
}

export const initialFilterState: EnterpriseFilterState = {
  searchQuery: '',
  dateType: 'Last 30 Days',
  customStartDate: '',
  customEndDate: '',
  orderType: 'All',
  status: 'All',
  driver: 'All',
  region: 'All',
  route: 'All',
  driverRating: 'All',
  dispatcher: 'All',
  clientType: 'All',
  packageType: 'All',
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

export default function EnterpriseFilters({
  filters,
  onChange,
  onReset,
  title = "Advanced Search & Enterprise Filters",
  showCategoryFilters = { date: true, order: true, driver: true, operations: true, client: true },
  showReset = true
}: EnterpriseFiltersProps) {
  const { deliveryOrders } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const idPrefix = `enterprise-filters-${useId()}`;
  const titleId = `${idPrefix}-title`;
  const panelId = `${idPrefix}-panel`;
  const triggerId = `${panelId}-trigger`;
  const dateErrorId = `${idPrefix}-date-error`;
  const fieldId = (name: keyof EnterpriseFilterState) => `${idPrefix}-${name}`;

  useControlledPopup({
    open: isOpen,
    onOpenChange: setIsOpen,
    rootRef,
    triggerRef,
  });

  // Extract unique data options dynamically from current orders list
  const uniqueDrivers = useMemo(() => {
    return Array.from(new Set(deliveryOrders.map(o => o.driverName).filter(Boolean))).sort();
  }, [deliveryOrders]);

  const uniqueRoutes = useMemo(() => {
    return Array.from(new Set(deliveryOrders.map(o => o.route).filter(Boolean))).sort();
  }, [deliveryOrders]);

  const uniqueDispatchers = useMemo(() => {
    return Array.from(new Set(deliveryOrders.map(o => o.encodedBy || o.updatedBy).filter(Boolean))).sort();
  }, [deliveryOrders]);

  const uniquePackageTypes = useMemo(() => {
    return Array.from(new Set(deliveryOrders.map(o => o.packageType).filter(Boolean))).sort();
  }, [deliveryOrders]);

  const handleFilterChange = (key: keyof EnterpriseFilterState, value: string) => {
    const nextFilters = { ...filters, [key]: value };

    // Validate if changing dates
    if (key === 'dateType' || key === 'customStartDate' || key === 'customEndDate') {
      const validation = validateDateRange(
        nextFilters.dateType,
        nextFilters.customStartDate,
        nextFilters.customEndDate
      );
      if (!validation.valid) {
        setDateError(validation.message || 'Invalid date range');
        // Do not update parent filters if custom inputs are invalid
        if (nextFilters.dateType === 'custom') {
          onChange({
            ...nextFilters,
            customStartDate: filters.customStartDate,
            customEndDate: filters.customEndDate,
          });
          return;
        }
      } else {
        setDateError(null);
      }
    }

    onChange(nextFilters);
  };

  return (
    <section
      className="enterprise-filters-container glass ui-motion"
      ref={rootRef}
      aria-labelledby={titleId}
    >
      <h2 className="ui-sr-only" id={titleId}>{title}</h2>
      {/* Top Smart Search & Trigger Bar */}
      <div className="filters-primary-bar">
        <div className="smart-search-box">
          <Search className="search-icon" size={18} aria-hidden="true" />
          <label className="ui-sr-only" htmlFor={fieldId('searchQuery')}>Search records</label>
          <input
            id={fieldId('searchQuery')}
            type="search"
            aria-label="Search records"
            placeholder="Smart Search: tracking #, waybill, driver name, client name, employee ID..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            className="smart-search-input"
          />
          {filters.searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => handleFilterChange('searchQuery', '')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="primary-actions">
          <button
            ref={triggerRef}
            id={triggerId}
            type="button"
            className={`btn-toggle-filters ${isOpen ? 'active' : ''}`}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setIsOpen(!isOpen)}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>{isOpen ? 'Hide Filters' : 'Advanced Filters'}</span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showReset && (
            <button 
              type="button" 
              className="btn-reset-filters" 
              onClick={() => {
                setDateError(null);
                onReset();
              }}
            >
              <RefreshCw size={12} aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Advanced Filters Sections */}
      {isOpen && (
        <div
          id={panelId}
          className="filters-expanded-content"
          role="region"
          aria-labelledby={triggerId}
        >
          <div className="filters-grid">
            {/* Date Filters Section */}
            {showCategoryFilters.date && (
              <div className="filter-category-card">
                <div className="category-header">
                  <Calendar size={14} className="cat-icon text-teal" />
                  <h5>Date Filter</h5>
                </div>
                <div className="category-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('dateType')}>Date Range Type</label>
                    <select
                      id={fieldId('dateType')}
                      value={filters.dateType}
                      onChange={(e) => handleFilterChange('dateType', e.target.value)}
                      className="filter-select"
                    >
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="This Month">This Month</option>
                      <option value="Last Month">Last Month</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {filters.dateType === 'custom' && (
                    <div className="custom-date-inputs animate-fade-in">
                      <div className="form-group">
                        <label className="form-label" htmlFor={fieldId('customStartDate')}>Start Date</label>
                        <input
                          id={fieldId('customStartDate')}
                          type="date"
                          value={filters.customStartDate}
                          onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                          className={`form-input ${dateError ? 'error' : ''}`}
                          aria-invalid={Boolean(dateError)}
                          aria-describedby={dateError ? dateErrorId : undefined}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor={fieldId('customEndDate')}>End Date</label>
                        <input
                          id={fieldId('customEndDate')}
                          type="date"
                          value={filters.customEndDate}
                          onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                          className={`form-input ${dateError ? 'error' : ''}`}
                          aria-invalid={Boolean(dateError)}
                          aria-describedby={dateError ? dateErrorId : undefined}
                        />
                      </div>
                    </div>
                  )}

                  {dateError && (
                    <div
                      id={dateErrorId}
                      className="date-error-alert text-sm text-failed"
                      role="alert"
                    >
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>{dateError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order/Delivery Filters Section */}
            {showCategoryFilters.order && (
              <div className="filter-category-card">
                <div className="category-header">
                  <Truck size={14} className="cat-icon text-blue" />
                  <h5>Order Logistics</h5>
                </div>
                <div className="category-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('orderType')}>Task Type</label>
                    <select
                      id={fieldId('orderType')}
                      value={filters.orderType}
                      onChange={(e) => handleFilterChange('orderType', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Types</option>
                      <option value="Delivery">Delivery</option>
                      <option value="Pickup">Pickup</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('status')}>Logistics Status</label>
                    <select
                      id={fieldId('status')}
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending / Unassigned</option>
                      <option value="Processing">Processing</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Picked Up">Picked Up</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Completed">Completed</option>
                      <option value="Failed">Failed Delivery</option>
                      <option value="Returned">Returned</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Ready for Pickup">Ready for Pickup</option>
                      <option value="Archived">Archived Records</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Performance Filters Section */}
            {showCategoryFilters.driver && (
              <div className="filter-category-card">
                <div className="category-header">
                  <UserCheck size={14} className="cat-icon text-green" />
                  <h5>Driver & Performance</h5>
                </div>
                <div className="category-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('driver')}>Assignee / Driver</label>
                    <select
                      id={fieldId('driver')}
                      value={filters.driver}
                      onChange={(e) => handleFilterChange('driver', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Drivers</option>
                      <option value="Unassigned">Unassigned</option>
                      {uniqueDrivers.map(drv => (
                        <option key={drv} value={drv}>{drv}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('route')}>Route / Zone</label>
                    <select
                      id={fieldId('route')}
                      value={filters.route}
                      onChange={(e) => handleFilterChange('route', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Zones</option>
                      {uniqueRoutes.map(rt => (
                        <option key={rt} value={rt}>{rt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('driverRating')}>Driver Score Level</label>
                    <select
                      id={fieldId('driverRating')}
                      value={filters.driverRating}
                      onChange={(e) => handleFilterChange('driverRating', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Scores</option>
                      <option value="High">Excellent (Score {`>=`} 90)</option>
                      <option value="Medium">Average (Score 70 - 89)</option>
                      <option value="Low">Critical (Score {`<`} 70)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Operations Staff Filters Section */}
            {showCategoryFilters.operations && (
              <div className="filter-category-card">
                <div className="category-header">
                  <Users size={14} className="cat-icon text-orange" />
                  <h5>Operations & Staff</h5>
                </div>
                <div className="category-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('dispatcher')}>Dispatcher / Encoder</label>
                    <select
                      id={fieldId('dispatcher')}
                      value={filters.dispatcher}
                      onChange={(e) => handleFilterChange('dispatcher', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Staff</option>
                      {uniqueDispatchers.map(disp => (
                        <option key={disp} value={disp}>{disp}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('region')}>Region Area</label>
                    <select
                      id={fieldId('region')}
                      value={filters.region}
                      onChange={(e) => handleFilterChange('region', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Regions</option>
                      {REGIONS.map(reg => (
                        <option key={reg.name} value={reg.name}>{reg.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Client Cohort Filters Section */}
            {showCategoryFilters.client && (
              <div className="filter-category-card">
                <div className="category-header">
                  <Package size={14} className="cat-icon text-purple" />
                  <h5>Client & Package</h5>
                </div>
                <div className="category-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('clientType')}>Client Segment</label>
                    <select
                      id={fieldId('clientType')}
                      value={filters.clientType}
                      onChange={(e) => handleFilterChange('clientType', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Clients</option>
                      <option value="Frequent">Frequent Cohort ({`>=`} 3 orders)</option>
                      <option value="Repeat">Repeat Delivery</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={fieldId('packageType')}>Package Type</label>
                    <select
                      id={fieldId('packageType')}
                      value={filters.packageType}
                      onChange={(e) => handleFilterChange('packageType', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Package Types</option>
                      {uniquePackageTypes.map(pkg => (
                        <option key={pkg} value={pkg}>{pkg}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
