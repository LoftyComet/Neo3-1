// src/app/components/RecordButton.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface RecordButtonProps {
  userId?: string;
  onUploadSuccess?: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ userId, onUploadSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [volume, setVolume] = useState(0); // 用于控制波纹大小
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Audio Context for Visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 32;
      source.connect(analyserRef.current);

      // Start Visualizer Loop
      const updateVolume = () => {
        const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
        analyserRef.current!.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(avg); // 0 - 255
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Setup Recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        handleUpload(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // 获取当前位置 (Apple 要求先有动作再获取权限体验更好)
      navigator.geolocation.getCurrentPosition((pos) => {
         console.log("Got Location", pos.coords);
         setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => {
        console.error("Location error", err);
      });

    } catch (err) {
      console.error("Mic Error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      cancelAnimationFrame(animationFrameRef.current!);
      setVolume(0);
      audioContextRef.current?.close();
    }
  };

  const handleUpload = async (blob: Blob) => {
    if (!location) {
      // Fallback if location wasn't captured during start
       navigator.geolocation.getCurrentPosition(async (pos) => {
         await performUpload(blob, pos.coords.latitude, pos.coords.longitude);
       }, (err) => {
         alert("Need location to upload.");
       });
       return;
    }
    await performUpload(blob, location.lat, location.lng);
  };

  const performUpload = async (blob: Blob, lat: number, lng: number) => {
    setIsUploading(true);
    try {
      await api.uploadRecord(blob, lat, lng, userId);
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // 动态计算光晕大小
  const glowSize = Math.max(1, 1 + volume / 50); 

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence mode='wait'>
        {isUploading ? (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="w-16 h-16 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10"
          >
            <Loader2 className="text-white animate-spin" />
          </motion.div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-colors duration-300 ${isRecording ? 'bg-red-500' : 'bg-white text-black'}`}
          >
            {/* 录音时的声波光晕特效 */}
            {isRecording && (
              <motion.div 
                className="absolute inset-0 rounded-full bg-red-500 opacity-50"
                animate={{ scale: glowSize }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
            )}
            
            <div className="z-10 relative">
              {isRecording ? <Square size={24} fill="white" /> : <Mic size={24} />}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};