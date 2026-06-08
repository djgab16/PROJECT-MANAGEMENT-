import { useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Pencil, RefreshCw, Download, Trash2, Image, Clock, MapPin, Package, User, FileText, Calendar, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { DeliveryStatus, DeliveryOrder } from '../../types';
import './DeliveryOrderDetail.css';

export default function DeliveryOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees, deliveryOrders, updateDeliveryOrder, deleteDeliveryOrder, addActivityLog } = useData();
  const { user } = useAuth();

  const order = deliveryOrders.find(o => o.id === id);

  const steps: DeliveryStatus[] = ['Pending', 'In Transit', 'Delivered', 'Completed'];
  const currentStep = steps.indexOf(order?.status === 'Failed' ? 'In Transit' : (order?.status as DeliveryStatus) || 'Pending');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(employees.find(e => e.name === order?.driverName)?.id || 'EMP-003');
  const [redeliveryDate, setRedeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const drivers = employees.filter(e => e.role === 'DRIVER');

  if (!order) {
    return (
      <div className="page-content" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Order not found</h3>
        <p>The delivery order you are looking for does not exist or has been deleted.</p>
        <Link to="/delivery-orders" className="btn btn-primary" style={{ marginTop: '20px' }}>Back to Orders</Link>
      </div>
    );
  }

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeliveryDate) {
      setErrorMsg('Please select a re-delivery date.');
      return;
    }
    
    const selectedDate = new Date(redeliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setErrorMsg('Re-delivery date cannot be in the past.');
      return;
    }

    if (!selectedDriverId) {
      setErrorMsg('Please assign a driver.');
      return;
    }

    if (order.status !== 'Failed') {
      setErrorMsg('Re-delivery can only be scheduled for failed deliveries.');
      return;
    }

    const selectedDriver = employees.find(e => e.id === selectedDriverId);

    const updatePayload: Partial<DeliveryOrder> = {
      status: 'Pending',
      driverName: selectedDriver?.name || 'Test Driver',
      driverInitials: selectedDriver?.name ? selectedDriver.name.split(' ').map(n => n[0]).join('') : 'TD',
      driverColor: '#00A99D',
      expectedDelivery: new Date(redeliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      redeliveryScheduledDate: new Date(redeliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      redeliveryDriverId: selectedDriverId,
      redeliveryRemarks: remarks,
      redeliveryAttemptCount: (order.redeliveryAttemptCount || 0) + 1,
      lastUpdated: new Date().toLocaleString(),
      updatedBy: user?.name || 'System'
    };

    updateDeliveryOrder(order.id, updatePayload);

    addActivityLog({
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      userName: user?.name || 'System',
      userRole: user?.role || 'Staff',
      userInitials: user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'SY',
      userColor: '#4318FF',
      action: 'Update',
      description: `Scheduled re-delivery attempt #${(order.redeliveryAttemptCount || 0) + 1} for ${order.waybillNo} with driver ${selectedDriver?.name}`,
      reference: order.waybillNo
    });

    setIsModalOpen(false);
  };

  const handleUpdateStatus = () => {
    const nextStatusMap: Record<string, DeliveryStatus> = {
      'Pending': 'In Transit',
      'In Transit': 'Delivered',
      'Delivered': 'Completed',
      'Completed': 'Pending',
      'Failed': 'In Transit'
    };

    const nextStatus = nextStatusMap[order.status] || 'Pending';

    const updatePayload: Partial<DeliveryOrder> = {
      status: nextStatus,
      lastUpdated: new Date().toLocaleString(),
      updatedBy: user?.name || 'System'
    };

    if (nextStatus === 'Delivered' || nextStatus === 'Completed') {
      updatePayload.dateCompleted = new Date().toLocaleString();
    }

    updateDeliveryOrder(order.id, updatePayload);

    addActivityLog({
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      userName: user?.name || 'System',
      userRole: user?.role || 'Staff',
      userInitials: user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'SY',
      userColor: '#00A99D',
      action: 'Update',
      description: `Updated status of ${order.waybillNo} to ${nextStatus}`,
      reference: order.waybillNo
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      deleteDeliveryOrder(order.id);
      navigate('/delivery-orders');
    }
  };

  return (
    <>
      <Header
        title={`${order.waybillNo} — Order Detail`}
        subtitle="Delivery Orders"
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={
          <div className="flex gap-sm">
            <Link to={`/delivery-orders/${order.id}/edit`} className="btn btn-outline btn-sm"><Pencil size={14} /> Edit Order</Link>
            {order.status === 'Failed' ? (
              <button className="btn btn-primary btn-sm" id="schedule-redelivery-btn" onClick={() => setIsModalOpen(true)}><RefreshCw size={14} /> Schedule Re-delivery</button>
            ) : (
              <button className="btn btn-primary btn-sm" id="update-status-btn" onClick={handleUpdateStatus}><RefreshCw size={14} /> Update Status</button>
            )}
          </div>
        }
      />
      <div className="page-content">
        {/* Header Banner */}
        <div className="detail-banner">
          <div className="banner-left">
            <span className="banner-label">WAYBILL NUMBER</span>
            <h2 className="banner-waybill">{order.waybillNo}</h2>
            <span className="banner-date">{order.dateEncoded}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {order.priority && <StatusBadge status={order.priority} />}
            <StatusBadge status={order.status} />
          </div>
          <div className="detail-stepper">
            {steps.map((step, i) => (
              <div key={step} className={`stepper-item ${i <= currentStep ? 'stepper-done' : ''} ${i === currentStep ? 'stepper-current' : ''}`}>
                <div className="stepper-circle">
                  {i < currentStep ? '✓' : i === currentStep ? <Clock size={14} /> : i === 2 ? <FileText size={14} /> : <MapPin size={14} />}
                </div>
                <span className="stepper-label">{step.toUpperCase()}</span>
                {i === currentStep && <span className="stepper-time">{order.lastUpdated.split(',')[1] || 'Now'}</span>}
              </div>
            ))}
            <div className="stepper-line">
              <div className="stepper-line-fill" style={{ width: `${(Math.max(0, currentStep) / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="detail-grid">
          {/* Left Column - Info Cards */}
          <div className="detail-left">
            {/* Failed Delivery Details */}
            {order.status === 'Failed' && (
              <div className="card info-card" style={{ borderLeft: '4px solid var(--status-failed)' }}>
                <div className="info-card-header">
                  <AlertCircle size={18} className="info-icon red" style={{ color: 'var(--status-failed)' }} />
                  <h4 style={{ color: 'var(--status-failed)' }}>Failed Delivery Details</h4>
                </div>
                <div className="info-grid">
                  <div><span className="label">REASON FOR FAILURE</span><strong style={{ color: 'var(--status-failed)' }}>{order.failureReason || 'Not Specified'}</strong></div>
                  <div className="info-full"><span className="label">FAILURE REMARKS</span><strong>{order.failureRemarks || 'No remarks provided.'}</strong></div>
                </div>
              </div>
            )}

            {/* Order Info */}
            <div className="card info-card">
              <div className="info-card-header">
                <Package size={18} className="info-icon teal" />
                <h4>Order Information</h4>
              </div>
              <div className="info-grid">
                <div><span className="label">CLIENT / SENDER</span><strong>{order.clientName}</strong></div>
                <div><span className="label">CONTACT</span><strong>{order.contactNumber || 'N/A'}</strong></div>
                <div><span className="label">CLIENT TYPE</span><strong>{order.clientType || 'Standard'}</strong></div>
                <div className="info-full"><span className="label">SENDER ADDRESS</span><strong>{order.senderAddress}</strong></div>
              </div>
            </div>

            {/* Recipient Info */}
            <div className="card info-card">
              <div className="info-card-header">
                <User size={18} className="info-icon green" />
                <h4>Recipient Information</h4>
              </div>
              <div className="info-grid">
                <div><span className="label">RECIPIENT NAME</span><strong>{order.recipientName}</strong></div>
                <div><span className="label">CONTACT</span><strong>{order.recipientContact}</strong></div>
                <div><span className="label">AREA</span><strong>{order.area}</strong></div>
                <div className="info-full"><span className="label">DELIVERY ADDRESS</span><strong>{order.recipientAddress}</strong></div>
                {order.landmark && <div className="info-full"><span className="label">LANDMARK</span><strong>{order.landmark}</strong></div>}
              </div>
            </div>

            {/* Package Details */}
            <div className="card info-card">
              <div className="info-card-header">
                <Package size={18} className="info-icon orange" />
                <h4>Package Details</h4>
              </div>
              <div className="info-grid">
                <div><span className="label">DESCRIPTION</span><strong>{order.packageDescription || 'N/A'}</strong></div>
                <div><span className="label">ITEMS</span><strong>{order.itemCount}</strong></div>
                <div><span className="label">WEIGHT</span><strong>{order.weight}</strong></div>
                <div><span className="label">DECLARED VALUE</span><strong>{order.declaredValue}</strong></div>
                <div><span className="label">EXPECTED DELIVERY</span><strong>{order.expectedDelivery}</strong></div>
                {order.priority && <div><span className="label">PRIORITY</span><strong>{order.priority}</strong></div>}
                {order.specialInstructions && <div className="info-full"><span className="label">SPECIAL INSTRUCTIONS</span><strong>{order.specialInstructions}</strong></div>}
              </div>
            </div>

            {/* Assignment & Encoding */}
            <div className="card info-card">
              <div className="info-card-header">
                <User size={18} className="info-icon purple" />
                <h4>Assignment & Encoding</h4>
              </div>
              <div className="info-grid">
                <div>
                  <span className="label">ASSIGNED DRIVER</span>
                  {order.driverName ? (
                    <div className="driver-cell" style={{ marginTop: '4px' }}>
                      <div className="driver-avatar" style={{ background: order.driverColor }}>{order.driverInitials}</div>
                      <strong>{order.driverName}</strong>
                    </div>
                  ) : <strong className="text-muted">Unassigned</strong>}
                </div>
                <div><span className="label">ROUTE</span><strong>{order.route || order.area}</strong></div>
                <div><span className="label">ENCODED BY</span><strong>{order.encodedBy}</strong></div>
                <div><span className="label">DATE ENCODED</span><strong>{order.dateEncoded}</strong></div>
                <div><span className="label">LAST UPDATED</span><strong>{order.lastUpdated}</strong></div>
                <div><span className="label">UPDATED BY</span><strong>{order.updatedBy}</strong></div>
                {(order.status === 'Delivered' || order.status === 'Completed') && order.dateCompleted && (
                  <div className="info-full"><span className="label">DATE COMPLETED</span><strong style={{ color: 'var(--status-active)' }}>{order.dateCompleted}</strong></div>
                )}
                {order.redeliveryAttemptCount && order.redeliveryAttemptCount > 0 ? (
                  <>
                    <div><span className="label">RE-DELIVERY ATTEMPTS</span><strong style={{ color: 'var(--status-failed)' }}>{order.redeliveryAttemptCount} attempt(s)</strong></div>
                    <div><span className="label">SCHEDULED REDELIVERY</span><strong>{order.redeliveryScheduledDate}</strong></div>
                    {order.redeliveryRemarks && (
                      <div className="info-full"><span className="label">REDELIVERY REMARKS</span><strong>{order.redeliveryRemarks}</strong></div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="detail-right">
            {/* Proof of Transaction */}
            <div className="card">
              <div className="info-card-header">
                <FileText size={18} />
                <h4>Proof of Transaction (Receipt)</h4>
              </div>
              <div className="pot-placeholder" style={order.potImage ? { padding: '10px' } : undefined}>
                {order.potImage ? (
                  <img src={order.potImage} alt="Proof of Transaction" style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'contain' }} />
                ) : (
                  <>
                    <Image size={40} color="var(--text-secondary)" />
                    <p>{order.potStatus === 'Submitted' ? 'Proof of Transaction Attached' : 'No receipt submitted yet'}</p>
                  </>
                )}
              </div>
              <div className="pot-fields">
                <div className="pot-field" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span>{order.potStatus}</span></div>
              </div>
            </div>

            {/* Proof of Delivery */}
            <div className="card">
              <div className="info-card-header">
                <FileText size={18} />
                <h4>Proof of Delivery</h4>
              </div>
              <div className="pot-placeholder" style={order.podImage ? { padding: '10px' } : undefined}>
                {order.podImage ? (
                  <img src={order.podImage} alt="Proof of Delivery" style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'contain' }} />
                ) : (
                  <>
                    <Image size={40} color="var(--text-secondary)" />
                    <p>{order.podStatus === 'Submitted' ? 'Proof of Delivery Attached' : 'No POD submitted yet'}</p>
                  </>
                )}
              </div>
              <div className="pot-fields">
                <div className="pot-field" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Recipient Name</span><span>{order.recipientName}</span></div>
                <div className="pot-field" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span>{order.podStatus || 'Not Submitted'}</span></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <span className="label">QUICK ACTIONS</span>
              <div className="detail-actions">
                {order.status === 'Failed' ? (
                  <button className="btn btn-primary" id="schedule-redelivery-quick-btn" onClick={() => setIsModalOpen(true)}><RefreshCw size={16} /> SCHEDULE RE-DELIVERY</button>
                ) : (
                  <button className="btn btn-primary" onClick={handleUpdateStatus}><RefreshCw size={16} /> UPDATE STATUS</button>
                )}
                <Link to={`/delivery-orders/${order.id}/edit`} className="btn btn-outline"><Pencil size={16} /> EDIT ORDER</Link>
                <button className="btn btn-outline" disabled><Download size={16} /> EXPORT AS PDF</button>
                <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={16} /> DELETE ORDER</button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="card">
              <h4>Order Summary</h4>
              <div className="summary-fields">
                <div className="summary-field"><span>Waybill No.</span><span className="summary-val teal">{order.waybillNo}</span></div>
                <div className="summary-field"><span>Current Status</span><StatusBadge status={order.status} size="sm" /></div>
                <div className="summary-field"><span>Expected Delivery</span><span>{order.expectedDelivery}</span></div>
                {order.dateCompleted && (
                  <div className="summary-field"><span>Date Completed</span><span className="summary-val" style={{ color: 'var(--status-active)' }}>{order.dateCompleted}</span></div>
                )}
                <div className="summary-field"><span>POT Status</span><span className="summary-val" style={{ color: order.potStatus === 'Not Submitted' ? 'var(--status-failed)' : 'var(--status-active)' }}>{order.potStatus}</span></div>
                <div className="summary-field"><span>POD Status</span><span className="summary-val" style={{ color: (!order.podStatus || order.podStatus === 'Not Submitted') ? 'var(--status-failed)' : 'var(--status-active)' }}>{order.podStatus || 'Not Submitted'}</span></div>
              </div>
            </div>

            {/* QR Code */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h4>Waybill QR Code</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Scan this code to instantly retrieve tracking details.</p>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E9EDF7', display: 'inline-block' }}>
                <QRCodeSVG value={order.waybillNo} size={150} level="H" includeMargin={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setErrorMsg('');
        }}
        title="Schedule Re-delivery Attempt"
        size="md"
        footer={
          <div className="flex gap-sm justify-end" style={{ width: '100%' }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setIsModalOpen(false); setErrorMsg(''); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleScheduleSubmit}>Schedule Re-delivery</button>
          </div>
        }
      >
        <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div style={{ color: 'var(--status-failed)', background: 'var(--status-failed-bg)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>⚠️</span>
              <strong>{errorMsg}</strong>
            </div>
          )}
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ASSIGN REDELIVERY COURIER / DRIVER *</label>
            <select
              className="filter-select"
              style={{ width: '100%', height: '40px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', fontSize: '0.85rem' }}
              value={selectedDriverId}
              onChange={e => {
                setSelectedDriverId(e.target.value);
                setErrorMsg('');
              }}
            >
              <option value="">Select a Driver</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              SCHEDULED DATE * 
              <span style={{ fontWeight: 500, color: 'var(--primary)', marginLeft: '8px', fontSize: '0.72rem', background: 'var(--status-transit-bg)', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={10} /> Click field to open calendar
              </span>
            </label>
            <div 
              style={{ position: 'relative', cursor: 'pointer' }}
              title="Click anywhere here to open the calendar date picker"
              onClick={(e) => {
                if (e.target !== dateInputRef.current) {
                  try {
                    dateInputRef.current?.showPicker();
                  } catch (err) {
                    console.warn('Native date picker trigger failed:', err);
                  }
                }
              }}
            >
              <input
                ref={dateInputRef}
                type="date"
                className="filter-select"
                style={{ width: '100%', height: '40px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px 0 40px', fontSize: '0.85rem', cursor: 'pointer' }}
                value={redeliveryDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  setRedeliveryDate(e.target.value);
                  setErrorMsg('');
                }}
              />
              <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>REMARKS / SPECIAL INSTRUCTIONS</label>
            <textarea
              className="form-input form-textarea"
              style={{ width: '100%', minHeight: '80px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem' }}
              placeholder="Provide context or instructions for this re-delivery attempt..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
