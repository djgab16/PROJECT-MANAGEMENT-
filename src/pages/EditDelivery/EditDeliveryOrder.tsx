import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Save, Undo2, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import Header from '../../components/layout/Header';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { DeliveryOrder } from '../../types';
import './EditDeliveryOrder.css';

const FAILURE_REASONS = [
  "Customer Not Home",
  "Incorrect Address",
  "Damaged Parcel",
  "Refused by Recipient",
  "Incomplete Address",
  "Weather / Force Majeure",
  "Other"
];

const formatDateToInput = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const formatDateFromInput = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const REGIONS = [
  {
    name: "National Capital Region (Metro Manila)",
    cities: ["Manila", "Quezon City", "Makati", "Pasig", "Taguig", "Pasay", "Parañaque", "Las Piñas", "Muntinlupa", "Marikina", "Mandaluyong", "San Juan", "Caloocan", "Malabon", "Navotas", "Valenzuela"]
  },
  {
    name: "Central Luzon",
    cities: ["Angeles", "San Fernando", "Olongapo", "Tarlac City", "Cabanatuan"]
  },
  {
    name: "CALABARZON",
    cities: ["Antipolo", "Dasmariñas", "Bacoor", "Tagaytay", "Batangas City", "Lucena"]
  },
  {
    name: "Visayas",
    cities: ["Cebu City", "Mandaue", "Lapu-Lapu", "Iloilo City", "Bacolod", "Tacloban"]
  },
  {
    name: "Mindanao",
    cities: ["Davao City", "Cagayan de Oro", "Zamboanga City", "General Santos", "Butuan"]
  }
];

