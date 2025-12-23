import React from 'react';
import { motion } from 'framer-motion';

export const ProcessingAnimation: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute w-32 h-32 border-4 border-purple-500/30 rounded-full border-t-purple-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner pulsing circle */}
        <motion.div
          className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center backdrop-blur-md border border-purple-500/50"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="w-12 h-12 bg-white rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
      
      <motion.p
        className="mt-8 text-white text-lg font-medium tracking-wider"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        正在分析音频...
      </motion.p>
      <p className="mt-2 text-white/50 text-sm">生成故事与情感标签中</p>
    </div>
  );
};
