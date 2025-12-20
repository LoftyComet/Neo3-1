"use client";

import { useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecordButton() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleRecord = () => {
    if (isRecording) {
      // Stop recording logic here
      setIsRecording(false);
      setIsProcessing(true);
      
      // Simulate processing
      setTimeout(() => {
        setIsProcessing(false);
        alert("Audio processed! (Simulation)");
      }, 2000);
    } else {
      // Start recording logic here
      setIsRecording(true);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleToggleRecord}
        disabled={isProcessing}
        className={`
          flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200'}
          ${isProcessing ? 'opacity-80 cursor-not-allowed' : ''}
        `}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-white dark:text-black animate-spin" />
        ) : isRecording ? (
          <Square className="w-6 h-6 text-white fill-current" />
        ) : (
          <Mic className="w-8 h-8 text-white dark:text-black" />
        )}
      </motion.button>
      
      {isRecording && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm whitespace-nowrap"
        >
          Recording...
        </motion.div>
      )}
    </div>
  );
}
