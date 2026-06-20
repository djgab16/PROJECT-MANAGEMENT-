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
import { downloadWaybillPdfBlob, restoreDeliveryOrder, scheduleRedelivery } from '../../api/deliveryApi';
import './DeliveryOrderDetail.css';

export default function DeliveryOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees, deliveryOrders, updateDeliveryOrder, deleteDeliveryOrder, refreshOrders, addActivityLog } = useData();
  const { user } = useAuth();

  const order = deliveryOrders.find(o => o.id === id);

  const isPickup = order?.taskType === 'Pickup';
  const steps: string[] = isPickup
    ? ['Pending', 'Processing', 'Preparing', 'Ready for Pickup', 'Picked Up']
    : ['Pending', 'Processing', 'Assigned', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];

  const getStepIndex = (status: string) => {
    if (status === 'Failed') {
      return isPickup ? 2 : 4; // Preparing or In Transit
    }
    if (status === 'Cancelled') {
      return -1;
    }
    if (isPickup) {
      if (status === 'Completed' || status === 'Picked Up') return 4;
      return steps.indexOf(status);
    } else {
      if (status === 'Completed' || status === 'Delivered') return 6;
      return steps.indexOf(status);
    }
  };

  const currentStep = order ? getStepIndex(order.status) : -1;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Please contact our support team.');
  const [selectedDriverId, setSelectedDriverId] = useState(() => {
    const matched = employees.find(e => e.name === order?.driverName);
    if (matched) return matched.id;
    const testDriver = employees.find(e => e.employeeId === 'EMP-003');
    return testDriver?.id || '3';
  });
  const [redeliveryDate, setRedeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!redeliveryDate) {
      setErrorMsg('Please select a re-delivery date.');
      return;
    }

    const selectedDate = new Date(redeliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate <= today) {
      setErrorMsg('Re-delivery date must be at least tomorrow.');
      return;
    }

    if (!selectedDriverId) {
      setErrorMsg('Please assign a driver.');
      return;
    }

    if (order.status !== 'Failed' && order.status !== 'Cancelled') {
      setErrorMsg('Re-delivery can only be scheduled for failed or cancelled deliveries.');
      return;
    }

    const selectedDriver = employees.find(e => e.id === selectedDriverId);

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      // Use the dedicated schedule-redelivery endpoint — avoids full ValidateOrderDetails
      await scheduleRedelivery(
        Number(order.id),
        new Date(redeliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        Number(selectedDriverId),
        remarks
      );

      await addActivityLog({
        action: 'Update',
        description: `Scheduled re-delivery attempt #${(order.redeliveryAttemptCount || 0) + 1} for ${order.waybillNo} with driver ${selectedDriver?.name || 'Unassigned'}`,
        reference: order.waybillNo
      });

      await refreshOrders();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to schedule re-delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectReschedule = () => {
    setShowRejectPrompt(true);
  };

  const confirmReject = async () => {
    if (isSubmitting) return;
    const updatePayload: Partial<DeliveryOrder> = {
      redeliveryStatus: 'Rejected',
      redeliveryRemarks: rejectionReason,
      lastUpdated: new Date().toLocaleString(),
      updatedBy: user?.name || 'System'
    };

    try {
      setIsSubmitting(true);
      await updateDeliveryOrder(order.id, updatePayload);

      setShowRejectPrompt(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to reject request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmRestore = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await restoreDeliveryOrder(Number(order.id));
      await refreshOrders();
      setShowRestoreConfirm(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to restore order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (isSubmitting) return;
    const nextStatusMap: Record<string, DeliveryStatus> = isPickup
      ? {
        'Pending': 'Processing',
        'Processing': 'Preparing',
        'Preparing': 'Ready for Pickup',
        'Ready for Pickup': 'Picked Up',
        'Picked Up': 'Pending',
        'Failed': 'Processing'
      }
      : {
        'Pending': 'Processing',
        'Processing': 'Assigned',
        'Assigned': 'Picked Up',
        'Picked Up': 'In Transit',
        'In Transit': 'Out for Delivery',
        'Out for Delivery': 'Delivered',
        'Delivered': 'Completed',
        'Completed': 'Pending',
        'Failed': 'In Transit'
      };

    const nextStatus = nextStatusMap[order.status] || 'Pending';

    if (!isPickup && nextStatus === 'Assigned' && !order.driverName) {
      alert("Please edit the order to assign a courier/driver before transitioning to the 'Assigned' state.");
      return;
    }

    const updatePayload: Partial<DeliveryOrder> = {
      status: nextStatus,
      lastUpdated: new Date().toLocaleString(),
      updatedBy: user?.name || 'System'
    };

    if (nextStatus === 'Delivered' || nextStatus === 'Completed' || nextStatus === 'Picked Up') {
      updatePayload.dateCompleted = new Date().toLocaleString();
    }

    try {
      setIsSubmitting(true);
      await updateDeliveryOrder(order.id, updatePayload);

      await addActivityLog({
        action: 'Update',
        description: `Updated status of ${order.waybillNo} to ${nextStatus}`,
        reference: order.waybillNo
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await deleteDeliveryOrder(order.id);
      await addActivityLog({
        action: 'Delete',
        description: `Cancelled delivery order ${order.waybillNo}`,
        reference: order.waybillNo,
      });
      navigate('/delivery-orders');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Header
        showBack
        title={`${order.waybillNo} — Order Detail`}
        subtitle="Delivery Orders"
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
            {/* Pending Re-delivery Reschedule Request Review */}
            {order.redeliveryStatus === 'Pending Approval' && (
              <div className="card info-card animate-fade-in" style={{ borderLeft: '4px solid var(--primary)', background: 'var(--status-transit-bg)', padding: '20px' }}>
                <div className="info-card-header" style={{ marginBottom: '12px' }}>
                  <RefreshCw size={18} className="info-icon purple" style={{ color: 'var(--primary)' }} />
                  <h4 style={{ color: 'var(--primary)', fontWeight: 600 }}>Pending Re-delivery Reschedule Request</h4>
                </div>
                <div className="info-grid">
                  <div>
                    <span className="label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CLIENT REQUESTED DATE</span>
                    <strong style={{ fontSize: '0.95rem' }}>{order.redeliveryRequestedDate || 'Not specified'}</strong>
                  </div>
                  <div className="info-full" style={{ marginTop: '8px' }}>
                    <span className="label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CLIENT REMARKS / REASON</span>
                    <strong style={{ display: 'block', padding: '10px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', marginTop: '4px', fontWeight: 500, color: 'var(--text-main)' }}>
                      {order.redeliveryRemarks || 'No remarks provided.'}
                    </strong>
                  </div>
                  <div className="info-full" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
                    {(order.redeliveryAttemptCount || 0) >= 3 ? (
                      <span className="locked-tag animate-fade-in" style={{ background: 'var(--status-failed-bg)', color: 'var(--status-failed)', borderColor: 'var(--status-failed)', fontWeight: 600 }}>⚠️ Max attempts reached (Cannot Approve)</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          if (order.redeliveryRequestedDate) {
                            try {
                              const parsedDate = new Date(order.redeliveryRequestedDate);
                              if (!isNaN(parsedDate.getTime())) {
                                setRedeliveryDate(parsedDate.toISOString().split('T')[0]);
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          setRemarks(order.redeliveryRemarks || '');
                          setIsModalOpen(true);
                        }}
                      >
                        ✓ Approve & Assign Driver
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleRejectReschedule}
                    >
                      ✗ Reject Request
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                {order.clientType === 'Corporate' && order.contactPerson && (
                  <div><span className="label">CONTACT PERSON</span><strong>{order.contactPerson}</strong></div>
                )}
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
                <div><span className="label">PACKAGE TYPE</span><strong>{order.packageType || 'Parcel'}</strong></div>
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
                  {isPickup ? (
                    <strong className="text-muted" style={{ display: 'block', marginTop: '4px' }}>Not Applicable (Office Pickup)</strong>
                  ) : order.driverName ? (
                    <div className="driver-cell" style={{ marginTop: '4px' }}>
                      <div className="driver-avatar" style={{ background: order.driverColor }}>{order.driverInitials}</div>
                      <strong>{order.driverName}</strong>
                    </div>
                  ) : <strong className="text-muted" style={{ display: 'block', marginTop: '4px' }}>Unassigned</strong>}
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
                <h4>Proof of Billing / Sender Receipt (POT)</h4>
              </div>
              <div className="pot-placeholder" style={order.potImage ? { padding: '10px' } : undefined}>
                {order.potImage ? (
                  <img src={order.potImage} alt="Proof of Billing / Sender Receipt" style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'contain' }} />
                ) : (
                  <>
                    <Image size={40} color="var(--text-secondary)" />
                    <p>{order.potStatus === 'Submitted' ? 'Sender Receipt Attached' : 'No payment/sender receipt attached'}</p>
                  </>
                )}
              </div>
              <div className="pot-fields">
                <div className="pot-field" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span>{order.potStatus}</span></div>
              </div>
            </div>

            {/* Proof of Delivery */}
            {!isPickup && (
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
            )}

            {/* Quick Actions */}
            <div className="card">
              <span className="label">QUICK ACTIONS</span>
              <div className="detail-actions">
                {order.isArchived ? (
                  <button
                    className="btn btn-primary"
                    disabled={isSubmitting}
                    onClick={() => setShowRestoreConfirm(true)}
                  >
                    <RefreshCw size={16} /> RESTORE ORDER
                  </button>
                ) : (
                  <>
                    {['Failed', 'Cancelled'].includes(order.status) ? (
                      (order.redeliveryAttemptCount || 0) >= 3 ? (
                        <div style={{ padding: '10px 14px', background: 'var(--status-failed-bg)', borderRadius: '8px', color: 'var(--status-failed)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>⚠️</span> Max attempts reached (Returned to sender)
                        </div>
                      ) : (
                        <button className="btn btn-primary" id="schedule-redelivery-quick-btn" disabled={isSubmitting} onClick={() => setIsModalOpen(true)}><RefreshCw size={16} /> SCHEDULE RE-DELIVERY</button>
                      )
                    ) : (
                      <button className="btn btn-primary" disabled={isSubmitting} onClick={handleUpdateStatus}><RefreshCw size={16} /> UPDATE STATUS</button>
                    )}
                    {!(order.status === 'In Transit' || order.status === 'Out for Delivery') && (
                      <Link to={`/delivery-orders/${order.id}/edit`} className="btn btn-outline" style={isSubmitting ? { pointerEvents: 'none', opacity: 0.6 } : undefined}><Pencil size={16} /> EDIT ORDER</Link>
                    )}
                  </>
                )}
                <Link to={`/delivery-orders/${order.id}/history`} className="btn btn-outline"><Clock size={16} /> VIEW HISTORY LOG</Link>
                <button
                  className="btn btn-outline"
                  disabled={isSubmitting}
                  onClick={async () => {
                    try {
                      const blob = await downloadWaybillPdfBlob(Number(order.id));
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Waybill-${order.waybillNo}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("Failed to download waybill PDF", err);
                      alert("Failed to download waybill PDF.");
                    }
                  }}
                >
                  <Download size={16} /> EXPORT AS PDF
                </button>
                {!(order.status === 'In Transit' || order.status === 'Out for Delivery') && (
                  <button className="btn btn-danger" disabled={isSubmitting} onClick={() => setShowDeleteConfirm(true)}><Trash2 size={16} /> CANCEL ORDER</button>
                )}
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
                {!isPickup && (
                  <div className="summary-field"><span>POD Status</span><span className="summary-val" style={{ color: (!order.podStatus || order.podStatus === 'Not Submitted') ? 'var(--status-failed)' : 'var(--status-active)' }}>{order.podStatus || 'Not Submitted'}</span></div>
                )}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !isSubmitting && setShowDeleteConfirm(false)}
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
            <AlertCircle size={20} style={{ color: 'var(--status-failed)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--status-failed)', marginBottom: '4px' }}>
                Cancel order {order.waybillNo}?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This will cancel the order and archive it. It will remain visible in the orders list for 3 days before moving to Archive only. This cannot be undone without a restore.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={isSubmitting}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Keep Order
            </button>
            <button
              className="btn btn-danger btn-sm"
              disabled={isSubmitting}
              onClick={handleDelete}
            >
              {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Order'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setErrorMsg('');
        }} title="Schedule Re-delivery Attempt"
        size="md"
        footer={
          <div className="flex gap-sm justify-end" style={{ width: '100%' }}>
            <button className="btn btn-outline btn-sm" disabled={isSubmitting} onClick={() => { setIsModalOpen(false); setErrorMsg(''); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={isSubmitting} onClick={handleScheduleSubmit}>Schedule Re-delivery</button>
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
                min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
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

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreConfirm}
        onClose={() => !isSubmitting && setShowRestoreConfirm(false)}
        title="Restore Archived Order"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--status-transit-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
            <RefreshCw size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>Restore waybill {order.waybillNo}?</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>This will restore the order to the active list and reset its status to Pending.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" disabled={isSubmitting} onClick={() => setShowRestoreConfirm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={isSubmitting} onClick={confirmRestore}>{isSubmitting ? 'Restoring...' : 'Yes, Restore Order'}</button>
          </div>
        </div>
      </Modal>

      {/* Reject Reschedule Modal */}
      <Modal
        isOpen={showRejectPrompt}
        onClose={() => !isSubmitting && setShowRejectPrompt(false)}
        title="Reject Reschedule Request"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Are you sure you want to reject the client's reschedule request for waybill <strong>{order.waybillNo}</strong>?</p>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>REJECTION REASON / REMARKS</label>
            <textarea
              className="form-input form-textarea"
              style={{ width: '100%', minHeight: '100px' }}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please contact our support team to discuss this further."
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" disabled={isSubmitting} onClick={() => setShowRejectPrompt(false)}>Cancel</button>
            <button className="btn btn-danger btn-sm" disabled={isSubmitting} onClick={confirmReject}>{isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
