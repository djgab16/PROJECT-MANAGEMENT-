import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Save, Undo2, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { DeliveryOrder } from '../../types';
import './EditDeliveryOrder.css';

export default function EditDeliveryOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveryOrders, addDeliveryOrder, updateDeliveryOrder, deleteDeliveryOrder, addActivityLog } = useData();
  const { user } = useAuth();

  const isNew = id === 'new';
  const [formData, setFormData] = useState<Partial<DeliveryOrder>>({});

  useEffect(() => {
    if (!isNew) {
      const order = deliveryOrders.find(o => o.id === id);
      if (order && formData.id !== id) {
        setFormData(order);
      } else if (!order) {
        navigate('/delivery-orders');
      }
    } else {
      setFormData({
        waybillNo: `SPX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        orderDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        expectedDelivery: new Date(Date.now() + 86400000 * 2).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        status: 'Pending',
        podStatus: 'Not Submitted',
        itemCount: 1,
        weight: '0.0 kg',
        declaredValue: '₱ 0.00',
        encodedBy: user?.name || 'Unknown',
        dateEncoded: new Date().toLocaleString(),
        lastUpdated: new Date().toLocaleString(),
        updatedBy: user?.name || 'Unknown',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, deliveryOrders, navigate, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ 
          ...prev, 
          podImage: reader.result as string,
          podStatus: 'Submitted'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.expectedDelivery || !formData.area || !formData.clientName || !formData.senderAddress || !formData.recipientName || !formData.recipientContact || !formData.recipientAddress) {
      alert('Please fill in all required fields (marked with *).');
      return;
    }

    if (isNew) {
      const newOrder = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as DeliveryOrder;

      addDeliveryOrder(newOrder);
      addActivityLog({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        userName: user?.name || 'System',
        userRole: user?.role || 'Staff',
        userInitials: user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'SY',
        userColor: '#00A99D',
        action: 'Create',
        description: `Created new delivery order ${newOrder.waybillNo}`,
        reference: newOrder.waybillNo
      });
      navigate('/delivery-orders');
    } else {
      updateDeliveryOrder(id!, formData);
      addActivityLog({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        userName: user?.name || 'System',
        userRole: user?.role || 'Staff',
        userInitials: user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'SY',
        userColor: '#FF7B42',
        action: 'Update',
        description: `Updated delivery order ${formData.waybillNo}`,
        reference: formData.waybillNo
      });
      navigate(`/delivery-orders/${id}`);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      deleteDeliveryOrder(id!);
      addActivityLog({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        userName: user?.name || 'System',
        userRole: user?.role || 'Staff',
        userInitials: user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'SY',
        userColor: '#E31A1A',
        action: 'Delete',
        description: `Deleted delivery order ${formData.waybillNo}`,
        reference: formData.waybillNo
      });
      navigate('/delivery-orders');
    }
  };

  if (!formData.waybillNo) return <div>Loading...</div>;

  return (
    <>
      <Header
        title={isNew ? "Create New Order" : "Edit Order"}
        subtitle={isNew ? "Delivery Orders" : `Delivery Orders · ${formData.waybillNo}`}
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={<span className="edit-mode-badge">● {isNew ? 'Create Mode' : 'Edit Mode'}</span>}
      />
      <div className="page-content">
        <div className="edit-warning">
          <AlertTriangle size={18} />
          <p><strong>Notice:</strong> Please ensure all required information (*) is filled correctly. Waybill numbers are system-generated but can be modified before first save.</p>
        </div>

        <div className="edit-grid">
          <div className="edit-left">
            <div className="card">
              <div className="card-header">
                <h4>Order Information</h4>
                {!isNew && <span className="locked-tag">🔒 Waybill Locked</span>}
              </div>
              <div className="form-row three-col">
                <div className="form-group">
                  <label className="form-label">WAYBILL NUMBER</label>
                  <input
                    name="waybillNo"
                    className="form-input"
                    value={formData.waybillNo}
                    onChange={handleChange}
                    readOnly={!isNew}
                    style={!isNew ? { background: 'var(--bg-main)' } : {}}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ORDER DATE</label>
                  <div className="form-input-icon">
                    <Calendar size={16} className="icon-left" />
                    <input
                      name="orderDate"
                      className="form-input"
                      value={formData.orderDate}
                      onChange={handleChange}
                      style={{ paddingLeft: '42px' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">EXPECTED DELIVERY <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <div className="form-input-icon">
                    <Calendar size={16} className="icon-left" />
                    <input
                      name="expectedDelivery"
                      className="form-input"
                      value={formData.expectedDelivery}
                      onChange={handleChange}
                      style={{ paddingLeft: '42px', borderColor: 'var(--primary)' }}
                    />
                  </div>
                </div>
              </div>
              <div className="form-row three-col" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">AREA / ROUTE <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input name="area" className="form-input" value={formData.area} onChange={handleChange} placeholder="e.g. Quezon City" />
                </div>
                <div className="form-group">
                  <label className="form-label">PACKAGE TYPE</label>
                  <input name="packageType" className="form-input" value={formData.packageType} onChange={handleChange} placeholder="e.g. Parcel" />
                </div>
                <div className="form-group">
                  <label className="form-label">STATUS</label>
                  <select name="status" className="form-input" value={formData.status} onChange={handleChange}>
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
              <h4>Sender Information</h4>
              <div className="form-row two-col">
                <div className="form-group">
                  <label className="form-label">CLIENT NAME <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input name="clientName" className="form-input" value={formData.clientName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">CONTACT NUMBER</label>
                  <input name="contactNumber" className="form-input" value={formData.contactNumber} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">SENDER ADDRESS <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <textarea name="senderAddress" className="form-input form-textarea" value={formData.senderAddress} onChange={handleChange} />
              </div>
            </div>

            <div className="card">
              <h4>Recipient Information</h4>
              <div className="form-row two-col">
                <div className="form-group">
                  <label className="form-label">RECIPIENT NAME <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input name="recipientName" className="form-input" value={formData.recipientName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">CONTACT NUMBER <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input name="recipientContact" className="form-input" value={formData.recipientContact} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">DELIVERY ADDRESS <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <textarea name="recipientAddress" className="form-input form-textarea" value={formData.recipientAddress} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="edit-right">
            <div className="card">
              <div className="card-header">
                <h4>Order Summary</h4>
                <StatusBadge status={formData.status as DeliveryOrder['status']} size="sm" />
              </div>
              <div className="summary-fields">
                <div className="summary-field"><span>Waybill No.</span><span className="summary-val teal">{formData.waybillNo}</span></div>
                <div className="summary-field"><span>Encoded By</span><span>{formData.encodedBy}</span></div>
                <div className="summary-field"><span>Last Updated</span><span>{new Date().toLocaleTimeString()}</span></div>
                <div className="summary-field"><span>Status</span><span>{formData.status}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h4>Proof of Delivery</h4>
              </div>
              <div className="pod-upload-area" style={{ marginTop: '12px', border: '2px dashed var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'center', background: 'var(--bg-main)' }}>
                {formData.podImage ? (
                  <div style={{ position: 'relative' }}>
                    <img src={formData.podImage} alt="POD Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }} />
                    <button 
                      className="btn btn-sm btn-danger" 
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                      onClick={(e) => { e.preventDefault(); setFormData(p => ({ ...p, podImage: undefined, podStatus: 'Not Submitted' })) }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '12px', background: 'white', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                      <ImageIcon size={24} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No POD uploaded yet.</p>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', marginTop: '8px' }}>
                      <Upload size={14} /> Upload Image
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <button className="btn btn-primary btn-lg" onClick={handleSave}><Save size={16} /> {isNew ? 'CREATE ORDER' : 'SAVE CHANGES'}</button>
            <button className="btn btn-outline" onClick={() => navigate(-1)}><Undo2 size={16} /> Discard</button>
            {!isNew && <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={16} /> Delete Order</button>}
          </div>
        </div>
      </div>
    </>
  );
}
