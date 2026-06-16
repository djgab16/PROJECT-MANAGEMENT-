import { useState } from 'react';
import './PublicTracking.css';
import TrackingSearch from './components/TrackingSearch';
import TrackingTimeline from './components/TrackingTimeline';
import LiveTrackingMap from '../../components/map/LiveTrackingMap';
import SupportBanner from './components/SupportBanner';
import Modal from '../../components/ui/Modal';
import { Calendar, AlertCircle, Clock, MapPin } from 'lucide-react';
import { mockFetchTracking, mockSubmitRescheduleRequest, submitConfirmDelivery } from '../../api/publicTrackingApi';
import type { PublicTrackingResponse } from '../../api/publicTrackingApi';
import logo from '../../assets/logo.png';

export default function PublicTracking() {
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<{status: number, message: string} | null>(null);
  const [data, setData] = useState<PublicTrackingResponse | null>(null);

  // New state for client rescheduling request modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestedDate, setRequestedDate] = useState('');
  const [clientRemarks, setClientRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSearch = async (waybill: string) => {
    setLoading(true);
    setErrorState(null);
    setData(null);

    try {
      const response = await mockFetchTracking(waybill);
      setData(response);
    } catch (err: any) {
      setErrorState({
        status: err.status || 500,
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!requestedDate) {
      setSubmitError('Please select a reschedule date.');
      return;
    }
    const selectedDate = new Date(requestedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setSubmitError('Re-delivery date cannot be in the past.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await mockSubmitRescheduleRequest(data.waybillNo, requestedDate, clientRemarks);
      // Fetch updated details to refresh view
      const updated = await mockFetchTracking(data.waybillNo);
      setData(updated);
      setIsModalOpen(false);
      setClientRemarks('');
      setRequestedDate('');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-tracking-container">
      {/* Mid ambient orb */}
      <div className="public-tracking-orb-mid" />

      <div className="public-tracking-content">
        {/* Header / Logo */}
        <header className="public-header">
          <div className="logo-brand">
            <img src={logo} alt="Speedex Logo" className="logo-brand-img" />
          </div>
          <span className="header-tagline">Client Tracking Portal</span>
        </header>

        <main className="public-main">
          {/* Search Section */}
          <TrackingSearch onSearch={handleSearch} loading={loading} />

          {/* Error States */}
          {errorState && (
            <div className="card tracking-error-card animate-fade-in">
              {errorState.status === 404 && (
                <>
                  <h3>Package Not Found</h3>
                  <p>We couldn't find a delivery associated with that Waybill Number. Please check the number and try again.</p>
                </>
              )}
              {errorState.status === 429 && (
                <>
                  <h3>Too Many Requests</h3>
                  <p>You have made too many tracking requests in a short time. Please wait a moment before trying again.</p>
                </>
              )}
              {errorState.status !== 404 && errorState.status !== 429 && (
                <>
                  <h3>System Error</h3>
                  <p>{errorState.message}</p>
                </>
              )}
            </div>
          )}

          {/* Results View */}
          {data && (
            <div className="tracking-results-view animate-fade-in">
              <div className="card results-header-card">
                <h2>{data.currentStatusHeadline}</h2>
                <span className="waybill-badge">{data.waybillNo}</span>
                <button 
                  className="btn btn-outline" 
                  style={{ marginTop: '20px' }}
                  onClick={() => setData(null)}
                >
                  Track Another Package
                </button>
              </div>

              {/* Client Confirmation Panel */}
              {data.currentStatus === 'Delivered' && (
                <div className="card confirm-delivery-card animate-fade-in" style={{ background: 'var(--status-active-bg)', border: '1px solid var(--status-active)', padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ padding: '10px', background: 'var(--status-active)', color: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                        <Clock size={22} style={{ color: 'white' }} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Confirm Receipt of Package</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          If you have successfully received your package, please click "Confirm Delivery" to mark the transaction as complete.
                        </p>
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={async () => {
                        const digits = window.prompt("For security verification, please enter the last 4 digits of the recipient's phone number:");
                        if (digits === null) return; // User cancelled
                        if (!digits.trim()) {
                          alert("Verification digits are required to confirm delivery.");
                          return;
                        }
                        
                        try {
                          setLoading(true);
                          await submitConfirmDelivery(data.waybillNo, digits.trim());
                          const updated = await mockFetchTracking(data.waybillNo);
                          setData(updated);
                          alert("Thank you! Your delivery confirmation has been recorded.");
                        } catch (err: any) {
                          alert(err.message || "Failed to confirm delivery.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      Confirm Delivery
                    </button>
                  </div>
                </div>
              )}

              {/* Client Re-delivery Rescheduling Panel */}
              {['Failed', 'Cancelled'].includes(data.currentStatus) && (
                <div className="card redelivery-card animate-fade-in">
                  {(data.redeliveryAttemptCount || 0) >= 3 ? (
                    <div className="redelivery-status-container">
                      <div className="redelivery-icon-wrapper failed" style={{ background: 'var(--status-failed)', color: 'white' }}>
                        <AlertCircle size={22} style={{ color: 'white' }} />
                      </div>
                      <div className="redelivery-text-content">
                        <h3 className="redelivery-title" style={{ color: 'var(--status-failed)' }}>Maximum Re-delivery Attempts Reached</h3>
                        <p className="redelivery-description">
                          This shipment has reached the maximum limit of 3 delivery attempts. The package is currently being returned to the origin sender.
                        </p>
                      </div>
                    </div>
                  ) : data.redeliveryStatus === 'Pending Approval' ? (
                    <div className="redelivery-status-container">
                      <div className="redelivery-icon-wrapper pending">
                        <Clock size={22} />
                      </div>
                      <div className="redelivery-text-content">
                        <h3 className="redelivery-title">Re-delivery Reschedule Requested</h3>
                        <p className="redelivery-description">
                          Your request for a re-delivery attempt on <strong className="highlight-date">{data.redeliveryRequestedDate}</strong> has been received and is currently being processed.
                        </p>
                        <span className="redelivery-badge pending">
                          Pending Approval
                        </span>
                      </div>
                    </div>
                  ) : data.redeliveryStatus === 'Approved' ? (
                    <div className="redelivery-status-container">
                      <div className="redelivery-icon-wrapper approved">
                        <span className="icon-checkmark">✓</span>
                      </div>
                      <div className="redelivery-text-content">
                        <h3 className="redelivery-title approved">Re-delivery Scheduled</h3>
                        <p className="redelivery-message">
                          Great news! Your re-delivery request has been approved and is scheduled for <strong className="highlight-date">{data.redeliveryScheduledDate || data.redeliveryRequestedDate}</strong>.
                        </p>
                        <span className="redelivery-badge approved">
                          Approved
                        </span>
                      </div>
                    </div>
                  ) : data.redeliveryStatus === 'Rejected' ? (
                    <div className="redelivery-status-container">
                      <div className="redelivery-icon-wrapper rejected">
                        <AlertCircle size={22} />
                      </div>
                      <div className="redelivery-text-content">
                        <h3 className="redelivery-title rejected">Reschedule Request Declined</h3>
                        <p className="redelivery-description">
                          Your re-delivery reschedule request could not be approved at this time. Please contact our support team for help.
                        </p>
                        <button className="btn redelivery-action-btn" onClick={() => setIsModalOpen(true)}>
                          Submit Another Request
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="redelivery-status-container">
                      <div className="redelivery-icon-wrapper failed">
                        <AlertCircle size={22} />
                      </div>
                      <div className="redelivery-text-content">
                        <h3 className="redelivery-title">Need to Reschedule Your Delivery?</h3>
                        <p className="redelivery-description">
                          Since the delivery attempt was {data.currentStatus.toLowerCase()}, you can schedule a convenient new date for a second delivery attempt.
                        </p>
                        <button className="btn redelivery-action-btn" onClick={() => setIsModalOpen(true)}>
                          Schedule Re-delivery
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="results-grid">
                <div className="card timeline-container">
                  <TrackingTimeline events={data.events} currentStatus={data.currentStatus} />
                </div>
                
                {data.taskType === 'Pickup' ? (
                  <div className="card pickup-details-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '420px', background: 'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)', border: '1px solid var(--border)', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                      <div style={{ padding: '10px', background: 'var(--status-transit-bg)', color: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                        <MapPin size={22} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Office Pickup Details</h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Please collect your package at our central office hub</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Office Address</span>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                          Speedex Central Office Hub, Ground Floor, Capstone Plaza, Roces Ave., Quezon City, Metro Manila
                        </strong>
                      </div>

                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Pickup Hours</span>
                          <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>Mon - Sat: 8:00 AM - 6:00 PM</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--status-failed)', fontWeight: 600, display: 'block', marginTop: '2px' }}>Closed on Sundays & Holidays</span>
                        </div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Contact Support</span>
                          <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>+63 (2) 888-SPEED</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px' }}>support@speedex.com.ph</span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '14px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Important Pickup Instructions</span>
                        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <li style={{ listStyleType: 'disc' }}>Please present a <strong>valid government-issued ID</strong> matching the recipient name.</li>
                          <li style={{ listStyleType: 'disc' }}>If sending an authorized representative, they must provide a signed <strong>authorization letter</strong> along with copies of both your IDs.</li>
                          <li style={{ listStyleType: 'disc' }}>Be ready to show the <strong>Waybill QR Code</strong> or quote tracking number <strong>{data.waybillNo}</strong> at the counter.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card map-container" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '420px' }}>
                    <LiveTrackingMap
                      orderId={data.id || '1'}
                      waybillNo={data.waybillNo}
                      status={data.currentStatus}
                      driverName={data.driverName}
                      driverInitials={data.driverInitials}
                      driverColor={data.driverColor}
                      recipientAddress={data.recipientAddress || 'Delivery Address'}
                      recipientCoordinates={data.recipientCoordinates}
                      liveCoordinates={data.liveCoordinates}
                    />
                  </div>
                )}
              </div>

              {data.potImage && (
                <div className="card pot-container animate-fade-in" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', alignSelf: 'flex-start' }}>Proof of Transaction</h3>
                  <img src={data.potImage} alt="Proof of Transaction" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', objectFit: 'contain', background: '#f8fafc', padding: '10px', border: '1px solid #e2e8f0' }} />
                </div>
              )}
            </div>
          )}
        </main>
        
        <SupportBanner />
      </div>

      {data && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSubmitError('');
          }}
          title="Reschedule Re-delivery"
          size="md"
          footer={
            <div className="flex gap-sm justify-end" style={{ width: '100%', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => { setIsModalOpen(false); setSubmitError(''); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleSubmitReschedule}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            {submitError && (
              <div style={{ color: 'var(--status-failed)', background: 'var(--status-failed-bg)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                <AlertCircle size={16} />
                <strong>{submitError}</strong>
              </div>
            )}
            
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                CHOOSE RE-DELIVERY DATE *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={requestedDate}
                  min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                  onChange={e => {
                    setRequestedDate(e.target.value);
                    setSubmitError('');
                  }}
                  required
                />
                <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)', pointerEvents: 'none', zIndex: 10 }} />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                REMARKS / REASON FOR RESCHEDULE
              </label>
              <textarea
                className="form-input form-textarea"
                style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                placeholder="Optional comments for the delivery team..."
                value={clientRemarks}
                onChange={e => setClientRemarks(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
