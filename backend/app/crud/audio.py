from sqlalchemy.orm import Session
from backend.app.models.audio import AudioRecord
from backend.app.schemas.audio import AudioRecordCreate
from typing import Optional, List
from uuid import UUID

# --- 基础 CRUD 操作 ---

def create_audio_record(db: Session, record: AudioRecordCreate, file_path: str, user_id: Optional[UUID] = None):
    point_wkt = f'POINT({record.longitude} {record.latitude})'
    
    db_record = AudioRecord(
        user_id=user_id,
        file_path=file_path,
        latitude=record.latitude,
        longitude=record.longitude,
        location_geo=point_wkt,
        duration=record.duration,
        file_size=record.file_size,
        format=record.format,
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
        
    db.commit()
    db.refresh(db_record)
    return db_record

def increment_like(db: Session, record_id: str):
    db_record = get_record(db, record_id)
    if db_record:
        db_record.like_count += 1
        db.commit()
        db.refresh(db_record)
    return db_record

def decrement_like(db: Session, record_id: str):
    db_record = get_record(db, record_id)
    if db_record and db_record.like_count > 0:
        db_record.like_count -= 1
        db.commit()
        db.refresh(db_record)
    return db_record

def increment_question(db: Session, record_id: str):
    db_record = get_record(db, record_id)
    if db_record:
        db_record.question_count += 1
        db.commit()
        db.refresh(db_record)
    return db_record

def decrement_question(db: Session, record_id: str):
    db_record = get_record(db, record_id)
    if db_record and db_record.question_count > 0:
        db_record.question_count -= 1
        db.commit()
        db.refresh(db_record)
    return db_record