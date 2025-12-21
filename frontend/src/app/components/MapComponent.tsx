"use client";

import dynamic from 'next/dynamic';
import { AudioRecord } from '@/types';
import ParticleBackground from './ParticleBackground';

// Dynamically import LeafletMap to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
    </div>
  )
});

interface MapComponentProps {
  audioRecords?: AudioRecord[];
  onMarkerClick?: (record: AudioRecord) => void;
  userLocation?: { lat: number; lng: number } | null;
  selectedAudio?: AudioRecord | null;
  visitedAudioIds?: Set<string>;
  isLocating?: boolean;
  onLocationReached?: () => void;
}

export default function MapComponent({
  audioRecords = [],
  onMarkerClick,
  userLocation,
  selectedAudio,
  visitedAudioIds,
  isLocating,
  onLocationReached
}: MapComponentProps) {
  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      
      {/* Particle Background Layer - Behind the map but visible through transparent/filtered tiles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
         <ParticleBackground />
      </div>

      {/* Map Layer */}
      <div className="absolute inset-0 z-10">
        <LeafletMap 
          audioRecords={audioRecords}
          onMarkerClick={onMarkerClick}
          userLocation={userLocation}
          selectedAudio={selectedAudio}
          visitedAudioIds={visitedAudioIds}
          isLocating={isLocating}
          onLocationReached={onLocationReached}
        />
      </div>

      {/* Vignette Effect - On top of map */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-radial-gradient from-transparent to-black opacity-80" />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {/* Map info overlay */}
        <div className="absolute top-24 left-6 glass-panel p-6 rounded-2xl max-w-xs text-white pointer-events-auto transition-all hover:bg-opacity-80">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-wide neon-text">SOUND MEMORY</h1>
          </div>
          <p className="text-xs text-gray-300 font-light leading-relaxed">
            Explore the auditory landscape. Each point of light represents a captured memory in the city's fabric.
          </p>
          <div className="mt-4 flex gap-4 text-xs text-gray-400">
             <div className="flex flex-col">
               <span className="font-bold text-white text-lg">{audioRecords.length}</span>
               <span>Memories</span>
             </div>
             <div className="flex flex-col">
               <span className="font-bold text-white text-lg">Live</span>
               <span>Status</span>
             </div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-8 left-6 glass-panel px-4 py-2 rounded-full text-white text-xs pointer-events-auto flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
          <p className="tracking-wider uppercase text-[10px]">Interactive Map Active</p>
        </div>
      </div>
    </div>
  );
}
