"use client";

import { useState, useEffect } from "react";
import MapComponent from "@/app/components/MapComponent";
import { RecordButton } from "@/app/components/RecordButton";
import { AudioDetailOverlay } from "@/app/components/AudioDetailOverlay";
import RecommendationPanel from "@/app/components/RecommendationPanel";
import { AudioRecord } from "@/types";
import { api } from "@/services/api";

export default function Home() {
  // States
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioRecord | null>(null);
  const [audioRecords, setAudioRecords] = useState<AudioRecord[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [currentCity, setCurrentCity] = useState<string>("上海市");


  // Initialize User
  useEffect(() => {
    const initUser = async () => {
      let storedUserId = localStorage.getItem("sound_memory_user_id");
      
      if (storedUserId) {
        try {
          // Verify if user exists in backend
          await api.getUser(storedUserId);
        } catch (e) {
          console.warn("Stored user not found in backend, creating new one.");
          storedUserId = null;
          localStorage.removeItem("sound_memory_user_id");
        }
      }

      if (!storedUserId) {
        try {
          // Create a guest user
          const randomSuffix = Math.floor(Math.random() * 100000);
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

  // Handle navigation
  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!selectedAudio) return;
    const currentIndex = audioRecords.findIndex(r => r.id === selectedAudio.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % audioRecords.length;
    } else {
      newIndex = (currentIndex - 1 + audioRecords.length) % audioRecords.length;
    }
    setSelectedAudio(audioRecords[newIndex]);
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

          {/* 城市搜索与推荐面板 */}
          <div className="absolute top-20 left-6 w-80 pointer-events-auto space-y-4">
            <div className="bg-white/90 backdrop-blur-md p-2 rounded-lg shadow-lg flex">
              <input 
                type="text" 
                value={currentCity}
                onChange={(e) => setCurrentCity(e.target.value)}
                className="bg-transparent text-black outline-none flex-1 px-2"
                placeholder="输入城市漫游..."
              />
              <span className="text-gray-500">🔍</span>
            </div>
            
            <RecommendationPanel 
              currentCity={currentCity}
              userLat={userLocation?.lat || 31.2304}
              userLng={userLocation?.lng || 121.4737}
              onPlayAudio={handleMarkerClick}
            />
          </div>
       </div>

       {/* 录音按钮 (允许点击) */}
       <RecordButton userId={userId} onUploadSuccess={fetchRecords} />

       {/* 音频详情弹窗 */}
       {selectedAudio && (
         <AudioDetailOverlay
           record={selectedAudio}
           onClose={handleCloseAudioDetail}
           onNext={() => handleNavigate('next')}
           onPrev={() => handleNavigate('prev')}
         />
       )}
    </main>
  )
}