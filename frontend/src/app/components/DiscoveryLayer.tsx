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
  
  // Radius of the "light" in pixels
  const LIGHT_RADIUS = 150; 

  const updatePath = () => {
    if (!map) return;

    const size = map.getSize();
    const width = size.x;
    const height = size.y;

    // 1. Start with a full rectangle covering the map view
    let d = `M0,0 L${width},0 L${width},${height} L0,${height} Z`;

    // 2. Cut out circles for each visited record
    // Using EvenOdd rule, drawing direction doesn't matter as much, 
    // but keeping them consistent is good practice.
    visitedAudioIds.forEach(id => {
      const record = audioRecords.find(r => r.id === id);
      if (record) {
        const point = map.latLngToContainerPoint([record.latitude, record.longitude]);
        const x = point.x;
        const y = point.y;
        const r = LIGHT_RADIUS;

        if (x > -r && x < width + r && y > -r && y < height + r) {
           d += ` M${x - r},${y} A${r},${r} 0 1,0 ${x + r},${y} A${r},${r} 0 1,0 ${x - r},${y}`;
        }
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

  // Render the SVG definition into the map container or body
  // We use a portal to put it in the body to ensure it's available globally but hidden
  // Actually, putting it in the map container is fine.
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
      <defs>
        <clipPath id={uniqueId} clipRule="evenodd">
          <path d={pathD} />
        </clipPath>
      </defs>
    </svg>
  );
}
