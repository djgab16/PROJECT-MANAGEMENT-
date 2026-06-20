import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Package, Check } from 'lucide-react';
import { realtimeSync } from '../../utils/realtimeSync';
import type { ConnectionState } from '../../utils/realtimeSync';
import 'leaflet/dist/leaflet.css';
import './LiveTrackingMap.css';

// Fix default Leaflet icon assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveTrackingMapProps {
  orderId: string;
  waybillNo: string;
  status: string;
  driverName?: string;
  driverInitials?: string;
  driverColor?: string;
  recipientAddress: string;
  recipientCoordinates?: { lat: number; lng: number };
  liveCoordinates?: { lat: number; lng: number; lastUpdated: string };
}

// Haversine formula to compute distance in meters between two lat/lng points
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper component to smoothly center/zoom bounds containing driver and recipient
function MapController({ driverPos, recipientPos }: { driverPos: [number, number] | null; recipientPos: [number, number] | null }) {
  const map = useMap();
  const fitsDoneRef = useRef(false);

  useEffect(() => {
    if (!driverPos && !recipientPos) return;

    const bounds = L.latLngBounds([]);
    if (driverPos) bounds.extend(driverPos);
    if (recipientPos) bounds.extend(recipientPos);

    if (bounds.isValid()) {
      const zoomOption = fitsDoneRef.current ? { animate: true, duration: 1.0 } : { animate: false };
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        ...zoomOption
      });
      fitsDoneRef.current = true;
    }
  }, [driverPos, recipientPos, map]);

  return null;
}

// Helper component to animate marker movement smoothly using linear interpolation
function SmoothMovingMarker({ position, icon }: { position: [number, number]; icon: L.Icon | L.DivIcon }) {
  const markerRef = useRef<L.Marker | null>(null);
  const previousPosition = useRef<[number, number]>(position);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!markerRef.current) {
      previousPosition.current = position;
      return;
    }

    const startPos = previousPosition.current;
    const endPos = position;
    const duration = 1200; // Interpolate coordinates over 1.2 seconds for fluid transition
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Lerp formula
      const currentLat = startPos[0] + (endPos[0] - startPos[0]) * progress;
      const currentLng = startPos[1] + (endPos[1] - startPos[1]) * progress;

      if (markerRef.current) {
        markerRef.current.setLatLng([currentLat, currentLng]);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousPosition.current = endPos;
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [position]);

  return <Marker ref={markerRef} position={previousPosition.current} icon={icon} />;
}

