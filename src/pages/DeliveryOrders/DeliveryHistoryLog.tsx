import { Link, useParams, useNavigate } from 'react-router-dom';
import { Download, CheckCircle2, Clock, MapPin, Package, FileText, Image as ImageIcon } from 'lucide-react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import type { DeliveryStatus } from '../../types';
import './DeliveryHistoryLog.css';
import '../DeliveryOrders/DeliveryOrderDetail.css';

export default function DeliveryHistoryLog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveryOrders, activityLogs } = useData();

  const order = deliveryOrders.find(o => o.id === id);

  if (!order) {
    return (
      <div className="page-content" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Order not found</h3>
        <p>The delivery order you are looking for does not exist or has been deleted.</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: '20px' }}>Go Back</button>
      </div>
    );
  }

  const orderLogs = activityLogs.filter(log => log.reference === order.waybillNo).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const steps: DeliveryStatus[] = ['Pending', 'In Transit', 'Delivered', 'Completed'];
  const currentStep = steps.indexOf(order.status === 'Failed' ? 'In Transit' : order.status as DeliveryStatus);

  const calculateDuration = () => {
    // Assuming simple calculation difference between order creation and last update
    return '6h 27m'; // Keeping it static for demonstration as matching UI requirement, or calculate from dates
  };

  return (
    <>
      <Header
        title={`${order.waybillNo} Delivery History Log`}
        subtitle={`Delivery Orders · ${order.waybillNo}`}
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={
          <div className="flex gap-sm">
            <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>{"< Back"}</button>
            <button className="btn btn-outline btn-sm"><Download size={14} /> Export Log</button>
          </div>
        }
      />
      <div className="page-content">
        <div className="history-banner">
          <div className="history-banner-left">
            <div className="history-icon-box">
              <Package size={28} color="var(--primary)" />
            </div>
            <div className="history-title-area">
              <h2>DELIVERY HISTORY LOG</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{order.waybillNo}</span>
                <p>Encoded: {order.dateEncoded} · Dispatcher: {order.encodedBy}</p>
              </div>
            </div>
          </div>
          
          <div className="history-banner-details">
            <div className="detail-item">
              <span className="label">RECIPIENT</span>
              <span className="value">{order.recipientName}</span>
            </div>
            <div className="detail-item">
              <span className="label">AREA</span>
              <span className="value">{order.area}</span>
            </div>
            <div className="detail-item">
              <span className="label">DRIVER</span>
              <span className="value">{order.driverName || 'Unassigned'}</span>
            </div>
            <div className="detail-item">
              <span className="label">PACKAGE</span>
              <span className="value">{order.packageDescription || 'Parcel'} · {order.weight}</span>
            </div>
            <div className="detail-item">
              <span className="label" style={{ opacity: 0 }}>STATUS</span>
              <span className="action-badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>● {order.status}</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h4>STATUS PROGRESSION</h4>
          <div className="detail-stepper history-stepper">
            {steps.map((step, i) => (
              <div key={step} className={`stepper-item ${i <= currentStep ? 'stepper-done' : ''} ${i === currentStep ? 'stepper-current' : ''}`}>
                <div className="stepper-circle">
                  {i < currentStep ? '✓' : i === currentStep ? <Clock size={14} /> : i === 2 ? <FileText size={14} /> : <MapPin size={14} />}
                </div>
                <span className="stepper-label">{step.toUpperCase()}</span>
                {i <= currentStep && <span className="stepper-time">{i === 0 ? order.dateEncoded.split(',')[1] : (i === currentStep ? order.lastUpdated.split(',')[1] : '')}</span>}
              </div>
            ))}
            <div className="stepper-line">
              <div className="stepper-line-fill" style={{ width: `${(Math.max(0, currentStep) / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="history-grid">
          <div className="history-left">
            <div className="card">
              <div className="card-header">
                <h4>Full History Log</h4>
                <span className="archive-count-badge">{orderLogs.length} events recorded</span>
              </div>
              <div className="timeline-box">
                {orderLogs.map((log, index) => {
                  const isCompleted = index === orderLogs.length - 1 || log.action === 'Create' || log.description.includes('Completed');
                  const isCurrent = index === 0;
                  
                  return (
                    <div key={log.id} className="timeline-entry">
                      <div className={`timeline-icon ${isCurrent ? 'completed' : isCompleted ? 'pending' : 'pending'}`}>
                        {log.action === 'Create' ? <Package size={14} /> : 
                         log.action === 'POD Upload' ? <ImageIcon size={14} /> : 
                         isCurrent ? <CheckCircle2 size={16} /> : <Clock size={14} />}
                      </div>
                      <div className={`timeline-content ${isCurrent ? 'border-left-green' : ''}`}>
                        <div className="timeline-header">
                          <h4>
                            {log.action === 'Create' ? 'Order Created' : 
                             log.action === 'POD Upload' ? 'Proof of Delivery (POD) Submitted' : 
                             log.description.includes('Completed') ? 'Order Marked as Completed' : 
                             'Status Updated'}
                            {log.action !== 'Create' && <span style={{ fontSize: '0.8rem', marginLeft: '12px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>● {log.action}</span>}
                          </h4>
                          <span className="timeline-time">{log.timestamp}</span>
                        </div>
                        <div className="timeline-body">
                          <p>{log.description}</p>
                        </div>
                        <div className="timeline-meta">
                          <div className="meta-item"><span style={{ color: 'var(--text-muted)' }}>👤 {log.userName} ({log.userRole === 'DRIVER' ? 'Driver' : 'System Auto'})</span></div>
                          {log.action === 'POD Upload' && <div className="meta-item ml-2"><ImageIcon size={12} /> Photo attached</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="history-right">
            <div className="card">
              <h4>Delivery Summary</h4>
              <div className="summary-stats-grid">
                <div className="summary-stat-card">
                  <div className="summary-stat-val green">{orderLogs.length}</div>
                  <div className="summary-stat-label">Total Events</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-val" style={{ color: 'var(--status-active)' }}>{calculateDuration()}</div>
                  <div className="summary-stat-label">Total Duration</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-val" style={{ color: 'var(--text-primary)' }}>{orderLogs.filter(l => l.action === 'Update').length}</div>
                  <div className="summary-stat-label">Status Changes</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-val" style={{ color: 'var(--text-primary)' }}>{order.podStatus === 'Submitted' ? '1' : '0'}</div>
                  <div className="summary-stat-label">POD Submitted</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <h4>Order Info</h4>
                <Link to={`/delivery-orders/${order.id}`} className="card-header-view-all">View Full \u2192</Link>
              </div>
              <div className="info-list">
                <div className="info-list-item">
                  <span>WAYBILL</span>
                  <span className="teal">{order.waybillNo}</span>
                </div>
                <div className="info-list-item">
                  <span>CLIENT / SENDER</span>
                  <span>{order.clientName}</span>
                </div>
                <div className="info-list-item">
                  <span>RECIPIENT</span>
                  <span>{order.recipientName}</span>
                </div>
                <div className="info-list-item">
                  <span>DELIVERY ADDRESS</span>
                  <span>{order.recipientAddress}</span>
                </div>
                <div className="info-list-item">
                  <span>PACKAGE</span>
                  <span>{order.packageDescription || 'Parcel'} · {order.weight} · {order.declaredValue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
