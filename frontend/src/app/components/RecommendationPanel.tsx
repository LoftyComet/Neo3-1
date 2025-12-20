import React, { useState, useEffect } from 'react';
import { AudioRecord } from '@/types';
import { api } from '@/services/api';

interface RecommendationPanelProps {
  currentCity: string;
  userLat: number;
  userLng: number;
  onPlayAudio: (audio: AudioRecord) => void;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ currentCity, userLat, userLng, onPlayAudio }) => {
  const [activeTab, setActiveTab] = useState<'resonance' | 'culture' | 'roaming'>('resonance');
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!currentCity) return;
      
      setLoading(true);
      try {
        let data: AudioRecord[] = [];
        if (activeTab === 'resonance') {
          const currentHour = new Date().getHours();
          data = await api.getResonanceAudio(currentCity, currentHour);
        } else if (activeTab === 'culture') {
          data = await api.getCultureAudio(currentCity);
        } else if (activeTab === 'roaming') {
          data = await api.getRoamingAudio(currentCity, userLat, userLng);
        }
        setRecords(data);
      } catch (error) {
        console.error("Failed to fetch recommendations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [activeTab, currentCity, userLat, userLng]);

  return (
    <div className="bg-white/90 backdrop-blur-md p-4 rounded-lg shadow-lg max-h-[400px] overflow-y-auto pointer-events-auto">
      <div className="flex space-x-4 mb-4 border-b pb-2">
        <button 
          onClick={() => setActiveTab('resonance')}
          className={`pb-1 ${activeTab === 'resonance' ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}
        >
          时空共鸣
        </button>
        <button 
          onClick={() => setActiveTab('culture')}
          className={`pb-1 ${activeTab === 'culture' ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}
        >
          文化声标
        </button>
        <button 
          onClick={() => setActiveTab('roaming')}
          className={`pb-1 ${activeTab === 'roaming' ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}
        >
          乡愁漫游
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">加载中...</div>
      ) : (
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-gray-500 text-center">暂无推荐内容</div>
          ) : (
            records.map(record => (
              <div key={record.id} className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition" onClick={() => onPlayAudio(record)}>
                <div className="font-medium text-gray-800 truncate">{record.story.substring(0, 30)}...</div>
                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>{record.tags.slice(0, 3).join(', ')}</span>
                  <span>❤️ {record.likeCount}</span>
                </div>
                {record.city && <div className="text-xs text-blue-500 mt-1">📍 {record.city} {record.district}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationPanel;
