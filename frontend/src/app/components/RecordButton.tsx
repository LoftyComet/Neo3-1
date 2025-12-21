"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, Play, Pause, Check, X, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { ConfirmationModal } from './ConfirmationModal';
import { AudioRecord } from '@/types';

interface RecordButtonProps {
  userId?: string;
  onUploadSuccess?: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ userId, onUploadSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [volume, setVolume] = useState(0); // 用于控制波纹大小
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploadedRecord, setUploadedRecord] = useState<AudioRecord | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      
      audio.onloadedmetadata = () => {
        if (isFinite(audio.duration)) {
            setDuration(audio.duration);
        }
      };
      
      // Fallback for duration if metadata doesn't load immediately or correctly for webm
      audio.ondurationchange = () => {
          if (isFinite(audio.duration)) {
              setDuration(audio.duration);
          }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setCurrentTime(0);
      };
    } else {
      audioRef.current = null;
      setDuration(0);
      setCurrentTime(0);
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

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
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setPreviewUrl(url);
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

  const togglePreview = () => {
    if (audioRef.current) {
      if (isPlayingPreview) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
    }
  };

  const handleDiscard = () => {
    setRecordedBlob(null);
    setPreviewUrl(null);
    setIsPlayingPreview(false);
  };

  const handleConfirmUpload = async () => {
    if (recordedBlob) {
      await handleUpload(recordedBlob);
      handleDiscard();
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
      const record = await api.uploadRecord(blob, lat, lng, userId);
      setUploadedRecord(record);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleModalConfirm = () => {
    setUploadedRecord(null);
    handleDiscard();
    if (onUploadSuccess) onUploadSuccess();
  };

  const handleModalCancel = () => {
    setUploadedRecord(null);
    // Keep recordedBlob so user can decide what to do
  };

  // 动态计算光晕大小
  const glowSize = Math.max(1, 1 + volume / 50); 

  return (
    <>
      {uploadedRecord && (
        <ConfirmationModal 
          record={uploadedRecord}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000]">
      <AnimatePresence mode='wait'>
        {isUploading ? (
          <motion.div 
            key="uploading"
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="w-16 h-16 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10"
          >
            <Loader2 className="text-white animate-spin" />
          </motion.div>
        ) : recordedBlob ? (
          <motion.div
            key="confirm"
            initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, y: 20 }}
            className="flex flex-col items-center bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 gap-3"
          >
            {/* Progress Bar */}
            <div className="w-full flex items-center gap-2 px-2 min-w-[200px]">
                <span className="text-[10px] text-white/70 w-8 text-right font-mono">{formatTime(currentTime)}</span>
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 0} 
                  step="0.1"
                  value={currentTime} 
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                />
                <span className="text-[10px] text-white/70 w-8 font-mono">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-6">
                <button onClick={handleDiscard} className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                  <X size={20} />
                </button>
                <button onClick={togglePreview} className="p-4 rounded-full bg-white text-black hover:bg-gray-200 transition-colors">
                  {isPlayingPreview ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
                </button>
                <button onClick={handleConfirmUpload} className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors">
                  <Check size={20} />
                </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="record"
            whileTap={{ scale: 0.9 }}
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'glass-panel text-white hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}
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
    </>
  );
};