import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, User, Phone, Navigation, CheckCircle, XCircle, AlertCircle, FileText, Radio, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import PODModal from './components/PODModal';
import FailureModal from './components/FailureModal';
import Modal from '../../components/ui/Modal';
import { useDriverGPS } from '../../hooks/useDriverGPS';
import { realtimeSync } from '../../utils/realtimeSync';
import './DriverDeliveryDetail.css';

export default function DriverDeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveryOrders, updateDeliveryOrder, activityLogs } = useData();

  const order = deliveryOrders.find(o => o.id === id);
  const [showPODModal, setShowPODModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Continuous GPS watch tracking
  const { isTracking, gpsError } = useDriverGPS(order, updateDeliveryOrder);

  if (!order) return <div style={{ padding: '20px', textAlign: 'center' }}>Delivery not found</div>;

  // Reusable GPS function
  const withLocation = (callback: (coords: { lat: number; lng: number } | null) => Promise<void> | void) => {
    setIsUpdating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      Promise.resolve(callback(null)).then(() => setIsUpdating(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        try {
          await callback(coords);
        } catch (err) {
          console.error("Callback error", err);
        } finally {
          setIsUpdating(false);
        }
      },
      async (error) => {
        console.error("Error obtaining location", error);
        toast.warning("Could not get location. Proceeding without GPS tag.");
        try {
          await callback(null);
        } catch (err) {
          console.error("Callback error", err);
        } finally {
          setIsUpdating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleConfirmPickup = () => {
    setConfirmAction({
      title: 'Confirm Pickup',
      message: `Are you sure you want to confirm pickup for order ${order.waybillNo}?`,
      onConfirm: () => {
        withLocation(async (coords) => {
          try {
            await updateDeliveryOrder(order.id, {
              status: 'Picked Up',
              gpsCoordinates: coords || undefined
            });
            toast.success("Order picked up successfully");
          } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || "Failed to confirm pickup.");
          }
        });
      }
    });
    setShowConfirmModal(true);
  };

  const handleStartTransit = () => {
    setConfirmAction({
      title: 'Start Transit',
      message: `Are you sure you want to start transit for order ${order.waybillNo}?`,
      onConfirm: () => {
        withLocation(async (coords) => {
          try {
            await updateDeliveryOrder(order.id, {
              status: 'In Transit',
              gpsCoordinates: coords || undefined
            });
            toast.success("Transit started");
          } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || "Failed to start transit.");
          }
        });
      }
    });
    setShowConfirmModal(true);
  };

  const handleOutForDelivery = () => {
    setConfirmAction({
      title: 'Out for Delivery',
      message: `Are you sure you want to mark order ${order.waybillNo} as Out for Delivery?`,
      onConfirm: () => {
        withLocation(async (coords) => {
          try {
            await updateDeliveryOrder(order.id, {
              status: 'Out for Delivery',
              gpsCoordinates: coords || undefined
            });
            toast.success("Order is now out for delivery");
          } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || "Failed to mark Out for Delivery.");
          }
        });
      }
    });
    setShowConfirmModal(true);
  };

  const handlePODSubmit = (data: { podImage: string; recipientName: string }) => {
    withLocation(async (coords) => {
      try {
        await updateDeliveryOrder(order.id, {
          status: 'Delivered',
          podStatus: 'Submitted',
          podImage: data.podImage,
          recipientName: data.recipientName,
          dateCompleted: new Date().toLocaleString(),
          gpsCoordinates: coords || undefined
        });
        toast.success("Delivery completed successfully");
        setShowPODModal(false);
        navigate('/driver/dashboard');
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || err.message || "Failed to submit POD.");
      }
    });
  };

  const handleFailureSubmit = (data: { reason: string; remarks: string }) => {
    withLocation(async (coords) => {
      try {
        await updateDeliveryOrder(order.id, {
          status: 'Failed',
          failureReason: data.reason,
          failureRemarks: data.remarks,
          gpsCoordinates: coords || undefined
        });
        toast.error("Delivery marked as failed");
        setShowFailureModal(false);
        navigate('/driver/dashboard');
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || err.message || "Failed to record failure.");
      }
    });
  };

  return (
    <div className="driver-delivery-detail">
      {isTracking && (
        <div className="live-gps-streaming-badge" style={{ background: 'var(--status-active-bg)', border: '1px solid var(--status-active)', padding: '10px 14px', borderRadius: '10px', color: 'var(--status-active)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0, 169, 157, 0.08)' }}>
          <span className="pulse-dot-live" style={{ width: '8px', height: '8px', background: 'var(--status-active)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px var(--status-active)', animation: 'dot-pulse 1.5s infinite alternate' }} />
          <Radio size={16} /> Live GPS Tracking is ACTIVE. Your movement is streamed to client.
        </div>
      )}
      {gpsError && (
        <div style={{ background: 'var(--status-failed-bg)', border: '1px solid var(--status-failed)', padding: '10px 14px', borderRadius: '10px', color: 'var(--status-failed)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={16} /> {gpsError}
        </div>
      )}

      <div className="detail-header-card">
        <div className="detail-header-top">
          <span className="waybill-no-large">{order.waybillNo}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {order.priority && <StatusBadge status={order.priority} size="sm" />}
            <StatusBadge status={order.status} size="sm" />
          </div>
        </div>
        <p className="package-desc">{order.packageDescription || order.packageType} • {order.weight}</p>
      </div>

      <div className="detail-section">
        <h3>Delivery Information</h3>
        <div className="info-list">
          <div className="info-item">
            <User className="info-icon" />
            <div className="info-text">
              <span className="label">Recipient Name</span>
              <span className="value">{order.recipientName}</span>
            </div>
          </div>
          <div className="info-item">
            <Phone className="info-icon" />
            <div className="info-text">
              <span className="label">Contact Number</span>
              <span className="value">
                <a href={`tel:${order.recipientContact}`}>{order.recipientContact}</a>
              </span>
            </div>
          </div>
          <div className="info-item align-top">
            <MapPin className="info-icon" style={{ marginTop: '4px' }} />
            <div className="info-text">
              <span className="label">Delivery Address</span>
              <span className="value address-block">{order.recipientAddress}</span>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.recipientAddress)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}
              >
                <ExternalLink size={12} /> View on Google Maps
              </a>
            </div>
          </div>
          {order.specialInstructions && (
            <div className="info-item align-top alert-item">
              <FileText className="info-icon alert-icon" style={{ marginTop: '4px' }} />
              <div className="info-text">
                <span className="label alert-label">Special Instructions</span>
                <span className="value alert-value">{order.specialInstructions}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {order.podImage && (
        <div className="detail-section" style={{ marginTop: '16px' }}>
          <h3>Proof of Delivery</h3>
          <div className="pot-preview-container" style={{ marginTop: '12px', background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <img 
              src={order.podImage} 
              alt="Proof of Delivery" 
              style={{ width: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'contain' }} 
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Received by:</span>
              <span style={{ fontWeight: '600' }}>{order.recipientName}</span>
            </div>
            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Delivered at:</span>
              <span style={{ fontWeight: '500' }}>{order.dateCompleted || 'Completed'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox Geolocation Simulator - Professionalized */}
      {order.status === 'In Transit' && (
        <div className="detail-section sandbox-section" style={{ background: 'var(--bg-main)', border: '1px dashed var(--border)', marginTop: '16px', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', animation: 'dot-pulse 1.5s infinite alternate' }} />
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Route Progress Simulator</h3>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
            Simulate your position along the route. This updates the customer tracking map in real-time.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span>Origin</span>
              <span>Destination ({order.area})</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="0"
              onChange={(e) => {
                const pct = Number(e.target.value) / 100;
                const startLat = 14.6200;
                const startLng = 121.0180;
                const endLat = order.recipientCoordinates?.lat || 14.6360;
                const endLng = order.recipientCoordinates?.lng || 121.0336;

                const simulatedLat = startLat + (endLat - startLat) * pct;
                const simulatedLng = startLng + (endLng - startLng) * pct;
                const timestampStr = new Date().toLocaleString();

                // Update local context
                updateDeliveryOrder(order.id, {
                  liveCoordinates: {
                    lat: simulatedLat,
                    lng: simulatedLng,
                    lastUpdated: timestampStr
                  }
                });

                // Publish WebSocket broadcast
                realtimeSync.publish({
                  waybillNo: order.waybillNo,
                  lat: simulatedLat,
                  lng: simulatedLng,
                  timestamp: timestampStr,
                  driverId: order.driverName || 'Test Driver',
                  orderId: order.id
                });
              }}
              style={{ width: '100%', height: '6px', borderRadius: '3px', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            {order.liveCoordinates && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={10} /> {order.liveCoordinates.lat.toFixed(4)}, {order.liveCoordinates.lng.toFixed(4)}
                </span>
                <span>Last sync: {order.liveCoordinates.lastUpdated.split(', ')[1] || 'Just now'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tracking History */}
      <div className="detail-section" style={{ marginTop: '16px', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Tracking History</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activityLogs?.filter(log => log.reference === order.waybillNo).length > 0 ? (
            activityLogs.filter(log => log.reference === order.waybillNo).map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '12px', borderLeft: '2px solid var(--border)', paddingLeft: '16px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: log.userColor || 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{log.action}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{log.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: log.userColor, background: `${log.userColor}15`, padding: '2px 6px', borderRadius: '4px' }}>
                      {log.userName}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              No history available for this package yet.
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons-container">
        {(order.status === 'Pending' || order.status === 'Assigned') && (
          <button 
            className="btn btn-primary btn-block btn-massive"
            onClick={handleConfirmPickup}
            disabled={isUpdating}
          >
            <CheckCircle size={20} />
            {isUpdating ? 'Updating...' : 'CONFIRM PICKUP'}
          </button>
        )}

        {order.status === 'Picked Up' && (
          <button 
            className="btn btn-primary btn-block btn-massive"
            onClick={handleStartTransit}
            disabled={isUpdating}
          >
            <Navigation size={20} />
            {isUpdating ? 'Updating...' : 'START TRANSIT'}
          </button>
        )}

        {order.status === 'In Transit' && (
          <div className="split-actions">
            <button 
              className="btn btn-primary btn-massive"
              onClick={handleOutForDelivery}
              disabled={isUpdating}
            >
              <Navigation size={20} />
              OUT FOR DELIVERY
            </button>
            <button 
              className="btn btn-danger btn-massive"
              onClick={() => setShowFailureModal(true)}
              disabled={isUpdating}
            >
              <XCircle size={20} />
              FAILED
            </button>
          </div>
        )}

        {order.status === 'Out for Delivery' && (
          <div className="split-actions">
            <button 
              className="btn btn-success btn-massive"
              onClick={() => setShowPODModal(true)}
              disabled={isUpdating}
            >
              <CheckCircle size={20} />
              DELIVERED
            </button>
            <button 
              className="btn btn-danger btn-massive"
              onClick={() => setShowFailureModal(true)}
              disabled={isUpdating}
            >
              <XCircle size={20} />
              FAILED
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPODModal && (
        <PODModal 
          onClose={() => setShowPODModal(false)}
          onSubmit={handlePODSubmit}
          defaultRecipient={order.recipientName}
          orderStatus={order.status}
        />
      )}

      {showFailureModal && (
        <FailureModal 
          onClose={() => setShowFailureModal(false)}
          onSubmit={handleFailureSubmit}
        />
      )}

      {/* Driver Action Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isUpdating && setShowConfirmModal(false)}
        title={confirmAction?.title || 'Confirm Action'}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            {confirmAction?.message}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" disabled={isUpdating} onClick={() => setShowConfirmModal(false)}>Cancel</button>
            <button 
              className="btn btn-primary btn-sm" 
              disabled={isUpdating} 
              onClick={() => {
                if (confirmAction) {
                  confirmAction.onConfirm();
                  setShowConfirmModal(false);
                }
              }}
            >
              {isUpdating ? 'Updating...' : 'Yes, Proceed'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
