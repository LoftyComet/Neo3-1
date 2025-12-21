import os
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app import models, schemas, crud
from app.core.database import SessionLocal, engine
from app.services import audio_service

# 创建必要的数据库扩展
#Deli added 
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"vector\""))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"postgis\""))
        conn.commit()
        print("Database extensions created successfully")
except Exception as e:
    print(f"Error creating extensions: {e}")

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
# Use absolute path to be safe
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(os.path.join(STATIC_DIR, "uploads"), exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

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
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: Optional[str] = Form(None),
    time_period: str = Form("Unknown"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await audio_service.upload_and_process(
        db=db,
        file=file,
        latitude=latitude,
        longitude=longitude,
        user_id=user_id,
        time_period=time_period
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

# --- Audio Endpoints ---

@app.post("/audio/upload", response_model=schemas.AudioRecord)
async def upload_audio(
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
    # user_id: str = Depends(get_current_user) # Uncomment when auth is ready
):
    return await audio_service.upload_and_process(db, file, latitude, longitude, background_tasks)

@app.get("/audio/resonance", response_model=list[schemas.AudioRecord])
def get_resonance_audio(city: str, current_hour: int, db: Session = Depends(get_db)):
    """
    策略一：时空共鸣
    前端传入当前城市和当前小时数 (0-23)，返回此时此刻最应景的声音。
    """
    return audio_service.get_city_resonance_records(db, city=city, current_hour=current_hour)

@app.get("/audio/culture", response_model=list[schemas.AudioRecord])
def get_culture_audio(city: str, db: Session = Depends(get_db)):
    """
    策略二：文化声标
    返回该城市最具文化代表性的声音（方言、叫卖、钟声等）。
    """
    return audio_service.get_cultural_recommendations(db, city=city)

@app.get("/audio/roaming", response_model=list[schemas.AudioRecord])
def get_roaming_audio(city: str, lat: float, lng: float, db: Session = Depends(get_db)):
    """
    策略三：乡愁漫游
    前端传入目标城市和用户当前的经纬度。
    后台自动判断是“本地探索”还是“异地乡愁”，并返回对应声音。
    """
    return audio_service.get_roaming_records(db, city=city, user_lat=lat, user_lon=lng)

@app.get("/audio/{record_id}", response_model=schemas.AudioRecord)
def read_audio(record_id: str, db: Session = Depends(get_db)):
    db_audio = crud.audio.get_record(db, record_id=record_id)
    if db_audio is None:
        raise HTTPException(status_code=404, detail="Audio not found")
    return db_audio