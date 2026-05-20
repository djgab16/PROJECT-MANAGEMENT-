import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, User, Phone, Navigation, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import POTModal from './components/POTModal';
import FailureModal from './components/FailureModal';
import './DriverDeliveryDetail.css';

export default function DriverDeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveryOrders, updateDeliveryOrder, addActivityLog } = useData();

  const [order, setOrder] = useState(deliveryOrders.find(o => o.id === id));
  const [showPOTModal, setShowPOTModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setOrder(deliveryOrders.find(o => o.id === id));
  }, [id, deliveryOrders]);

  if (!order) return <div style={{ padding: '20px', textAlign: 'center' }}>Delivery not found</div>;

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

  const handlePOTSubmit = (data: { potImage: string; recipientName: string }) => {
    withLocation((coords) => {
      updateDeliveryOrder(order.id, {
        status: 'Delivered',
        potStatus: 'Submitted',
        potImage: data.potImage,
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
      setShowPOTModal(false);
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
      <div className="detail-header-card">
        <div className="detail-header-top">
          <span className="waybill-no-large">{order.waybillNo}</span>
          <StatusBadge status={order.status} size="sm" />
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
              onClick={() => setShowPOTModal(true)}
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
      {showPOTModal && (
        <POTModal 
          onClose={() => setShowPOTModal(false)}
          onSubmit={handlePOTSubmit}
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
