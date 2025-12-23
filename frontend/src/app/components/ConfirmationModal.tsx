import React, { useState } from 'react';
import { AudioRecord } from '@/types';
import { api } from '@/services/api';
import { X, RefreshCw, Check, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  record: AudioRecord;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ record, onConfirm, onCancel }) => {
  const [emotion, setEmotion] = useState(record.emotion);
  const [tags, setTags] = useState(record.tags.join(', '));
  const [story, setStory] = useState(record.story);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const newRecord = await api.regenerateRecord(record.id);
      setEmotion(newRecord.emotion);
      setTags(newRecord.tags.join(', '));
      setStory(newRecord.story);
    } catch (e) {
      console.error("Failed to regenerate", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await api.updateRecord(record.id, {
        emotion_tag: emotion,
        scene_tags: tags.split(',').map(t => t.trim()).filter(t => t),
        generated_story: story
      });
      onConfirm();
    } catch (e) {
      console.error("Failed to update", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">确认音频信息</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">情感氛围</label>
            <input
              type="text"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">场景标签 (逗号分隔)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">生成故事</label>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={4}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || isSaving}
            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {isRegenerating ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            重新生成
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isRegenerating || isSaving}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl transition-colors disabled:opacity-50 font-medium"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            确认发布
          </button>
        </div>
      </div>
    </div>
  );
};
