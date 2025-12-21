"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AudioRecord } from '@/types';
import { MAP_CONFIG } from '@/config/map';

// Fix for Leaflet default icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface DynamicMapProps {
  audioRecords?: AudioRecord[];
  onMarkerClick?: (record: AudioRecord) => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Component to handle map events
function MapEventHandler({ onMapLoad, userLocation }: { onMapLoad: (map: L.Map) => void; userLocation?: { lat: number; lng: number } | null }) {
  const map = useMapEvents({
    load: () => {
      console.log('Map loaded successfully');
      onMapLoad(map);
    },
  });

  // Update view when user location changes
  useEffect(() => {
    if (userLocation && map && map.setView) {
      map.setView([userLocation.lat, userLocation.lng], 14, {
        animate: true,
      });
    }
  }, [userLocation, map]);

  return null;
}

export default function DynamicMap({
  audioRecords = [],
  onMarkerClick,
  userLocation
}: DynamicMapProps) {
  const [mapCenter, setMapCenter] = useState({
    lat: MAP_CONFIG.DEFAULT_VIEW_STATE.latitude,
    lng: MAP_CONFIG.DEFAULT_VIEW_STATE.longitude,
  });

  // Mock data for demonstration
  const mockAudioRecords: AudioRecord[] = [
    {
      id: '1',
      latitude: 39.9042,
      longitude: 116.4074,
      emotion: 'Joy',
      tags: ['music', 'street'],
      story: '在北京的胡同里听到了悠扬的二胡声，仿佛时间倒流回了老北京。',
      audioUrl: '',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      latitude: 39.9142,
      longitude: 116.4174,
      emotion: 'Loneliness',
      tags: ['night', 'rain'],
      story: '深夜的雨滴敲打着窗户，带来了几分宁静与思念。',
      audioUrl: '',
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      latitude: 39.9242,
      longitude: 116.4274,
      emotion: 'Peace',
      tags: ['park', 'morning'],
      story: '清晨的公园里，鸟鸣声伴随着晨练的人们，充满生机。',
      audioUrl: '',
      createdAt: new Date().toISOString()
    }
  ];

  const records = audioRecords.length > 0 ? audioRecords : mockAudioRecords;

  useEffect(() => {
    if (userLocation) {
      setMapCenter({ lat: userLocation.lat, lng: userLocation.lng });
    }
  }, [userLocation]);

  return (
    <>
      <style jsx global>{`
        .leaflet-container {
          background-color: #1a1a1a;
        }
        .custom-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
        }
      `}</style>

      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={MAP_CONFIG.DEFAULT_VIEW_STATE.zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapEventHandler
          onMapLoad={(map) => console.log('Map instance ready')}
          userLocation={userLocation}
        />

        <TileLayer
          attribution={MAP_CONFIG.TILE_LAYER.attribution}
          url={MAP_CONFIG.TILE_LAYER.url}
          subdomains={MAP_CONFIG.TILE_LAYER.subdomains}
        />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              html: `
                <div class="relative">
                  <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping" style="
                    width: 20px;
                    height: 20px;
                    transform: translate(-50%, -50%);
                  "></div>
                  <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white"></div>
                </div>
              `,
              className: 'custom-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>
              <p className="text-black">Your location</p>
            </Popup>
          </Marker>
        )}

        {/* Audio markers */}
        {records.map((record) => {
          const emotionColor = MAP_CONFIG.MARKER_CONFIG.emotionColors[
            record.emotion as keyof typeof MAP_CONFIG.MARKER_CONFIG.emotionColors
          ] || '#FF6B6B';

          return (
            <Marker
              key={record.id}
              position={[record.latitude, record.longitude]}
              icon={L.divIcon({
                html: `
                  <div class="relative cursor-pointer group">
                    <div class="absolute inset-0 rounded-full animate-ping" style="
                      width: 30px;
                      height: 30px;
                      background-color: ${emotionColor};
                      opacity: 0.3;
                      transform: translate(-50%, -50%);
                    "></div>
                    <div class="relative w-6 h-6 rounded-full shadow-lg border-2 border-white" style="
                      background-color: ${emotionColor};
                    "></div>
                  </div>
                `,
                className: 'custom-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -15],
              })}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(record);
                },
              }}
            >
              <Popup>
                <div className="text-black">
                  <h3 className="font-bold text-lg">{record.emotion}</h3>
                  <p className="text-sm mt-2">{record.story}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {record.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-200 px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map info overlay */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur p-4 rounded-xl shadow-sm max-w-xs text-white">
        <h1 className="text-xl font-bold mb-1">Sound Memory</h1>
        <p className="text-xs text-gray-400">OpenStreetMap</p>
        <p className="text-xs text-gray-500 mt-2">
          Click on markers to explore audio stories
        </p>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur p-3 rounded-lg text-white text-xs">
        <p>📍 {records.length} audio memories</p>
        {userLocation && <p>🎯 Location detected</p>}
        <p className="mt-1">🖱️ Scroll to zoom • Drag to pan</p>
      </div>
    </>
  );
}