export default function EditDeliveryOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveryOrders, addDeliveryOrder, updateDeliveryOrder, deleteDeliveryOrder, addActivityLog } = useData();
  const { user } = useAuth();

  const isNew = id === 'new';
  const isDriver = user?.role === 'DRIVER';
  const isReadOnly = !isNew || isDriver;
  const inputStyle = isReadOnly ? { background: 'var(--bg-main)' } : {};

  const [formData, setFormData] = useState<Partial<DeliveryOrder>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const isPickup = formData.taskType === 'Pickup';
  const isAreaReadOnly = isReadOnly || isPickup;

  const getInputStyle = (field: string, extraStyle = {}) => {
    const baseReadOnly = field === 'area' ? isAreaReadOnly : isReadOnly;
    const baseStyle = baseReadOnly ? { background: 'var(--bg-main)' } : {};
    const errorStyle = errors[field] ? { borderColor: 'var(--status-failed)' } : {};
    return { ...baseStyle, ...errorStyle, ...extraStyle };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
        setShowAreaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isNew) {
      const order = deliveryOrders.find(o => o.id === id);
      if (order) {
        if (isDriver && order.driverName !== user?.name) {
          navigate('/tasks');
          return;
        }
        if (formData.id !== id) {
          setFormData(order);
        }
      } else {
        navigate(isDriver ? '/tasks' : '/delivery-orders');
      }
    } else {
      if (isDriver) {
        navigate('/tasks');
        return;
      }
      if (!formData.waybillNo) {
        setFormData({
          waybillNo: `SPX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          orderDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          expectedDelivery: new Date(Date.now() + 86400000 * 2).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          status: 'Pending',
          taskType: 'Delivery',
          potStatus: 'Not Submitted',
          itemCount: 1,
          weight: '0.0 kg',
          declaredValue: '₱ 0.00',
          encodedBy: user?.name || 'Unknown',
          dateEncoded: new Date().toLocaleString(),
          lastUpdated: new Date().toLocaleString(),
          updatedBy: user?.name || 'Unknown',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, deliveryOrders, navigate, user, formData.waybillNo]);

  // Enforce Manila as Area and Route for Pickup tasks automatically
  useEffect(() => {
    if (formData.taskType === 'Pickup') {
      if (formData.area !== 'Manila' || formData.route !== 'Manila') {
        setFormData(prev => ({
          ...prev,
          area: 'Manila',
          route: 'Manila'
        }));
        if (errors.area) {
          setErrors(prev => ({ ...prev, area: '' }));
        }
      }
    }
  }, [formData.taskType, formData.area, formData.route, errors.area]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'taskType' && value === 'Pickup') {
        updated.area = 'Manila';
        if (!updated.route) {
          updated.route = 'Manila';
        }
      }
      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'taskType' && value === 'Pickup') {
      setErrors(prev => ({ ...prev, area: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ 
          ...prev, 
          potImage: reader.result as string,
          potStatus: 'Submitted'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    
    // Waybill automated validation
    if (!formData.waybillNo) {
      newErrors.waybillNo = 'Waybill number is required';
    } else {
      const startsWithSPX = formData.waybillNo.startsWith('SPX-');
      const waybillPartAfterPrefix = formData.waybillNo.substring(4);
      const hasLettersAfterPrefix = /[a-zA-Z]/.test(waybillPartAfterPrefix);
      if (!startsWithSPX) {
        newErrors.waybillNo = 'Waybill number must start with "SPX-"';
      } else if (hasLettersAfterPrefix) {
        newErrors.waybillNo = 'Waybill number cannot contain letters after "SPX-"';
      }
    }

    if (!formData.expectedDelivery) {
      newErrors.expectedDelivery = 'Expected Delivery date is required';
    } else if (formData.orderDate) {
      const orderD = new Date(formData.orderDate);
      const expectedD = new Date(formData.expectedDelivery);
      if (!isNaN(orderD.getTime()) && !isNaN(expectedD.getTime())) {
        orderD.setHours(0, 0, 0, 0);
        expectedD.setHours(0, 0, 0, 0);
        if (expectedD < orderD) {
          newErrors.expectedDelivery = 'Expected Delivery date cannot be before the Order Date';
        }
      }
    }

    if (formData.status === 'Failed' && !formData.failureReason) {
      newErrors.failureReason = 'Failure Reason is required when status is Failed';
    }

    if (!formData.area) newErrors.area = 'Area / Route is required';
    if (!formData.clientName) newErrors.clientName = 'Client Name is required';
    if (!formData.senderAddress) newErrors.senderAddress = 'Sender Address is required';
    if (!formData.recipientName) newErrors.recipientName = 'Recipient Name is required';
    if (!formData.recipientContact) newErrors.recipientContact = 'Recipient Contact is required';
    if (!formData.recipientAddress) newErrors.recipientAddress = 'Delivery Address is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Find the first error element and scroll to it (rough approximation)
      const firstErrorElement = document.querySelector('.form-input[style*="var(--status-failed)"]');
      if (firstErrorElement) firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    setTimeout(() => {
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
        navigate(isDriver ? '/tasks' : `/delivery-orders/${id}`);
      }
      setIsSubmitting(false);
    }, 600);
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
        title={isNew ? "Create New Order" : (isDriver ? "Update Order" : "Edit Order")}
        subtitle={isNew ? "Delivery Orders" : `Delivery Orders · ${formData.waybillNo}`}
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={<span className="edit-mode-badge">● {isNew ? 'Create Mode' : 'Edit Mode'}</span>}
      />
      <div className="page-content">
        {!isDriver && (
          <div className="edit-warning">
            <AlertTriangle size={18} />
            <p><strong>Notice:</strong> Please ensure all required information (*) is filled correctly. Waybill numbers are system-generated but can be modified before first save.</p>
          </div>
        )}

        <div className="edit-grid">
          <div className="edit-left">
            <div className="card">
              <div className="card-header">
                <h4>Order Information</h4>
                {!isNew && !isDriver && <span className="locked-tag">🔒 Waybill Locked</span>}
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
                    style={!isNew ? inputStyle : getInputStyle('waybillNo')}
                  />
                  {errors.waybillNo && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.waybillNo}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">ORDER DATE</label>
                  <div className="form-input-icon">
                    <Calendar size={16} className="icon-left" />
                    <input
                      type="date"
                      name="orderDate"
                      className="form-input"
                      value={formatDateToInput(formData.orderDate)}
                      onChange={(e) => {
                        const newOrderDateStr = formatDateFromInput(e.target.value);
                        // Automated expected delivery calculation (orderDate + 2 days)
                        const expectedD = e.target.value ? new Date(new Date(e.target.value).getTime() + 86400000 * 2).toISOString().split('T')[0] : '';
                        const formattedExpected = formatDateFromInput(expectedD);
                        setFormData(prev => ({ 
                          ...prev, 
                          orderDate: newOrderDateStr,
                          expectedDelivery: formattedExpected 
                        }));
                        if (errors.expectedDelivery) setErrors(prev => ({ ...prev, expectedDelivery: '' }));
                      }}
                      readOnly={isReadOnly}
                      style={{ paddingLeft: '42px', ...inputStyle }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">EXPECTED DELIVERY <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <div className="form-input-icon">
                    <Calendar size={16} className="icon-left" />
                    <input
                      type="date"
                      name="expectedDelivery"
                      className="form-input"
                      value={formatDateToInput(formData.expectedDelivery)}
                      onChange={(e) => {
                        const formatted = formatDateFromInput(e.target.value);
                        setFormData(prev => ({ ...prev, expectedDelivery: formatted }));
                        if (errors.expectedDelivery) setErrors(prev => ({ ...prev, expectedDelivery: '' }));
                      }}
                      readOnly={isReadOnly}
                      style={getInputStyle('expectedDelivery', { paddingLeft: '42px' })}
                    />
                  </div>
                  {errors.expectedDelivery && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.expectedDelivery}</span>}
                </div>
              </div>
              <div className="form-row four-col" style={{ marginTop: '16px' }}>
                <div className="form-group" ref={areaRef} style={{ position: 'relative' }}>
                  <label className="form-label">AREA / ROUTE <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input 
                    name="area" 
                    className="form-input" 
                    value={formData.area || ''} 
                    onChange={(e) => {
                      if (!isAreaReadOnly) {
                        handleChange(e);
                        setShowAreaDropdown(true);
                      }
                    }} 
                    onFocus={() => {
                      if (!isAreaReadOnly) {
                        setShowAreaDropdown(true);
                      }
                    }}
                    placeholder={isPickup ? "Manila" : "Search or select a city..."} 
                    readOnly={isAreaReadOnly} 
                    style={getInputStyle('area', isPickup ? { cursor: 'not-allowed' } : {})} 
                    autoComplete="off"
                  />
                  {showAreaDropdown && !isAreaReadOnly && (
                    <div className="search-popover" style={{ top: 'calc(100% + 4px)', maxHeight: '250px', overflowY: 'auto' }}>
                      {REGIONS.map(region => {
                        const filteredCities = region.cities.filter(c => c.toLowerCase().includes((formData.area || '').toLowerCase()));
                        if (filteredCities.length === 0) return null;
                        return (
                          <div key={region.name} className="search-group">
                            <div className="search-group-title">{region.name}</div>
                            {filteredCities.map(city => (
                              <div 
                                key={city} 
                                className="search-item" 
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, area: city }));
                                  setErrors(prev => ({ ...prev, area: '' }));
                                  setShowAreaDropdown(false);
                                }}
                              >
                                <span className="search-item-main">{city}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {REGIONS.every(r => r.cities.filter(c => c.toLowerCase().includes((formData.area || '').toLowerCase())).length === 0) && (
                        <div className="search-empty">No matching cities found</div>
                      )}
                    </div>
                  )}
                  {errors.area && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.area}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">TASK TYPE</label>
                  <select name="taskType" className="form-input" value={formData.taskType || 'Delivery'} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                    <option value="Delivery">Delivery</option>
                    <option value="Pickup">Pickup</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">STATUS</label>
                  <select name="status" className="form-input" value={formData.status} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">DELIVERY PRIORITY</label>
                  <select name="priority" className="form-input" value={formData.priority || 'Medium'} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {formData.status === 'Failed' && (
                <div className="form-row two-col" style={{ marginTop: '16px', background: 'var(--status-failed-bg)', padding: '16px', borderRadius: '8px', border: '1px solid #ffdcd9' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--status-failed)' }}>REASON FOR FAILURE <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                    <select 
                      name="failureReason" 
                      className="form-input" 
                      value={formData.failureReason || ''} 
                      onChange={handleChange} 
                      disabled={isReadOnly} 
                      style={getInputStyle('failureReason', { background: 'white' })}
                    >
                      <option value="">Select a Reason</option>
                      {FAILURE_REASONS.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    {errors.failureReason && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.failureReason}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--status-failed)' }}>FAILURE REMARKS (Optional)</label>
                    <textarea 
                      name="failureRemarks" 
                      className="form-input form-textarea" 
                      value={formData.failureRemarks || ''} 
                      onChange={handleChange} 
                      placeholder="Add detailed failure remarks..." 
                      readOnly={isReadOnly} 
                      style={{ ...inputStyle, minHeight: '80px', background: isReadOnly ? 'var(--bg-main)' : 'white' }}
                    />
                  </div>
                </div>
              )}
              <div className="form-row three-col" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">PACKAGE TYPE / BOX</label>
                  <select name="packageType" className="form-input" value={formData.packageType || ''} onChange={handleChange} disabled={isReadOnly} style={inputStyle}>
                    <option value="">Select Box Type</option>
                    <option value="Small Box">Small Box</option>
                    <option value="Medium Box">Medium Box</option>
                    <option value="Large Box">Large Box</option>
                    <option value="Document / Pouch">Document / Pouch</option>
                    <option value="Custom">Custom / Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">WEIGHT</label>
                  <input name="weight" className="form-input" value={formData.weight || ''} onChange={handleChange} placeholder="e.g. 1.5 kg" readOnly={isReadOnly} style={inputStyle} />
                </div>
                <div className="form-group">
                  <label className="form-label">ITEM COUNT</label>
                  <input type="number" name="itemCount" className="form-input" value={formData.itemCount || ''} onChange={handleChange} readOnly={isReadOnly} style={inputStyle} />
                </div>
              </div>
            </div>

            <div className="card">
              <h4>Sender Information</h4>
              <div className="form-row two-col">
                <div className="form-group">
                  <label className="form-label">CLIENT NAME <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input name="clientName" className="form-input" value={formData.clientName} onChange={handleChange} readOnly={isReadOnly} style={getInputStyle('clientName')} />
                  {errors.clientName && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.clientName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">CONTACT NUMBER</label>
                  <input name="contactNumber" className="form-input" value={formData.contactNumber} onChange={handleChange} readOnly={isReadOnly} style={inputStyle} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">SENDER ADDRESS <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <textarea name="senderAddress" className="form-input form-textarea" value={formData.senderAddress} onChange={handleChange} readOnly={isReadOnly} style={getInputStyle('senderAddress')} />
                {errors.senderAddress && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.senderAddress}</span>}
              </div>
            </div>

            <div className="card">
              <h4>Recipient Information</h4>
              <div className="form-row two-col">
                <div className="form-group">
                  <label className="form-label">RECIPIENT NAME <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input name="recipientName" className="form-input" value={formData.recipientName} onChange={handleChange} readOnly={isReadOnly} style={getInputStyle('recipientName')} />
                  {errors.recipientName && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.recipientName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">CONTACT NUMBER <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                  <input name="recipientContact" className="form-input" value={formData.recipientContact} onChange={handleChange} readOnly={isReadOnly} style={getInputStyle('recipientContact')} />
                  {errors.recipientContact && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.recipientContact}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">DELIVERY ADDRESS <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <textarea name="recipientAddress" className="form-input form-textarea" value={formData.recipientAddress} onChange={handleChange} readOnly={isReadOnly} style={getInputStyle('recipientAddress')} />
                {errors.recipientAddress && <span className="validation-error" style={{ color: 'var(--status-failed)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.recipientAddress}</span>}
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
                <h4>Proof of Transaction</h4>
              </div>
              <div className="POT-upload-area" style={{ marginTop: '12px', border: '2px dashed var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'center', background: 'var(--bg-main)' }}>
                {formData.potImage ? (
                  <div style={{ position: 'relative' }}>
                    <img src={formData.potImage} alt="POT Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }} />
                    <button 
                      className="btn btn-sm btn-danger" 
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                      onClick={(e) => { e.preventDefault(); setFormData(p => ({ ...p, potImage: undefined, potStatus: 'Not Submitted' })) }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '12px', background: 'white', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                      <ImageIcon size={24} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No Proof of Transaction uploaded yet.</p>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', marginTop: '8px' }}>
                      <Upload size={14} /> Upload Image
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {Object.values(errors).some(Boolean) && (
              <div style={{ color: 'var(--status-failed)', background: 'var(--status-failed-bg)', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ffdcd9', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', marginBottom: '12px', boxShadow: '0 2px 6px rgba(227,26,26,0.04)' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>⚠️ Please fill in all required fields:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {Object.entries(errors).map(([key, val]) => (
                    val ? <li key={key} style={{ listStyleType: 'disc' }}>{val}</li> : null
                  ))}
                </ul>
              </div>
            )}

            <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'SAVING...' : (
                <><Save size={16} /> {isNew ? 'CREATE ORDER' : 'SAVE CHANGES'}</>
              )}
            </button>
            <button className="btn btn-outline" onClick={() => navigate(-1)}><Undo2 size={16} /> {isDriver ? 'Back' : 'Discard'}</button>
            {!isNew && !isDriver && <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={16} /> Delete Order</button>}
          </div>
        </div>
      </div>
    </>
  );
}
