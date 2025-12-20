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
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="absolute top-24 right-6 w-80 md:w-96 z-40"
    >
      {/* Apple Style Glassmorphism Card */}
      <div className="relative rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white overflow-hidden border border-white/20 bg-black/40 backdrop-blur-2xl">
        
        {/* Background Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 border border-white/10 active:scale-90"
        >
          <X size={18} className="text-white/70" />
        </button>

        {/* Header: Emotion Tag */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] bg-white/10 rounded-full border border-white/10 backdrop-blur-md text-white/90">
            {record.emotion}
          </div>
          <div className="h-1 w-1 rounded-full bg-white/20" />
          <span className="text-[10px] text-white/40 font-medium tracking-wider">
            {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Story Content */}
        <h2 className="text-2xl font-bold mb-3 tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
          声音的故事
        </h2>
        <p className="text-sm text-white/70 leading-relaxed font-light mb-8 line-clamp-4 hover:line-clamp-none transition-all duration-500">
          {record.story}
        </p>

        {/* Audio Player Section */}
        <div className="bg-white/5 rounded-[2rem] mb-8 p-6 border border-white/10 shadow-inner">
          {/* Play Controls */}
          <div className="flex items-center justify-between mb-6 px-2">
            {/* Prev Button */}
            <button 
              onClick={onPrev}
              className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300 active:scale-75"
              disabled={!onPrev}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(255,255,255,0.2)] hover:scale-105 transition-all duration-300 active:scale-90 group"
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} className="ml-1" fill="currentColor" />
              )}
            </button>

            {/* Next Button */}
            <button 
              onClick={onNext}
              className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300 active:scale-75"
              disabled={!onNext}
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3 px-2">
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "tween", ease: "linear" }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-medium tracking-tighter text-white/30">
              <span>{formatTime(playbackTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2">
           <div className="flex flex-wrap gap-2 max-w-[60%]">
             {record.tags.slice(0, 2).map(tag => (
               <span key={tag} className="text-[10px] font-medium text-[#A7BBC7] px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
                 #{tag}
               </span>
             ))}
           </div>
           <div className="flex items-center space-x-5">
             <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
               <Heart size={22} className={`transition-all duration-300 ${isLiked ? 'fill-[#B48484] text-[#B48484] scale-110' : 'text-white/30 group-hover:text-[#B48484]'}`} />
               <span className="text-[9px] font-bold text-white/30 group-hover:text-white/60">{likeCount}</span>
             </button>
             
             <button onClick={handleQuestion} className="flex flex-col items-center gap-1 group">
               <HelpCircle size={22} className={`transition-all duration-300 ${isQuestioned ? 'text-[#D4A373] scale-110' : 'text-white/30 group-hover:text-[#D4A373]'}`} />
               <span className="text-[9px] font-bold text-white/30 group-hover:text-white/60">{questionCount}</span>
             </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
