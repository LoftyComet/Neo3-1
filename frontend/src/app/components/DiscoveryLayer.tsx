import { useMap, useMapEvents } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioRecord } from '@/types';

interface DiscoveryLayerProps {
  visitedAudioIds: Set<string>;
  audioRecords: AudioRecord[];
  paneName: string;
}

export default function DiscoveryLayer({ visitedAudioIds, audioRecords, paneName }: DiscoveryLayerProps) {
  const map = useMap();
  const [pathD, setPathD] = useState<string>('');
  const [uniqueId] = useState(() => `discovery-clip-${Math.random().toString(36).substr(2, 9)}`);
  
  // Fixed geographic radius in meters (e.g. 500m radius)
  const RADIUS_METERS = 500; 

  const updatePath = () => {
    if (!map) return;

    // Calculate pixel radius based on current zoom and center latitude to keep geographic size constant
    const center = map.getCenter();
    const centerPoint = map.latLngToContainerPoint(center);
    
    // Calculate a point RADIUS_METERS east of center
    // 1 degree longitude ~= 111320 * cos(lat) meters
    const metersPerDegree = 111320 * Math.cos(center.lat * Math.PI / 180);
    const deltaLng = RADIUS_METERS / metersPerDegree;
    const eastPoint = map.latLngToContainerPoint([center.lat, center.lng + deltaLng]);
    
    // The radius in pixels
    const r = Math.abs(eastPoint.x - centerPoint.x);

    // Just circles, no rectangle. 
    // We will apply this to the COLOR layer, so we want to SHOW (fill) the circles.
    let d = '';

    visitedAudioIds.forEach(id => {
      const record = audioRecords.find(r => r.id === id);
      if (record) {
        const point = map.latLngToContainerPoint([record.latitude, record.longitude]);
        const x = point.x;
        const y = point.y;
        
        // Draw circle
        d += ` M${x - r},${y} A${r},${r} 0 1,0 ${x + r},${y} A${r},${r} 0 1,0 ${x - r},${y}`;
      }
    });

    setPathD(d);
  };

  useMapEvents({
    move: updatePath,
    zoom: updatePath,
    moveend: updatePath
  });

  useEffect(() => {
    updatePath();
  }, [visitedAudioIds, audioRecords, map]);

  // Apply clip-path via URL to the SVG definition
  useEffect(() => {
    const pane = map.getPane(paneName);
    if (pane) {
      pane.style.clipPath = `url(#${uniqueId})`;
    }
  }, [uniqueId, paneName, map]);

  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
      <defs>
        <clipPath id={uniqueId} clipRule="nonzero">
          <path d={pathD} />
        </clipPath>
      </defs>
    </svg>
  );
}
