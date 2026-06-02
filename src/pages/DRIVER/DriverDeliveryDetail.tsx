import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, User, Phone, Navigation, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import PODModal from './components/PODModal';
import FailureModal from './components/FailureModal';
import { useDriverGPS } from '../../hooks/useDriverGPS';
import { realtimeSync } from '../../utils/realtimeSync';
import './DriverDeliveryDetail.css';

export default function DriverDeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveryOrders, updateDeliveryOrder, addActivityLog } = useData();

  const [order, setOrder] = useState(deliveryOrders.find(o => o.id === id));
  const [showPODModal, setShowPODModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setOrder(deliveryOrders.find(o => o.id === id));
  }, [id, deliveryOrders]);

  if (!order) return <div style={{ padding: '20px', textAlign: 'center' }}>Delivery not found</div>;
  
  // Continuous GPS watch tracking
  const { isTracking, gpsError } = useDriverGPS(order, updateDeliveryOrder);

  // Reusable GPS function
  const withLocation = (callback: (coords: { lat: number; lng: number } | null) => void) => {
    setIsUpdating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      callback(null);
      setIsUpdating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        callback({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsUpdating(false);
      },
      (error) => {
        console.error("Error obtaining location", error);
        alert("Could not get location. Proceeding without GPS tag.");
        callback(null);
        setIsUpdating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleStartTransit = () => {
    withLocation((coords) => {
      updateDeliveryOrder(order.id, {
        status: 'In Transit',
        gpsCoordinates: coords || undefined
      });
      addActivityLog({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        userName: order.driverName || 'Driver',
        userRole: 'DRIVER',
        userInitials: order.driverInitials || 'DR',
        userColor: order.driverColor || '#000',
        action: 'Update',
        description: `Started transit for ${order.waybillNo}${coords ? ' (GPS Tagged)' : ''}`,
        reference: order.waybillNo
      });
    });
  };

  const handlePODSubmit = (data: { podImage: string; recipientName: string }) => {
    withLocation((coords) => {
      updateDeliveryOrder(order.id, {
        status: 'Delivered',
        podStatus: 'Submitted',
        podImage: data.podImage,
        recipientName: data.recipientName,
        dateCompleted: new Date().toLocaleString(),
        gpsCoordinates: coords || undefined
      });
      addActivityLog({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        userName: order.driverName || 'Driver',
        userRole: 'DRIVER',
        userInitials: order.driverInitials || 'DR',
        userColor: order.driverColor || '#000',
        action: 'POT Upload',
        description: `Marked ${order.waybillNo} as Delivered${coords ? ' (GPS Tagged)' : ''}`,
        reference: order.waybillNo
      });
      setShowPODModal(false);
      navigate('/driver/dashboard');
    });
  };

  const handleFailureSubmit = (data: { reason: string; remarks: string }) => {
    withLocation((coords) => {
      updateDeliveryOrder(order.id, {
        status: 'Failed',
        failureReason: data.reason,
        failureRemarks: data.remarks,
        gpsCoordinates: coords || undefined
      });
      addActivityLog({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        userName: order.driverName || 'Driver',
        userRole: 'DRIVER',
        userInitials: order.driverInitials || 'DR',
        userColor: order.driverColor || '#000',
        action: 'Update',
        description: `Marked ${order.waybillNo} as Failed (${data.reason})${coords ? ' (GPS Tagged)' : ''}`,
        reference: order.waybillNo
      });
      setShowFailureModal(false);
      navigate('/driver/dashboard');
    });
  };

  return (
    <div className="driver-delivery-detail">
      {isTracking && (
        <div className="live-gps-streaming-badge" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px', color: '#065f46', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(16,185,129,0.08)' }}>
          <span className="pulse-dot-live" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'dot-pulse 1.5s infinite alternate' }} />
          📡 Live GPS Tracking is ACTIVE. Your movement is streamed to client.
        </div>
      )}
      {gpsError && (
        <div style={{ background: '#fff1f1', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '10px', color: '#991b1b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
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
            </div>
          </div>
          {order.specialInstructions && (
            <div className="info-item align-top alert-item">
              <Clock className="info-icon alert-icon" style={{ marginTop: '4px' }} />
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
          <div className="pot-preview-container" style={{ marginTop: '12px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
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

      {/* Sandbox Geolocation Simulator */}
      {order.status === 'In Transit' && (
        <div className="detail-section sandbox-section" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', marginTop: '16px', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', animation: 'dot-pulse 1.5s infinite alternate' }} />
            <h3 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>Sandbox Geolocation Simulator</h3>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0' }}>
            Simulate driving along the route. Drag this slider to push live GPS coordinates to customer's map in real-time.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <span>Start (Manila)</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                <span>Lat: {order.liveCoordinates.lat.toFixed(5)}</span>
                <span>Lng: {order.liveCoordinates.lng.toFixed(5)}</span>
                <span>Updated: {order.liveCoordinates.lastUpdated.split(', ')[1] || 'Just now'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons-container">
        {order.status === 'Pending' && (
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
        />
      )}

      {showFailureModal && (
        <FailureModal 
          onClose={() => setShowFailureModal(false)}
          onSubmit={handleFailureSubmit}
        />
      )}
    </div>
  );
}
