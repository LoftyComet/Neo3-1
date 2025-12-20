import os
import shutil
import uuid
import mutagen
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, desc, or_, cast, String, and_
from geoalchemy2.elements import WKTElement
from backend.app import schemas, crud
from backend.app.models.audio import AudioRecord
from backend.app.services.ai_service import ai_service
from backend.app.core.database import SessionLocal

class AudioService:
    def __init__(self):
        self.upload_dir = "backend/static/uploads"
        os.makedirs(self.upload_dir, exist_ok=True)

    def _build_search_filter(self, query_str: str):
        """
        构建智能搜索过滤器：
        1. 支持多关键词（空格分隔）
        2. 覆盖 City, District, Tags, Transcript, Story 多个字段
        """
        if not query_str:
            return True
            
        keywords = query_str.strip().split()
        filters = []
        
        for kw in keywords:
            # 对每个关键词，只要在任意字段出现即可
            kw_filter = or_(
                AudioRecord.city.ilike(f"%{kw}%"),
                AudioRecord.district.ilike(f"%{kw}%"),
                cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"),
                AudioRecord.transcript.ilike(f"%{kw}%"),
                AudioRecord.generated_story.ilike(f"%{kw}%")
            )
            filters.append(kw_filter)
            
        # 所有关键词条件必须同时满足 (AND 关系)，提高精准度
        # 如果觉得太严，可以改为 or_(*filters)
        return and_(*filters)

    async def process_audio_background(self, record_id: str, file_path: str):
        """
        Background task to process audio using AIService and update the database.
        """
        print(f"Starting background processing for record {record_id}...")
        db = SessionLocal()
        try:
            # Read the file bytes
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            
            # Call AI Service
            filename = os.path.basename(file_path)
            ai_result = await ai_service.process_audio(file_bytes, filename)
            
            print(f"AI Service Result for {record_id}: {ai_result}") # Debug log

            # Update Database
            # Mock embedding since AI service doesn't return it yet
            mock_embedding = [0.1] * 768
            
            update_data = {
                "transcript": ai_result.get("transcript"),
                "emotion_tag": ai_result.get("emotion_tag"),
                "generated_story": ai_result.get("story"),
                "scene_tags": ai_result.get("scene_tags"),
                "embedding": mock_embedding
            }
            
            crud.audio.update_audio_record(db, record_id, update_data)
            print(f"Background processing for record {record_id} completed.")
            
        except Exception as e:
            print(f"Error in background processing for record {record_id}: {e}")
        finally:
            db.close()

    def get_city_resonance_records(self, db: Session, city: str, current_hour: int, limit: int = 20):
        """
        策略一：时空共鸣 (Time-Space Resonance) - 增强版
        逻辑：
        1. 优先：搜索词 + 当前时间段（UTC修正后）。
        2. 兜底：如果优先策略无结果，则忽略时间限制，仅按搜索词返回热门内容。
        """
        # 1. 构建搜索条件
        search_filter = self._build_search_filter(city)

        # 2. 构建时间条件 (UTC+8 -> UTC)
        target_utc_hour = (current_hour - 8) % 24
        min_hour = target_utc_hour - 2
        max_hour = target_utc_hour + 2
        
        time_filter = None
        if min_hour < 0:
            time_filter = or_(
                extract('hour', AudioRecord.created_at) >= (24 + min_hour),
                extract('hour', AudioRecord.created_at) <= max_hour
            )
        elif max_hour >= 24:
            time_filter = or_(
                extract('hour', AudioRecord.created_at) >= min_hour,
                extract('hour', AudioRecord.created_at) <= (max_hour - 24)
            )
        else:
            time_filter = extract('hour', AudioRecord.created_at).between(min_hour, max_hour)
        
        # 3. 尝试优先查询 (时间 + 关键词)
        records = db.query(AudioRecord).filter(
            search_filter,
            time_filter
        ).order_by(
            AudioRecord.like_count.desc()
        ).limit(limit).all()
        
        # 4. 兜底策略：如果没结果，去掉时间限制
        if not records:
            print(f"No resonance records found for '{city}' at hour {target_utc_hour}, falling back to general search.")
            records = db.query(AudioRecord).filter(
                search_filter
            ).order_by(
                AudioRecord.like_count.desc()
            ).limit(limit).all()
            
        return records

    def get_cultural_recommendations(self, db: Session, city: str, limit: int = 20):
        """
        策略二：文化声标 (Cultural Landmarks) - 增强版
        """
        # 1. 构建搜索条件
        search_filter = self._build_search_filter(city)

        # 定义文化关键词
        cultural_keywords = ['方言', '叫卖', '钟声', '戏曲', '集市', '夜市', '地铁报站', '寺庙', '老街', '茶馆', '博物馆', '历史']
        
        # 构建加权逻辑
        score_expression = sum(
            case(
                (cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"), 1),
                (AudioRecord.transcript.ilike(f"%{kw}%"), 1),
                else_=0
            ) for kw in cultural_keywords
        )
        
        return db.query(AudioRecord).filter(
            search_filter
        ).order_by(
            desc(score_expression),      # 优先级1：文化属性分
            desc(AudioRecord.like_count) # 优先级2：热度
        ).limit(limit).all()

    def get_roaming_records(self, db: Session, city: str, user_lat: float, user_lon: float, limit: int = 20):
        """
        策略三：乡愁漫游 (Nostalgic Roaming) - 增强版
        """
        # 1. 构建搜索条件
        search_filter = self._build_search_filter(city)

        # 2. 尝试计算几何中心
        # 注意：如果搜索结果为空，或者点太少，中心点计算可能无意义
        city_center_query = db.query(
            func.ST_X(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo))),
            func.ST_Y(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo)))
        ).filter(search_filter).first()
        
        is_roaming = False
        
        # 只有当确实找到了中心点，才进行漫游判断
        if city_center_query and city_center_query[0] is not None:
            city_lon, city_lat = city_center_query
            
            user_point = WKTElement(f'POINT({user_lon} {user_lat})', srid=4326)
            city_point = func.ST_SetSRID(func.ST_MakePoint(city_lon, city_lat), 4326)
            
            distance_meters = db.scalar(func.ST_DistanceSphere(city_point, user_point))
            
            if distance_meters and distance_meters > 100000: # 100公里
                is_roaming = True
        else:
            # 如果算不出中心点（比如搜了一个不存在的词），默认不做特殊加权，直接返回搜索结果
            pass
                
        # 3. 根据模式定义关键词
        if is_roaming:
            keywords = ["生活", "方言", "雨声", "做饭", "猫", "狗", "巷子", "童年", "老", "家乡", "煮"]
        else:
            keywords = ["景点", "地标", "广场", "活动", "打卡", "中心", "夜景", "游乐园", "博物馆"]
            
        # 4. 构建加权查询
        score_expression = sum(
            case(
                (cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"), 1),
                (AudioRecord.transcript.ilike(f"%{kw}%"), 1),
                else_=0
            ) for kw in keywords
        )
        
        return db.query(AudioRecord).filter(
            search_filter
        ).order_by(
            desc(score_expression),
            desc(AudioRecord.like_count)
        ).limit(limit).all()

    async def upload_and_process(
        self, 
        db: Session, 
        file: UploadFile, 
        latitude: float, 
        longitude: float, 
        background_tasks: BackgroundTasks,
        user_id: str = None
    ) -> schemas.AudioRecord:
        """
        Handles file upload, DB record creation, and triggers background processing.
        """
        # 1. Save the file
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            file_ext = ".wav"
            
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract metadata
        try:
            audio_meta = mutagen.File(file_path)
            duration = audio_meta.info.length if audio_meta and audio_meta.info else 0
            file_size = os.path.getsize(file_path)
            file_format = file_ext.lstrip('.').lower()
        except Exception as e:
            print(f"Error extracting metadata: {e}")
            duration = 0
            file_size = 0
            file_format = "unknown"
            
        # 2. Create DB Record (Initial state)
        record_create = schemas.AudioRecordCreate(
            latitude=latitude,
            longitude=longitude,
            duration=duration,
            file_size=file_size,
            format=file_format,
            emotion_tag="Processing...",
            scene_tags=[],
            transcript="",
            generated_story=""
        )
        
        db_record = crud.audio.create_audio_record(db, record_create, file_path, user_id=user_id)
        
        # 3. Trigger Background Task
        # Note: We pass the method of this instance
        background_tasks.add_task(self.process_audio_background, str(db_record.id), file_path)
        
        return db_record

audio_service = AudioService()
