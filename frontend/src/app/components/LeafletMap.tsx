"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline, Pane } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { AudioRecord } from '@/types';
import { MAP_CONFIG } from '@/config/map';
import DiscoveryLayer from './DiscoveryLayer';

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
  audioRecords: AudioRecord[];
  onMarkerClick?: (record: AudioRecord) => void;
  userLocation?: { lat: number; lng: number } | null;
  selectedAudio?: AudioRecord | null;
  visitedAudioIds?: Set<string>;
  isLocating?: boolean;
  onLocationReached?: () => void;
}

// Component to handle map view updates and animations
function MapController({ 
  selectedAudio,
  userLocation,
  isLocating,
  onLocationReached
}: { 
  selectedAudio?: AudioRecord | null,
  userLocation?: { lat: number; lng: number } | null,
  isLocating?: boolean,
  onLocationReached?: () => void
}) {
  const map = useMap();
  
  // Fly to user location when requested
  useEffect(() => {
    if (isLocating && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, {
        duration: 2.5,
        easeLinearity: 0.25
      });
      
      const timer = setTimeout(() => {
        onLocationReached?.();
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [isLocating, userLocation, map, onLocationReached]);

  // Center on selected audio
  useEffect(() => {
    if (selectedAudio) {
      map.flyTo([selectedAudio.latitude, selectedAudio.longitude], 15, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [selectedAudio, map]);

  return null;
}

// Custom Marker Component (for rendering to HTML string)
const CustomMarker = ({ 
  color, 
  emotion, 
  isSelected, 
  isVisited 
}: { 
  color: string; 
  emotion: string; 
  isSelected?: boolean;
  isVisited?: boolean;
}) => (
  <div className={`relative w-[80px] h-[80px] flex items-center justify-center transition-all duration-1000 ${
    isSelected ? 'scale-125' : 'scale-100'
  } ${!isVisited && !isSelected ? 'grayscale-[0.4] opacity-30' : 'grayscale-0 opacity-100'}`}>
    
    {/* Outer Halo - Morandi Soft Glow */}
    <div
      className={`absolute inset-0 rounded-full transition-all duration-1000 ${
        isSelected ? 'opacity-80 scale-110' : isVisited ? 'opacity-40 scale-90' : 'opacity-10 scale-75'
      } ${isVisited ? 'animate-pulse-brisk' : 'animate-pulse-soothing'}`}
      style={{
        background: `radial-gradient(circle, ${color}22 0%, transparent 75%)`,
        border: isSelected ? `1.5px solid ${color}44` : `1px solid ${color}11`,
        boxShadow: isSelected ? `0 0 40px ${color}22` : 'none',
        backdropFilter: isSelected ? 'blur(8px)' : 'none',
      }}
    />
    
    {/* Inner Soft Glow Core */}
    <div
      className="absolute w-8 h-8 rounded-full blur-xl transition-all duration-1000"
      style={{
        backgroundColor: color,
        opacity: isSelected ? 0.6 : isVisited ? 0.3 : 0.1,
        transform: isSelected ? 'scale(1.2)' : 'scale(1)'
      }}
    />

    {/* Center Point - The "Matte Pearl" */}
    <div
      className={`relative w-3.5 h-3.5 rounded-full transition-all duration-700 ${
        isSelected ? 'scale-125' : 'scale-100'
      }`}
      style={{
        backgroundColor: isVisited || isSelected ? color : '#D1D5DB',
        boxShadow: isSelected 
          ? `0 0 20px ${color}66, inset 0 0 4px rgba(255,255,255,0.5)` 
          : `inset 0 0 2px rgba(255,255,255,0.3)`,
        border: '1px solid rgba(255,255,255,0.2)'
      }}
    >
      {/* Subtle highlight for a matte ceramic look */}
      <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white/30 blur-[0.5px]" />
    </div>

    {/* Selection Indicator Ring - Minimalist */}
    {isSelected && (
      <div className="absolute -inset-2 rounded-full border border-white/10 animate-[spin_12s_linear_infinite]" 
           style={{ borderStyle: 'solid', borderTopColor: 'rgba(255,255,255,0.3)' }} />
    )}
  </div>
);

export default function LeafletMap({ 
  audioRecords, 
  onMarkerClick, 
  userLocation, 
  selectedAudio, 
  visitedAudioIds,
  isLocating,
  onLocationReached
}: LeafletMapProps) {
  const defaultCenter: [number, number] = [
    MAP_CONFIG.DEFAULT_VIEW_STATE.latitude,
    MAP_CONFIG.DEFAULT_VIEW_STATE.longitude
  ];

  // Always start at default center to avoid jump
  const initialCenter: [number, number] = defaultCenter;

  // Calculate connections (simple mesh for demo)
  const connections = audioRecords.slice(0, 10).map((record, i) => {
    if (i === audioRecords.length - 1) return null;
    // Connect to next record for a "constellation" look
    const nextRecord = audioRecords[i + 1];
    return (
      <Polyline
        key={`line-${i}`}
        positions={[
          [record.latitude, record.longitude],
          [nextRecord.latitude, nextRecord.longitude]
        ]}
        pathOptions={{
          color: 'rgba(255, 255, 255, 0.1)',
          weight: 1,
          dashArray: '5, 10',
          className: 'animate-pulse' 
        }}
      />
    );
  });

  return (
    <MapContainer
      center={initialCenter}
      zoom={MAP_CONFIG.DEFAULT_VIEW_STATE.zoom}
      className="w-full h-full z-10"
      style={{ background: 'transparent' }}
      zoomControl={false}
    >
      <MapController 
        selectedAudio={selectedAudio}
        userLocation={userLocation}
        isLocating={isLocating}
        onLocationReached={onLocationReached}
      />
      
      {/* Layer Management for "Discovery" Effect */}
      <Pane name="grayscale-pane" style={{ zIndex: 200 }} />
      <Pane name="color-pane" style={{ zIndex: 201 }} />

      {/* Bottom Layer: Grayscale Map (Always visible background) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
        pane="grayscale-pane"
      />

      {/* Top Layer: Colorful Map (Visible only in "lit" areas via clipPath) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-color"
        pane="color-pane"
      />

      {/* The Mask Logic - Applied to Color Pane */}
      <DiscoveryLayer 
        visitedAudioIds={visitedAudioIds || new Set()} 
        audioRecords={audioRecords} 
        paneName="color-pane" 
      />

      {/* Connection Lines */}
      {connections}

      {/* Markers */}
      {audioRecords.map((record) => {
        const isSelected = selectedAudio?.id === record.id;
        const isVisited = visitedAudioIds?.has(record.id);
        const emotionColor = MAP_CONFIG.MARKER_CONFIG.emotionColors[
          record.emotion as keyof typeof MAP_CONFIG.MARKER_CONFIG.emotionColors
        ] || '#00f3ff';

        const iconHtml = renderToStaticMarkup(
          <CustomMarker 
            color={emotionColor} 
            emotion={record.emotion} 
            isSelected={isSelected} 
            isVisited={isVisited}
          />
        );

        const customIcon = L.divIcon({
          className: `custom-leaflet-marker ${isSelected ? 'z-[1000]' : ''}`,
          html: iconHtml,
          iconSize: [80, 80],
          iconAnchor: [40, 40],
        });

        return (
          <Marker
            key={record.id}
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(record),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
