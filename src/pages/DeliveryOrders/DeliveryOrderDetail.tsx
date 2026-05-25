import { Link, useParams, useNavigate } from 'react-router-dom';
import { Pencil, RefreshCw, Download, Trash2, Image, Clock, MapPin, Package, User, FileText } from 'lucide-react';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { DeliveryStatus, DeliveryOrder } from '../../types';
import './DeliveryOrderDetail.css';

export default function DeliveryOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveryOrders, updateDeliveryOrder, deleteDeliveryOrder, addActivityLog } = useData();
  const { user } = useAuth();

  const order = deliveryOrders.find(o => o.id === id);

  if (!order) {
    return (
      <div className="page-content" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Order not found</h3>
        <p>The delivery order you are looking for does not exist or has been deleted.</p>
        <Link to="/delivery-orders" className="btn btn-primary" style={{ marginTop: '20px' }}>Back to Orders</Link>
      </div>
    );
  }

  const steps: DeliveryStatus[] = ['Pending', 'In Transit', 'Delivered', 'Completed'];
  const currentStep = steps.indexOf(order.status === 'Failed' ? 'In Transit' : order.status as DeliveryStatus);

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
            <button className="btn btn-primary btn-sm" id="update-status-btn" onClick={handleUpdateStatus}><RefreshCw size={14} /> Update Status</button>
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
          <StatusBadge status={order.status} />
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
                <button className="btn btn-primary" onClick={handleUpdateStatus}><RefreshCw size={16} /> UPDATE STATUS</button>
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
          </div>
        </div>
      </div>
    </>
  );
}
