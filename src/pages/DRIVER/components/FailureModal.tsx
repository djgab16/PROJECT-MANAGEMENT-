import { useState } from 'react';
import { X } from 'lucide-react';
import './Modals.css';

interface FailureModalProps {
  onClose: () => void;
  onSubmit: (data: { reason: string; remarks: string }) => void;
}

const FAILURE_REASONS = [
  "Customer Not Home",
  "Incorrect Address",
  "Damaged Parcel",
  "Refused by Recipient",
  "Other"
];

export default function FailureModal({ onClose, onSubmit }: FailureModalProps) {
  const [reason, setReason] = useState(FAILURE_REASONS[0]);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    onSubmit({ reason, remarks });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ color: 'var(--status-failed)' }}>Report Failed Delivery</h3>
          <button className="icon-btn" onClick={onClose} disabled={isSubmitting}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">REASON FOR FAILURE</label>
            <select 
              className="form-input" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            >
              {FAILURE_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">REMARKS (Optional)</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '100px', resize: 'vertical' }}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide any additional details here..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button className="btn btn-danger" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Confirming...' : 'Confirm Failure'}
          </button>
        </div>
      </div>
    </div>
  );
}
