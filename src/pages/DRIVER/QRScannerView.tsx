import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { PackageSearch, AlertCircle } from 'lucide-react';
import './QRScannerView.css';

export default function QRScannerView() {
  const navigate = useNavigate();
  const { deliveryOrders } = useData();
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      const scannedText = result[0].rawValue;
      
      // Look for a delivery order with matching waybill
      const order = deliveryOrders.find(
        (o) => (o.waybillNo || '').toLowerCase() === scannedText.toLowerCase() || o.id === scannedText
      );

      if (order) {
        navigate(`/driver/delivery/${order.id}`);
      } else {
        setError(`Order not found for QR Code: ${scannedText}`);
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header-text">
        <PackageSearch size={32} color="var(--primary)" />
        <h2>Scan Waybill QR</h2>
        <p>Position the QR code within the frame to scan.</p>
      </div>

      <div className="scanner-frame-wrapper">
        <Scanner
          onScan={handleScan}
          onError={(err: any) => {
            console.error(err);
            if (err?.name === 'NotAllowedError') {
              setError("Camera permission denied. Please allow camera access.");
            }
          }}
        />
      </div>

      {error && (
        <div className="scanner-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
