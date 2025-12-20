from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class AudioRecordBase(BaseModel):
    latitude: float
    longitude: float
    duration: Optional[float] = None
    file_size: Optional[int] = None
    format: Optional[str] = None
    emotion_tag: Optional[str] = None
    scene_tags: Optional[List[str]] = None
    transcript: Optional[str] = None
    generated_story: Optional[str] = None

class AudioRecordCreate(AudioRecordBase):
    # 上传时可能只需要 lat/lng，其他由后台生成
    pass

class AudioRecord(AudioRecordBase):
    id: UUID
    user_id: Optional[UUID] = None
    file_path: str
    created_at: datetime
    like_count: int = 0
    question_count: int = 0
    
    # 注意：通常不直接返回 embedding 向量给前端，除非有特殊需求
    
    class Config:
        from_attributes = True
