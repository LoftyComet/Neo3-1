"use client";

import { useState } from 'react';

export default function MapComponent() {
  // In a real app, this would be Mapbox GL JS
  return (
    <div className="w-full h-screen bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
      {/* Mock Map Background */}
      <div className="absolute inset-0 opacity-20" 
           style={{ 
             backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
             backgroundSize: '30px 30px' 
           }}>
      </div>
      
      {/* Mock Map Points */}
      <div className="absolute top-1/3 left-1/4">
        <div className="relative">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping absolute inset-0 opacity-75"></div>
          <div className="w-4 h-4 bg-blue-600 rounded-full relative shadow-lg cursor-pointer hover:scale-125 transition-transform"></div>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2">
        <div className="relative">
          <div className="w-4 h-4 bg-purple-500 rounded-full animate-ping absolute inset-0 opacity-75 delay-75"></div>
          <div className="w-4 h-4 bg-purple-600 rounded-full relative shadow-lg cursor-pointer hover:scale-125 transition-transform"></div>
        </div>
      </div>
      
      <div className="absolute bottom-1/3 right-1/3">
        <div className="relative">
          <div className="w-4 h-4 bg-orange-500 rounded-full animate-ping absolute inset-0 opacity-75 delay-150"></div>
          <div className="w-4 h-4 bg-orange-600 rounded-full relative shadow-lg cursor-pointer hover:scale-125 transition-transform"></div>
        </div>
      </div>

      <div className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-black/80 backdrop-blur p-4 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Sound Memory
        </h1>
        <p className="text-xs text-gray-500">Map View (Mock)</p>
      </div>
    </div>
  );
}
