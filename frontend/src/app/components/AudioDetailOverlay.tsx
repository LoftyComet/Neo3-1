// src/app/components/AudioDetailOverlay.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, Heart, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { AudioRecord } from '@/types';
import { api } from '@/services/api';

interface DetailProps {
  record: AudioRecord;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const AudioDetailOverlay: React.FC<DetailProps> = ({ record, onClose, onNext, onPrev }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likeCount, setLikeCount] = useState(record.likeCount || 0);
  const [questionCount, setQuestionCount] = useState(record.questionCount || 0);
  
  // Local state to track if user has liked/questioned this session
  const [isLiked, setIsLiked] = useState(false);
  const [isQuestioned, setIsQuestioned] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update local state when record changes
  useEffect(() => {
    setLikeCount(record.likeCount || 0);
    setQuestionCount(record.questionCount || 0);
    
    // Check local storage for state
    const likedRecords = JSON.parse(localStorage.getItem('liked_records') || '[]');
    const questionedRecords = JSON.parse(localStorage.getItem('questioned_records') || '[]');
    
    setIsLiked(likedRecords.includes(record.id));
    setIsQuestioned(questionedRecords.includes(record.id));
  }, [record]);

  const handleLike = async () => {
    const likedRecords = JSON.parse(localStorage.getItem('liked_records') || '[]');
    
    if (isLiked) {
      // Unlike
      try {
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        const newLiked = likedRecords.filter((id: string) => id !== record.id);
        localStorage.setItem('liked_records', JSON.stringify(newLiked));
        await api.unlikeRecord(record.id);
      } catch (error) {
        console.error("Failed to unlike", error);
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } else {
      // Like
      try {
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        likedRecords.push(record.id);
        localStorage.setItem('liked_records', JSON.stringify(likedRecords));
        await api.likeRecord(record.id);
      } catch (error) {
        console.error("Failed to like", error);
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      }
    }
  };

  const handleQuestion = async () => {
    const questionedRecords = JSON.parse(localStorage.getItem('questioned_records') || '[]');

    if (isQuestioned) {
      // Unquestion
      try {
        setQuestionCount(prev => Math.max(0, prev - 1));
        setIsQuestioned(false);
        const newQuestioned = questionedRecords.filter((id: string) => id !== record.id);
        localStorage.setItem('questioned_records', JSON.stringify(newQuestioned));
        await api.unquestionRecord(record.id);
      } catch (error) {
        console.error("Failed to unquestion", error);
        setQuestionCount(prev => prev + 1);
        setIsQuestioned(true);
      }
    } else {
      // Question
      try {
        setQuestionCount(prev => prev + 1);
        setIsQuestioned(true);
        questionedRecords.push(record.id);
        localStorage.setItem('questioned_records', JSON.stringify(questionedRecords));
        await api.questionRecord(record.id);
      } catch (error) {
        console.error("Failed to question", error);
        setQuestionCount(prev => prev - 1);
        setIsQuestioned(false);
      }
    }
  };

  useEffect(() => {
    // Reset state when record changes
    setIsPlaying(false);
    setPlaybackTime(0);
    
    // Set duration from record if available, else default to 30
    if (record.duration) {
        setDuration(record.duration);
    } else {
        setDuration(30);
    }
    
    // Create audio element for demo
    if (record.audioUrl) {
      audioRef.current = new Audio(record.audioUrl);
      // In a real app, you'd handle loading, duration, etc.
      audioRef.current.onloadedmetadata = () => {
          if (!record.duration) {
             setDuration(audioRef.current?.duration || 30);
          }
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [record]); // Depend on record to reset

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      audioRef.current?.pause();
    } else {
      setIsPlaying(true);
      // For demo: simulate short playback
      setTimeout(() => {
        if (isPlaying) { // Check if still playing
             setIsPlaying(false);
             setPlaybackTime(0);
        }
      }, 30000); // 30s timeout
      audioRef.current?.play().catch(e => console.log("Audio play failed (likely no user interaction yet)", e));
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (playbackTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="absolute top-20 right-5 w-80 md:w-96 z-40"
    >
      {/* iOS Style Blur Card */}
      <div className="glass-panel rounded-3xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] text-white overflow-hidden relative border border-white/10">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X size={16} />
        </button>

        {/* Header: Emotion Tag */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-500/80 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            {record.emotion}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(record.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Story Content */}
        <h2 className="text-xl font-semibold mb-2 leading-tight">声音的故事</h2>
        <p className="text-sm text-gray-300 leading-relaxed font-light mb-6">
          {record.story}
        </p>

        {/* Metadata Info */}
        {(record.fileSize || record.format) && (
          <div className="flex gap-4 mb-4 text-xs text-gray-500">
             {record.format && <span>Format: {record.format.toUpperCase()}</span>}
             {record.fileSize && <span>Size: {(record.fileSize / 1024 / 1024).toFixed(2)} MB</span>}
          </div>
        )}

        {/* Audio Player */}
        <div className="bg-white/5 rounded-xl mb-6 p-4 border border-white/5">
          {/* Play Controls */}
          <div className="flex items-center justify-center space-x-6 mb-4">
            {/* Prev Button */}
            <button 
              onClick={onPrev}
              className="p-2 text-gray-400 hover:text-white transition hover:scale-110"
              disabled={!onPrev}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause size={20} className="text-black" />
              ) : (
                <Play size={20} className="text-black ml-1" />
              )}
            </button>

            {/* Next Button */}
            <button 
              onClick={onNext}
              className="p-2 text-gray-400 hover:text-white transition hover:scale-110"
              disabled={!onNext}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(playbackTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Waveform Visualization */}
          <div className="flex items-center justify-center space-x-1 mt-3 h-8">
            {[...Array(15)].map((_, i) => {
              const isActive = isPlaying && Math.random() > 0.3;
              const height = isActive ? Math.random() * 100 + 50 : 20;
              return (
                <div
                  key={i}
                  className="w-1 bg-white/40 rounded-full transition-all duration-150"
                  style={{
                    height: `${height}%`,
                    opacity: isActive ? 0.8 : 0.4
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4">
           <div className="flex space-x-2">
             {record.tags.map(tag => (
               <span key={tag} className="text-xs text-cyan-300">#{tag}</span>
             ))}
           </div>
           <div className="flex space-x-6">
             <button onClick={handleLike} className="flex items-center space-x-1 group">
               <Heart size={20} className={`transition ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-500'}`} />
               <span className="text-xs text-gray-400 group-hover:text-white">{likeCount}</span>
             </button>
             
             <button onClick={handleQuestion} className="flex items-center space-x-1 group">
               <HelpCircle size={20} className={`transition ${isQuestioned ? 'text-yellow-500' : 'text-gray-400 group-hover:text-yellow-500'}`} />
               <span className="text-xs text-gray-400 group-hover:text-white">{questionCount}</span>
             </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
