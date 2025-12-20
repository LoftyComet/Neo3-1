export interface AudioRecord {
  id: string;
  latitude: number;
  longitude: number;
  emotion: string; // e.g., "Loneliness", "Joy"
  tags: string[];
  story: string; // AI Generated Story
  audioUrl: string;
  createdAt: string;
  duration?: number;
  fileSize?: number;
  format?: string;
  likeCount?: number;
  questionCount?: number;
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number; // 增加倾角，增加 3D 沉浸感
  bearing: number;
}