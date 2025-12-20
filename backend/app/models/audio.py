import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from pgvector.sqlalchemy import Vector
from backend.app.core.database import Base

class AudioRecord(Base):
    __tablename__ = "audio_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # 允许匿名上传，或者后续关联
    
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    format = Column(String, nullable=True)
    duration = Column(Float, nullable=True)
    
    # 地理位置信息
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    # PostGIS Geometry Point (SRID 4326 is standard GPS lat/lon)
    location_geo = Column(Geometry(geometry_type='POINT', srid=4326))
    
    # AI 分析结果
    transcript = Column(Text, nullable=True)
    generated_story = Column(Text, nullable=True)
    emotion_tag = Column(String, nullable=True)
    scene_tags = Column(JSON, nullable=True) # 存储字符串数组
    
    # 新增：行政区划字段，用于精准搜索和推荐
    city = Column(String, nullable=True, index=True)     # 例如：上海市
    district = Column(String, nullable=True, index=True) # 例如：黄浦区
    
    # 向量嵌入 (假设维度为 1536，例如 OpenAI embedding，或者 768 for others)
    # 这里暂时设置为 768，具体取决于使用的模型
    embedding = Column(Vector(768), nullable=True)
    
    # 交互数据
    like_count = Column(Integer, default=0)
    question_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="records")
