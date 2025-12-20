from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app import schemas
from app.core.database import SessionLocal
from app.services import audio_service

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload", response_model=schemas.AudioRecord)
async def upload_audio(
    background_tasks: BackgroundTasks,
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    上传音频文件并处理
    """
    return await audio_service.upload_and_process(
        db=db,
        file=file,
        latitude=latitude,
        longitude=longitude,
        user_id=user_id,
        background_tasks=background_tasks
    )

@router.get("/map", response_model=list[schemas.AudioRecord])
def get_map_records(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """
    获取地图上的音频记录
    """
    from app.crud import audio as audio_crud
    records = audio_crud.get_records(db, skip=skip, limit=limit)
    return records

@router.get("/latest", response_model=list[schemas.AudioRecord])
def get_latest_records(
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    """
    获取最新的音频记录
    """
    from app.crud import audio as audio_crud
    records = audio_crud.get_latest_records(db, limit=limit)
    return records

@router.get("/{record_id}", response_model=schemas.AudioRecord)
def read_audio_record(record_id: str, db: Session = Depends(get_db)):
    """
    获取单个音频记录详情
    """
    from app.crud import audio as audio_crud
    record = audio_crud.get_record(db, record_id=record_id)
    if record is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Record not found")
    return record
