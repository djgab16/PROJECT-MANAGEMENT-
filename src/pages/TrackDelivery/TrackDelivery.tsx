import { useState } from 'react';
import { Search, Clock, MapPin, Package, Eye, Download, RefreshCw, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import type { DeliveryOrder, DeliveryStatus } from '../../types';
import './TrackDelivery.css';

export default function TrackDelivery() {
  const { deliveryOrders } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<DeliveryOrder | null>(null);
  const [error, setError] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleTrack = (eOrString?: React.FormEvent | string) => {
    setError(false);
    const searchVal = typeof eOrString === 'string' ? eOrString : query;
    if (!searchVal.trim()) return;

    const found = deliveryOrders.find(o => 
      o.waybillNo.toLowerCase() === searchVal.toLowerCase().trim()
    );
    
    if (found) {
      setTrackedOrder(found);
      setRecentSearches(prev => Array.from(new Set([found.waybillNo, ...prev])).slice(0, 5));
    } else {
      setTrackedOrder(null);
      setError(true);
    }
  };

  const getSteps = (status: DeliveryStatus) => {
    const allSteps: DeliveryStatus[] = ['Pending', 'In Transit', 'Delivered', 'Completed'];
    const currentIdx = allSteps.indexOf(status === 'Failed' ? 'In Transit' : status);
    
    return allSteps.map((label, i) => ({
      label: label.toUpperCase(),
      time: i <= currentIdx ? 'Updated recently' : 'Awaiting...',
      done: i <= currentIdx,
      current: i === currentIdx
    }));
  };

  const steps = trackedOrder ? getSteps(trackedOrder.status) : [];
  const currentStepIdx = trackedOrder ? ['Pending', 'In Transit', 'Delivered', 'Completed'].indexOf(trackedOrder.status === 'Failed' ? 'In Transit' : trackedOrder.status) : -1;

  return (
    <>
      <Header 
        title="Track Delivery" 
        subtitle="Delivery Tracker" 
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 
      />
      <div className="page-content">
        {/* Search Section */}
        <div className="track-search-section">
          <div className="track-search-bar-wrapper">
            <span className="label" style={{ color: 'white' }}>TRACKING</span>
            <h3 style={{ color: 'white', marginBottom: '12px' }}>Search by Waybill</h3>
            <div className="track-search-row">
              <div className="track-search-input-wrapper">
                <Search size={18} className="track-search-icon" />
                <input 
                  className="track-search-input" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  placeholder="Enter waybill number (e.g. SPX-2026-0841)" 
                  id="track-search-input" 
                />
              </div>
              <button className="btn btn-primary btn-lg track-btn" onClick={() => handleTrack()} id="track-now-btn">
                <Search size={16} /> TRACK NOW
              </button>
            </div>
            {trackedOrder && <p className="track-result-text">Result shown below · <span className="teal">{trackedOrder.waybillNo}</span> found — Last updated: {trackedOrder.lastUpdated}</p>}
            {error && <p className="track-result-text" style={{ color: '#FFCDCD' }}>Waybill not found. Please check the number and try again.</p>}
            
            {recentSearches.length > 0 && !trackedOrder && (
              <div className="recent-searches">
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <History size={14} /> Recent Searches
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {recentSearches.map(rs => (
                    <button 
                      key={rs} 
                      className="btn btn-outline btn-sm" 
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'transparent' }}
                      onClick={() => {
                        setQuery(rs);
                        handleTrack(rs);
                      }}
                    >
                      {rs}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {trackedOrder && (
          <div className="track-grid">
            {/* Main Content */}
            <div className="track-left">
              {/* Waybill Header */}
              <div className="card track-header-card">
                <div className="track-header-top">
                  <div>
                    <span className="label">WAYBILL NUMBER</span>
                    <h2 className="track-waybill">{trackedOrder.waybillNo}</h2>
                    <span className="text-muted text-sm">{trackedOrder.dateEncoded} · Encoded by: {trackedOrder.encodedBy}</span>
                  </div>
                  <StatusBadge status={trackedOrder.status} />
                </div>
                <div className="track-info-row">
                  <div><span className="label">SENDER</span><br /><strong>{trackedOrder.clientName}</strong></div>
                  <div><span className="label">RECIPIENT</span><br /><strong>{trackedOrder.recipientName}</strong></div>
                  <div><span className="label">AREA / ROUTE</span><br /><strong>{trackedOrder.area}</strong></div>
                  <div><span className="label">ASSIGNED DRIVER</span><br /><strong>{trackedOrder.driverName || 'Unassigned'}</strong></div>
                  <div><span className="label">PACKAGE TYPE</span><br /><strong>{trackedOrder.packageType}</strong></div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="card">
                <div className="card-header">
                  <h4>Delivery Status Timeline</h4>
                  <span className="text-sm">Current: <span className="teal font-semibold">{trackedOrder.status}</span></span>
                </div>
                <div className="timeline-stepper">
                  {steps.map((step, i) => (
                    <div key={i} className={`timeline-step ${step.done ? 'done' : ''} ${step.current ? 'current' : ''}`}>
                      <div className="timeline-circle">
                        {step.done && !step.current ? '✓' : step.current ? <Clock size={14} /> : i === 2 ? <MapPin size={14} /> : <Package size={14} />}
                      </div>
                      <span className="timeline-label">{step.label}</span>
                      <span className="timeline-time">{step.time}</span>
                    </div>
                  ))}
                  <div className="timeline-line">
                    <div className="timeline-line-fill" style={{ width: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Activity Log */}
              <div className="card">
                <h4>Activity Log</h4>
                <div className="track-log">
                  <div className="track-log-item">
                    <div className="log-marker active" />
                    <div>
                      <strong>Status: {trackedOrder.status}</strong>
                      <p>The package status is currently {trackedOrder.status}.</p>
                      <span>Last updated: {trackedOrder.lastUpdated} · By: {trackedOrder.updatedBy}</span>
                    </div>
                  </div>
                  <div className="track-log-item">
                    <div className="log-marker blue" />
                    <div>
                      <strong>Order Processed</strong>
                      <p>Order has been encoded and is being processed for {trackedOrder.area} route.</p>
                      <span>{trackedOrder.dateEncoded} · Encoded by: {trackedOrder.encodedBy}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="track-right">
              <div className="card">
                <div className="card-header">
                  <h4>Package Info</h4>
                  <button className="view-all-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>View Details →</button>
                </div>
                <div className="summary-fields">
                  <div className="summary-field"><span>PACKAGE TYPE</span><span>{trackedOrder.packageType}</span></div>
                  <div className="summary-field"><span>DESCRIPTION</span><span style={{ fontSize: '0.78rem' }}>{trackedOrder.packageDescription}</span></div>
                  <div className="summary-field"><span>WEIGHT</span><span>{trackedOrder.weight}</span></div>
                  <div className="summary-field"><span>DECLARED VALUE</span><span>{trackedOrder.declaredValue}</span></div>
                  <div className="summary-field"><span>DELIVERY ADDRESS</span><span style={{ fontSize: '0.78rem' }}>{trackedOrder.recipientAddress}</span></div>
                </div>
              </div>

              {trackedOrder.driverName && (
                <div className="card">
                  <h4>Assigned Driver</h4>
                  <div className="track-driver-card">
                    <div className="driver-avatar" style={{ background: trackedOrder.driverColor, width: '40px', height: '40px', fontSize: '0.78rem' }}>{trackedOrder.driverInitials}</div>
                    <div className="track-driver-info">
                      <strong>{trackedOrder.driverName}</strong>
                      <span>Active · {trackedOrder.route || trackedOrder.area} route</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <span className="label">ACTIONS</span>
                <div className="detail-actions">
                  <button className="btn btn-primary" onClick={() => handleTrack()}><RefreshCw size={16} /> REFRESH TRACKING</button>
                  <button className="btn btn-dark" onClick={() => navigate(`/delivery-orders/${trackedOrder.id}`)}><Eye size={16} /> VIEW FULL ORDER</button>
                  <button className="btn btn-outline" disabled><Download size={16} /> EXPORT / PRINT</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
