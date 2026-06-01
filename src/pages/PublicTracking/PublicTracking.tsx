import { useState } from 'react';
import './PublicTracking.css';
import TrackingSearch from './components/TrackingSearch';
import TrackingTimeline from './components/TrackingTimeline';
import LiveTrackingMap from '../../components/map/LiveTrackingMap';
import SupportBanner from './components/SupportBanner';
import { mockFetchTracking } from '../../api/publicTrackingApi';
import type { PublicTrackingResponse } from '../../api/publicTrackingApi';
import logo from '../../assets/logo.png';

export default function PublicTracking() {
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<{status: number, message: string} | null>(null);
  const [data, setData] = useState<PublicTrackingResponse | null>(null);

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

  return (
    <div className="public-tracking-container">
      <div className="public-tracking-content">
        {/* Header / Logo */}
        <header className="public-header">
          <div className="logo-brand">
            <img src={logo} alt="Speedex Logo" style={{ height: '40px', objectFit: 'contain' }} />
          </div>
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
              
              <div className="results-grid">
                <div className="card timeline-container">
                  <TrackingTimeline events={data.events} currentStatus={data.currentStatus} />
                </div>
                
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
    </div>
  );
}
