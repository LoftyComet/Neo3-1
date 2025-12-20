"use client";

import { useState, useEffect } from "react";
import { RecordButton } from "@/app/components/RecordButton";
import { AudioDetailOverlay } from "@/app/components/AudioDetailOverlay";
import { AudioRecord } from "@/types";
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { api } from "@/services/api";
=======
=======
>>>>>>> Stashed changes
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/app/components/DynamicMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-screen bg-gray-900 flex items-center justify-center text-white">Loading Map...</div>
});
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

export default function Home() {
  // States
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioRecord | null>(null);
  const [audioRecords, setAudioRecords] = useState<AudioRecord[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Initialize User
  useEffect(() => {
    const initUser = async () => {
      let storedUserId = localStorage.getItem("sound_memory_user_id");
      if (!storedUserId) {
        try {
          // Create a guest user
          const randomSuffix = Math.floor(Math.random() * 10000);
          const newUser = await api.createUser(`guest_${randomSuffix}`, `guest_${randomSuffix}@example.com`);
          storedUserId = newUser.id;
          localStorage.setItem("sound_memory_user_id", storedUserId!);
        } catch (e) {
          console.error("Failed to create guest user", e);
        }
      }
      if (storedUserId) setUserId(storedUserId);
    };
    initUser();
  }, []);

  // Fetch records
  const fetchRecords = async () => {
    try {
      const records = await api.getMapRecords();
      setAudioRecords(records);
    } catch (e) {
      console.error("Failed to fetch records", e);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Handle marker click
  const handleMarkerClick = (record: AudioRecord) => {
    setSelectedAudio(record);
  };

  // Handle close audio detail
  const handleCloseAudioDetail = () => {
    setSelectedAudio(null);
  };

  return (
    <main className="w-full h-screen overflow-hidden bg-black text-white relative">
       {/* 背景地图 */}
       <MapComponent
         audioRecords={audioRecords}
         onMarkerClick={handleMarkerClick}
         userLocation={userLocation}
       />

       {/* 顶层 UI 元素 */}
       <div className="pointer-events-none absolute inset-0 z-10">
          {/* Logo 或 标题 */}
          <h1 className="absolute top-6 left-6 text-2xl font-bold tracking-tighter mix-blend-difference">
            ECHOES
          </h1>
       </div>

       {/* 录音按钮 (允许点击) */}
       <RecordButton userId={userId} onUploadSuccess={fetchRecords} />

       {/* 音频详情弹窗 */}
       {selectedAudio && (
         <AudioDetailOverlay
           record={selectedAudio}
           onClose={handleCloseAudioDetail}
         />
       )}
    </main>
  )
}