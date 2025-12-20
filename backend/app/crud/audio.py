from sqlalchemy.orm import Session
from backend.app.models.audio import AudioRecord
from backend.app.schemas.audio import AudioRecordCreate
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

def create_audio_record(db: Session, record: AudioRecordCreate, file_path: str):
    # 创建 PostGIS 点
    # 使用 WKT (Well-Known Text) 格式插入
    point_wkt = f'POINT({record.longitude} {record.latitude})'
    
    db_record = AudioRecord(
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