export default function LiveTrackingMap({
  orderId,
  waybillNo,
  status,
  driverName = 'Test Driver',
  driverInitials = 'TD',
  driverColor = '#00A99D',
  recipientAddress,
  recipientCoordinates,
  liveCoordinates
}: LiveTrackingMapProps) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [recipientPos, setRecipientPos] = useState<[number, number] | null>(null);
  const [connState, setConnState] = useState<ConnectionState>('disconnected');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [osrmTelemetry, setOsrmTelemetry] = useState<{ distance: number; duration: number } | null>(null);

  // Parse initial coordinates
  useEffect(() => {
    setLoading(true);
    if (recipientCoordinates) {
      setRecipientPos([recipientCoordinates.lat, recipientCoordinates.lng]);
    } else {
      // Fallback destination coordinates (Manila Quezon City center)
      setRecipientPos([14.6360, 121.0336]);
    }

    if (liveCoordinates) {
      setDriverPos([liveCoordinates.lat, liveCoordinates.lng]);
      setLastUpdated(liveCoordinates.lastUpdated);
    } else if (status === 'In Transit' || status === 'Out for Delivery') {
      // Starting location is Quezon City (Aurora Blvd area) so it's in the same vicinity
      setDriverPos([14.6200, 121.0180]);
    } else {
      setDriverPos(null);
    }
    
    // Simulate loading skeleton
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, [liveCoordinates, recipientCoordinates, status, orderId]);

  // Subscribe to real-time polling-based GPS updates
  useEffect(() => {
    if (status !== 'In Transit' && status !== 'Out for Delivery') {
      return;
    }

    // Pre-register the orderId so polling uses the fast /api/deliveryorder/{id} path
    if (orderId) {
      realtimeSync.setOrderId(waybillNo, orderId);
    }

    // Subscribe to GPS coordinate updates
    const unsubscribeMessage = realtimeSync.subscribe(waybillNo, (msg) => {
      console.log('LiveTrackingMap: Received live GPS update from polling:', msg);
      setDriverPos([msg.lat, msg.lng]);
      setLastUpdated(msg.timestamp);
    });

    // Subscribe to connection state
    const unsubscribeState = realtimeSync.subscribeState((state) => {
      setConnState(state);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeState();
    };
  }, [waybillNo, status, orderId]);

  // Also listen for same-browser storage events for tab-based testing fallbacks
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dts_orders' && e.newValue) {
        try {
          const orders = JSON.parse(e.newValue);
          const found = orders.find((o: any) => o.waybillNo === waybillNo);
          if (found && found.liveCoordinates) {
            setDriverPos([found.liveCoordinates.lat, found.liveCoordinates.lng]);
            setLastUpdated(found.liveCoordinates.lastUpdated);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [waybillNo]);

  // Fetch real turn-by-turn road routing path from OSRM API (with debouncing for lag-free sliding!)
  useEffect(() => {
    if (!driverPos || !recipientPos) {
      Promise.resolve().then(() => {
        setRouteCoordinates([]);
        setOsrmTelemetry(null);
      });
      return;
    }

    // Instantly update the first point of the route line (driver position) in real-time,
    // keeping the rest of the street route intact. This prevents visual blinking and
    // makes the line stick perfectly to the moving car marker without any network lag!
    Promise.resolve().then(() => {
      setRouteCoordinates((prev) => {
        if (prev.length > 0) {
          const newCoords = [...prev];
          newCoords[0] = driverPos;
          return newCoords;
        }
        return [driverPos, recipientPos];
      });
    });

    let isMounted = true;

    // Debounce: Wait 500ms after coordinates stop changing before firing OSRM API network request!
    // This completely eliminates "buffering" lag caused by dragging the slider quickly.
    const debounceTimer = setTimeout(() => {
      const fetchRoadRoute = async () => {
        try {
          const [startLat, startLng] = driverPos;
          const [endLat, endLng] = recipientPos;

          // OSRM expects coordinates in [lng],[lat];[lng],[lat] format
          const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
          
          const response = await fetch(url);
          const data = await response.json();

          if (isMounted) {
            if (data && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const coords = route.geometry.coordinates;
              
              // OSRM returns coordinates as [lng, lat], Leaflet expects [lat, lng]
              const parsedCoords: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);
              setRouteCoordinates(parsedCoords);
              
              // Save OSRM telemetry (distance in meters, duration in seconds)
              setOsrmTelemetry({
                distance: route.distance,
                duration: route.duration
              });
            } else {
              // OSRM succeeded but returned rate limit/no route code, keep direct path
              setRouteCoordinates([driverPos, recipientPos]);
              setOsrmTelemetry(null);
            }
          }
        } catch (err) {
          console.warn('LiveTrackingMap: OSRM routing failed, using straight polyline fallback:', err);
          if (isMounted) {
            // Fallback to direct straight path
            setRouteCoordinates([driverPos, recipientPos]);
            setOsrmTelemetry(null);
          }
        }
      };

      fetchRoadRoute();
    }, 500); // 500ms debounce is the perfect sweet spot!

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [driverPos, recipientPos]);

  // Determine if active tracking should be shown
  const isTrackingActive = (status === 'In Transit' || status === 'Out for Delivery') && driverPos !== null;
  const isPendingState = status === 'Pending' || !driverName;
  const isCompletedState = status === 'Delivered' || status === 'Completed';

  // Compute distance and ETA
  let distanceMeters = 0;
  let etaMinutes = 0;
  let distanceDisplay = '';
  let etaDisplay = '';

  if (driverPos && recipientPos) {
    if (osrmTelemetry) {
      distanceMeters = osrmTelemetry.distance;
      // Convert OSRM duration (seconds) to minutes and add a 2 min traffic buffer
      etaMinutes = Math.max(1, Math.round(osrmTelemetry.duration / 60) + 2);
    } else {
      // Fallback straight line calculation
      distanceMeters = getDistance(driverPos[0], driverPos[1], recipientPos[0], recipientPos[1]);
      etaMinutes = Math.max(1, Math.round((distanceMeters / 416) + 2));
    }

    if (distanceMeters < 100) {
      distanceDisplay = 'Arrived';
      etaDisplay = 'Arriving now';
    } else if (distanceMeters < 1000) {
      distanceDisplay = `${Math.round(distanceMeters)} m`;
      etaDisplay = `${etaMinutes} min${etaMinutes > 1 ? 's' : ''}`;
    } else {
      distanceDisplay = `${(distanceMeters / 1000).toFixed(1)} km`;
      etaDisplay = `${etaMinutes} min${etaMinutes > 1 ? 's' : ''}`;
    }
  }

  // Icons configuration
  const destinationIcon = L.divIcon({
    className: 'custom-map-pin recipient-pin',
    html: `
      <div class="pin-wrapper">
        <div class="pin-circle recipient-bg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div class="pin-shadow"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 42]
  });

  const riderIcon = createDriverIcon(driverColor);

  function createDriverIcon(color: string) {
    return L.divIcon({
      className: 'custom-map-pin driver-pin',
      html: `
        <div class="pin-wrapper">
          <div class="pulse-ring" style="border-color: ${color}"></div>
          <div class="pin-circle" style="background-color: ${color}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  if (loading) {
    return (
      <div className="map-skeleton-wrapper">
        <div className="skeleton-map-area" />
        <div className="skeleton-panel">
          <div className="skeleton-line" style={{ width: '40%', height: '16px' }} />
          <div className="skeleton-line" style={{ width: '85%', height: '24px' }} />
          <div className="skeleton-line" style={{ width: '60%', height: '14px' }} />
        </div>
      </div>
    );
  }

  // Render empty state if driver is unassigned
  if (isPendingState) {
    return (
      <div className="map-empty-state animate-fade-in">
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '50%', marginBottom: '4px' }}>
          <Package size={36} color="#94a3b8" />
        </div>
        <h3>Driver not assigned yet</h3>
        <p>Your order is prepared and awaiting dispatcher assignment. Live tracking will unlock shortly.</p>
      </div>
    );
  }

  return (
    <div className="live-tracking-map-container">
      {/* Interactive Leaflet Map */}
      <div className="map-viewport-wrapper">
        <MapContainer
          center={recipientPos || [14.5995, 120.9842]}
          zoom={13}
          zoomControl={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto bounds scaling */}
          <MapController driverPos={driverPos} recipientPos={recipientPos} />

          {/* Recipient Destination Pin */}
          {recipientPos && (
            <Marker position={recipientPos} icon={destinationIcon}>
              <Popup>
                <div style={{ fontWeight: 600 }}>Recipient Destination</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{recipientAddress}</div>
              </Popup>
            </Marker>
          )}

          {/* Live Driver Tracking Pin */}
          {isTrackingActive && driverPos && (
            <SmoothMovingMarker position={driverPos} icon={riderIcon} />
          )}

          {/* Static Last Known Driver Location if delivered or failed */}
          {isCompletedState && driverPos && (
            <Marker position={driverPos} icon={riderIcon}>
              <Popup>
                <div style={{ fontWeight: 600 }}>Delivery Final Point</div>
                <div style={{ fontSize: '11px', color: '#10b981' }}>Delivered Successfully</div>
              </Popup>
            </Marker>
          )}

          {/* dashed Polyline Connector (Route Path) */}
          {isTrackingActive && routeCoordinates.length > 0 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: driverColor || '#00A99D',
                dashArray: '6, 8',
                weight: 4.5,
                opacity: 0.85
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Floating telemetry dashboard overlay */}
      <div className="map-floating-overlay">
        <div className="overlay-header">
          <div className="overlay-title">
            {isTrackingActive && <span className="pulse-dot-live" />}
            {isTrackingActive ? 'Driver is on the way' : isCompletedState ? 'Package Delivered Successfully' : 'Preparing Package'}
          </div>
          
          {/* Connection status badge */}
          {isTrackingActive && (
            <span className={`sync-status-badge ${connState}`}>
              {connState === 'connected' ? 'Live GPS' : connState === 'connecting' || connState === 'reconnecting' ? 'Polling...' : 'Offline'}
            </span>
          )}
        </div>

        {/* Telemetry info */}
        {isTrackingActive && driverPos && (
          <div className="overlay-telemetry">
            <div className="telemetry-item">
              <span className="label">Distance Left</span>
              <span className="value">{distanceDisplay}</span>
            </div>
            <div className="telemetry-item" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
              <span className="label">Estimated Arrival</span>
              <span className="value">{etaDisplay}</span>
            </div>
          </div>
        )}

        {/* Static Delivered Card */}
        {isCompletedState && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', background: '#ecfdf5', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ fontSize: '16px' }}><Check size={16} /></span> Package delivered at its destination.
          </div>
        )}

        {/* Driver profile row */}
        <div className="overlay-driver">
          <div className="driver-mini-avatar" style={{ backgroundColor: driverColor }}>
            {driverInitials}
          </div>
          <div className="driver-mini-info">
            <strong>{driverName}</strong>
            <span>Assigned Dispatcher</span>
          </div>
          {lastUpdated && isTrackingActive && (
            <span className="last-updated-text">
              Updated: {lastUpdated.split(', ')[1] || lastUpdated}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
