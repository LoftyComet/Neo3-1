import os
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from backend.app import models, schemas, crud
from backend.app.core.database import SessionLocal, engine
from backend.app.services import audio_service

# 在应用启动时创建表 (仅用于开发环境，生产环境推荐使用 Alembic)
models.user.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sound Memory API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
# Ensure the directory exists
os.makedirs("backend/static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Sound Memory Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- User Endpoints ---

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.user.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check for username duplication as well
    db_user_by_name = db.query(models.user.User).filter(models.user.User.username == user.username).first()
    if db_user_by_name:
        raise HTTPException(status_code=400, detail="Username already taken")
        
    return crud.user.create_user(db=db, user=user)

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: str, db: Session = Depends(get_db)):
    db_user = crud.user.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/users/{user_id}/records", response_model=list[schemas.AudioRecord])
def read_user_records(user_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = crud.audio.get_records_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return records

# --- Audio Record Endpoints ---

@app.post("/api/v1/records/upload", response_model=schemas.AudioRecord)
async def upload_audio(
    background_tasks: BackgroundTasks,
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await audio_service.upload_and_process(
        db=db,
        file=file,
        latitude=latitude,
        longitude=longitude,
        user_id=user_id,
        background_tasks=background_tasks
    )

@app.get("/api/v1/records/map", response_model=list[schemas.AudioRecord])
def get_map_records(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    records = crud.audio.get_records(db, skip=skip, limit=limit)
    return records

@app.get("/api/v1/records/latest", response_model=list[schemas.AudioRecord])
def get_latest_records(
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    records = crud.audio.get_latest_records(db, limit=limit)
    return records

@app.get("/api/v1/records/{record_id}", response_model=schemas.AudioRecord)
def read_audio_record(record_id: str, db: Session = Depends(get_db)):
    record = crud.audio.get_record(db, record_id=record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@app.post("/api/v1/records/{record_id}/like", response_model=schemas.AudioRecord)
def like_audio_record(record_id: str, db: Session = Depends(get_db)):
    record = crud.audio.increment_like(db, record_id=record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@app.delete("/api/v1/records/{record_id}/like", response_model=schemas.AudioRecord)
def unlike_audio_record(record_id: str, db: Session = Depends(get_db)):
    record = crud.audio.decrement_like(db, record_id=record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@app.post("/api/v1/records/{record_id}/question", response_model=schemas.AudioRecord)
def question_audio_record(record_id: str, db: Session = Depends(get_db)):
    record = crud.audio.increment_question(db, record_id=record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@app.delete("/api/v1/records/{record_id}/question", response_model=schemas.AudioRecord)
def unquestion_audio_record(record_id: str, db: Session = Depends(get_db)):
    record = crud.audio.decrement_question(db, record_id=record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record
