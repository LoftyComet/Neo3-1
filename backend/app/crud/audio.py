from sqlalchemy.orm import Session
from backend.app.models.audio import AudioRecord
from backend.app.schemas.audio import AudioRecordCreate
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from typing import Optional
from uuid import UUID

def create_audio_record(db: Session, record: AudioRecordCreate, file_path: str, user_id: Optional[UUID] = None):
    # 创建 PostGIS 点
    # 使用 WKT (Well-Known Text) 格式插入
    point_wkt = f'POINT({record.longitude} {record.latitude})'
    
    db_record = AudioRecord(
        user_id=user_id,
        file_path=file_path,
        latitude=record.latitude,
        longitude=record.longitude,
        location_geo=point_wkt, # GeoAlchemy2 会自动处理 WKT 字符串
        duration=record.duration,
        emotion_tag=record.emotion_tag,
        scene_tags=record.scene_tags,
        transcript=record.transcript,
        generated_story=record.generated_story
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def get_records(db: Session, skip: int = 0, limit: int = 100):
    return db.query(AudioRecord).offset(skip).limit(limit).all()

def get_records_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100):
    return db.query(AudioRecord).filter(AudioRecord.user_id == user_id).offset(skip).limit(limit).all()

def get_latest_records(db: Session, limit: int = 10):
    return db.query(AudioRecord).order_by(AudioRecord.created_at.desc()).limit(limit).all()

def get_record(db: Session, record_id: str):
    return db.query(AudioRecord).filter(AudioRecord.id == record_id).first()

def update_audio_record(db: Session, record_id: str, update_data: dict):
    db_record = get_record(db, record_id)
    if not db_record:
        return None
    
    for key, value in update_data.items():
        if hasattr(db_record, key):
            setattr(db_record, key, value)
    
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def get_records_in_bounds(
    db: Session, 
    min_lat: float, 
    max_lat: float, 
    min_lng: float, 
    max_lng: float,
    limit: int = 100
):
    """
    查询指定矩形区域内的音频记录
    """
    # 使用 ST_MakeEnvelope 构建矩形区域 (SRID 4326)
    # 参数顺序: min_lng, min_lat, max_lng, max_lat, srid
    bbox = func.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    
    return db.query(AudioRecord).filter(
        # 使用 && 操作符进行边界框重叠查询 (利用空间索引)
        # 或者使用 ST_Within(AudioRecord.location_geo, bbox)
        AudioRecord.location_geo.ST_Within(bbox)
    ).limit(limit).all()