import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import './Modals.css';

interface PODModalProps {
  onClose: () => void;
  onSubmit: (data: { podImage: string; recipientName: string }) => void;
  defaultRecipient: string;
}

export default function POTModal({ onClose, onSubmit, defaultRecipient }: PODModalProps) {
  const [podImage, setPodImage] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(defaultRecipient);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPodImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!podImage || !recipientName.trim()) {
      alert("Please capture a photo and enter the recipient's name.");
      return;
    }
    onSubmit({ podImage, recipientName });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Proof of Delivery</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <div className="pot-capture-area">
            {podImage ? (
              <div className="pot-preview">
                <img src={podImage} alt="POD" />
                <button className="btn btn-sm btn-outline" onClick={() => setPodImage(null)}>Retake Photo</button>
              </div>
            ) : (
              <label className="pot-capture-btn">
                <Camera size={32} />
                <span>Tap to take photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleImageCapture} 
                  style={{ display: 'none' }} 
                />
              </label>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">RECEIVED BY</label>
            <input 
              className="form-input" 
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Enter name of person who received"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!podImage || !recipientName}>
            Submit POD
          </button>
        </div>
      </div>
    </div>
  );
}
