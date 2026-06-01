import { useEffect, useState, useRef } from 'react';
import type { DeliveryOrder } from '../types';
import { realtimeSync } from '../utils/realtimeSync';

// Haversine formula to compute distance in meters between two lat/lng points
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
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

export function useDriverGPS(
  order: DeliveryOrder,
  updateDeliveryOrder: (id: string, updated: Partial<DeliveryOrder>) => void
) {
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const lastLocationRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS is not supported by your browser.");
      return;
    }

    if (watchIdRef.current !== null) return; // Already tracking

    setIsTracking(true);
    setGpsError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const now = Date.now();

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          console.warn("Received invalid GPS coordinates:", lat, lng);
          return;
        }

        // Apply throttling and displacement filtering
        if (lastLocationRef.current) {
          const { lat: lastLat, lng: lastLng, time: lastTime } = lastLocationRef.current;
          
          const timeElapsed = now - lastTime;
          const distanceMoved = getHaversineDistance(lastLat, lastLng, lat, lng);

          // Optimization rules:
          // 1. Must wait at least 5 seconds between updates
          // 2. Must move at least 5 meters, OR 15 seconds have passed (heartbeat update)
          if (timeElapsed < 5000) {
            return; // Skip, too fast
          }

          if (distanceMoved < 5 && timeElapsed < 15000) {
            return; // Skip, stationary and no heartbeat needed yet
          }
        }

        // Update last location
        lastLocationRef.current = { lat, lng, time: now };

        const timestampStr = new Date().toLocaleString();

        // Update local context/state
        updateDeliveryOrder(order.id, {
          liveCoordinates: {
            lat,
            lng,
            lastUpdated: timestampStr
          }
        });

        // Publish live coordinates via WebSockets in real time
        realtimeSync.publish({
          waybillNo: order.waybillNo,
          lat,
          lng,
          timestamp: timestampStr,
          driverId: order.driverName || 'EMP-003',
          orderId: order.id
        });
      },
      (error) => {
        console.error("GPS Watch Position error:", error);
        let errorMsg = "Unable to fetch GPS location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission was denied. Please allow GPS access to enable live tracking.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is currently unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "GPS location request timed out.";
        }
        setGpsError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    lastLocationRef.current = null;
  };

  // Automatically start/stop tracking based on active status
  useEffect(() => {
    const isTransit = order.status === 'In Transit';

    if (isTransit) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [order.status, order.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { isTracking, gpsError, startTracking, stopTracking };
}
