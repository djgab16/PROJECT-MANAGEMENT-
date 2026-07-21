import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import AccessibleMapContainer from '../../../components/ui/AccessibleMapContainer';
import 'leaflet/dist/leaflet.css';
import './StaticMapBox.css';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface StaticMapBoxProps {
  location: { lat: number; lng: number };
}

// Helper component to center map on new location
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function StaticMapBox({ location }: StaticMapBoxProps) {
  const position: [number, number] = [location.lat, location.lng];

  return (
    <AccessibleMapContainer
      className="static-map-wrapper"
      title="Last Known Location"
      status="Static pin view"
      locationText={`Last scan coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}. This is not live GPS.`}
      minHeight={250}
    >
      <div className="leaflet-container-override">
        <MapContainer 
          center={position} 
          zoom={13} 
          scrollWheelZoom={false}
          dragging={false}
          zoomControl={false}
          style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={position} />
          <Marker position={position}>
            <Popup>
              Latest Scan Location
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </AccessibleMapContainer>
  );
}
