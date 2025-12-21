import os
import shutil
import uuid
import mutagen
import requests
import json
import subprocess
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, desc, or_, cast, String, and_
from geoalchemy2.elements import WKTElement
from app import schemas, crud
from app.models.audio import AudioRecord
from app.services.ai_service import ai_service
from app.core.database import SessionLocal

class AudioService:
    def __init__(self):
        # Use absolute path for upload directory
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.upload_dir = os.path.join(BASE_DIR, "static", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # --- 向量检索配置 ---
        self.embedding_api_url = os.getenv("EMBEDDING_API_URL", "https://api.siliconflow.cn/v1/embeddings")
        self.embedding_api_key = os.getenv("EMBEDDING_API_KEY", "sk-irmlnxewkglpbsrdunduprnptlesoersihmxptwszornttyw")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL_NAME", "netease-youdao/bce-embedding-base_v1") 
        self.embedding_dim = int(os.getenv("EMBEDDING_DIM", "768"))

    def _get_audio_metadata(self, file_path: str):
        """使用 ffprobe 提取音频元数据"""
        try:
            # 检查 ffprobe 是否可用
            try:
                subprocess.run(["ffprobe", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("ffprobe not found, falling back to basic file info")
                return 0.0, "unknown"

            cmd = [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"ffprobe error: {result.stderr}")
                return 0.0, "unknown"
            
            data = json.loads(result.stdout)
            
            # 尝试从 format 中获取 duration
            duration = 0.0
            if "format" in data and "duration" in data["format"]:
                try:
                    duration = float(data["format"]["duration"])
                except ValueError:
                    pass
            
            # 格式
            file_format = "unknown"
            if "format" in data and "format_name" in data["format"]:
                file_format = data["format"]["format_name"]
                
            return duration, file_format
        except Exception as e:
            print(f"Error extracting metadata with ffprobe: {e}")
            return 0.0, "unknown"

    def _get_embedding(self, text: str):
        """调用外部 API 获取文本的 Embedding 向量"""
        if not text or not self.embedding_api_key:
            return None
        try:
            headers = {
                "Authorization": f"Bearer {self.embedding_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "input": text.replace("\n", " "),
                "model": self.embedding_model_name
            }
            response = requests.post(self.embedding_api_url, json=payload, headers=headers, timeout=3)
            if response.status_code == 200:
                data = response.json()
                embedding = data["data"][0]["embedding"]
                if len(embedding) > self.embedding_dim:
                    return embedding[:self.embedding_dim]
                return embedding
            else:
                print(f"[Embedding Error] {response.status_code}: {response.text}")
                return None
        except Exception as e:
            print(f"[Embedding Error] {e}")
            return None

    def _build_hard_location_filter(self, query_str: str):
        """
        构建地名硬规则过滤器。
        如果搜索词包含地名，则必须匹配 City 或 District。
        """
        if not query_str:
            return None
            
        # 简单的启发式：如果 query 包含 "市" 或 "区" 或 "县"，则认为是地名搜索
        # 或者可以维护一个地名列表，这里简化处理
        keywords = query_str.strip().split()
        location_filters = []
        
        for kw in keywords:
            # 只有当关键词看起来像地名时，才强制匹配地名
            # 这里假设用户搜 "上海" 或 "上海市" 都算
            # 注意：这只是一个简单的策略，实际可能需要更复杂的 NLP
            if len(kw) >= 2: 
                location_filters.append(or_(
                    AudioRecord.city.ilike(f"%{kw}%"),
                    AudioRecord.district.ilike(f"%{kw}%")
                ))
        
        if location_filters:
            # 如果检测到潜在地名，返回 OR 条件（只要匹配其中一个地名即可，或者根据需求改为 AND）
            # 这里为了宽容度，只要匹配到任意一个地名关键词即可
            return or_(*location_filters)
        return None

    def _build_search_filter(self, query_str: str):
        """构建通用关键词搜索过滤器"""
        if not query_str:
            return True
        keywords = query_str.strip().split()
        filters = []
        for kw in keywords:
            kw_filter = or_(
                AudioRecord.city.ilike(f"%{kw}%"),
                AudioRecord.district.ilike(f"%{kw}%"),
                cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"),
                AudioRecord.transcript.ilike(f"%{kw}%"),
                AudioRecord.generated_story.ilike(f"%{kw}%")
            )
            filters.append(kw_filter)
        return and_(*filters)

    async def regenerate_record(self, db: Session, record_id: str):
        record = crud.audio.get_record(db, record_id)
        if not record:
            return None
        
        # Use existing transcript and emotion to regenerate story and tags
        transcript = record.transcript or ""
        emotion = record.emotion_tag or ""

        new_content = await ai_service.regenerate_content(transcript, emotion)
        
        update_data = {
            "scene_tags": new_content.get("scene_tags"),
            "generated_story": new_content.get("story")
        }
        
        # Re-calculate embedding
        text_parts = [
            f"城市: {record.city or ''}",
            f"标签: {', '.join(new_content.get('scene_tags', []))}",
            f"情感: {emotion}",
            f"内容: {new_content.get('story') or transcript or ''}"
        ]
        text_to_embed = " ".join(text_parts)
        
        if text_to_embed and self.embedding_api_key:
            embedding_vector = self._get_embedding(text_to_embed)
            if embedding_vector:
                update_data["embedding"] = embedding_vector

        return crud.audio.update_audio_record(db, record_id, update_data)

    async def process_audio_background(self, record_id: str, file_path: str):
        """后台任务：AI 分析 + 生成 Embedding + 更新数据库"""
        print(f"Starting background processing for record {record_id}...")
        db = SessionLocal()
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            filename = os.path.basename(file_path)
            ai_result = await ai_service.process_audio(file_bytes, filename)
            
            # 组合多维度信息生成更丰富的语义向量
            # 包含：城市、标签、情感、故事内容
            text_parts = [
                f"城市: {ai_result.get('city', '')}", # 假设 AI 结果里没 city，这里可能需要从 DB 查，暂时留空
                f"标签: {', '.join(ai_result.get('scene_tags', []))}",
                f"情感: {ai_result.get('emotion_tag', '')}",
                f"内容: {ai_result.get('story') or ai_result.get('transcript') or ''}"
            ]
            text_to_embed = " ".join(text_parts)
            
            embedding_vector = None
            if text_to_embed and self.embedding_api_key:
                embedding_vector = self._get_embedding(text_to_embed)
            
            if not embedding_vector:
                embedding_vector = [0.0] * self.embedding_dim

            update_data = {
                "transcript": ai_result.get("transcript"),
                "emotion_tag": ai_result.get("emotion_tag"),
                "generated_story": ai_result.get("story"),
                "scene_tags": ai_result.get("scene_tags"),
                "embedding": embedding_vector
            }
            crud.audio.update_audio_record(db, record_id, update_data)
            print(f"Background processing for record {record_id} completed.")
        except Exception as e:
            print(f"Error in background processing for record {record_id}: {e}")
        finally:
            db.close()

    def get_city_resonance_records(self, db: Session, city: str, current_hour: int, limit: int = 20):
        """
        策略一：时空共鸣 - 硬规则 + 向量排序
        规则：
        1. [硬] 时间必须匹配 (前后2小时)。
        2. [硬] 如果搜了地名，必须匹配地名。
        3. [软] 向量相似度排序。
        """
        query_embedding = self._get_embedding(city)
        
        # 1. 时间硬规则
        target_utc_hour = (current_hour - 8) % 24
        min_hour = target_utc_hour - 2
        max_hour = target_utc_hour + 2
        
        time_filter = None
        if min_hour < 0:
            time_filter = or_(extract('hour', AudioRecord.created_at) >= (24 + min_hour), extract('hour', AudioRecord.created_at) <= max_hour)
        elif max_hour >= 24:
            time_filter = or_(extract('hour', AudioRecord.created_at) >= min_hour, extract('hour', AudioRecord.created_at) <= (max_hour - 24))
        else:
            time_filter = extract('hour', AudioRecord.created_at).between(min_hour, max_hour)
            
        # 2. 地名硬规则 (尝试检测是否包含地名)
        # 如果用户搜 "上海 雨声"，则 "上海" 必须匹配 City/District
        # 这里简化处理：直接用通用搜索过滤器作为硬规则，保证关键词必须出现
        keyword_filter = self._build_search_filter(city)
        
        query = db.query(AudioRecord).filter(time_filter, keyword_filter)
        
        if query_embedding:
            # 向量排序
            query = query.order_by(
                AudioRecord.embedding.cosine_distance(query_embedding),
                AudioRecord.like_count.desc()
            )
        else:
            query = query.order_by(AudioRecord.like_count.desc())
            
        records = query.limit(limit).all()
        
        # 兜底：如果硬规则太严没结果，尝试放宽时间限制，但保留关键词限制
        if not records:
            print(f"No resonance records found, relaxing time constraint.")
            query = db.query(AudioRecord).filter(keyword_filter)
            if query_embedding:
                query = query.order_by(AudioRecord.embedding.cosine_distance(query_embedding))
            records = query.limit(limit).all()
            
        return records

    def get_cultural_recommendations(self, db: Session, city: str, limit: int = 20):
        """
        策略二：文化声标 - 硬规则 + 向量排序
        """
        query_embedding = self._get_embedding(city)
        keyword_filter = self._build_search_filter(city)
        
        cultural_keywords = ['方言', '叫卖', '钟声', '戏曲', '集市', '夜市', '地铁报站', '寺庙', '老街', '茶馆']
        score_expression = sum(
            case(
                (cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"), 1),
                (AudioRecord.transcript.ilike(f"%{kw}%"), 1),
                else_=0
            ) for kw in cultural_keywords
        )
        
        # 必须满足关键词匹配
        query = db.query(AudioRecord).filter(keyword_filter)
        
        if query_embedding:
            # 优先文化分，其次向量距离
            query = query.order_by(
                desc(score_expression),
                AudioRecord.embedding.cosine_distance(query_embedding)
            )
        else:
            query = query.order_by(desc(score_expression), desc(AudioRecord.like_count))
            
        return query.limit(limit).all()

    def get_roaming_records(self, db: Session, city: str, user_lat: float, user_lon: float, limit: int = 20):
        """
        策略三：乡愁漫游 - 严格距离规则 + 向量排序
        规则：
        1. [硬] 必须先计算出目标城市的中心。
        2. [硬] 计算用户距离，判断模式 (乡愁 vs 探索)。
        3. [硬] 必须匹配搜索关键词 (地名等)。
        4. [软] 向量相似度排序。
        """
        query_embedding = self._get_embedding(city)
        keyword_filter = self._build_search_filter(city)
        
        # 1. 计算中心点 (必须基于关键词过滤后的结果，否则 "上海" 搜出 "北京" 的中心就乱了)
        city_center_query = db.query(
            func.ST_X(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo))),
            func.ST_Y(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo)))
        ).filter(keyword_filter).first()
        
        is_roaming = False
        distance_meters = 0
        
        if city_center_query and city_center_query[0] is not None:
            city_lon, city_lat = city_center_query
            user_point = WKTElement(f'POINT({user_lon} {user_lat})', srid=4326)
            city_point = func.ST_SetSRID(func.ST_MakePoint(city_lon, city_lat), 4326)
            distance_meters = db.scalar(func.ST_DistanceSphere(city_point, user_point))
            
            # 硬规则：距离 > 100km 才是乡愁
            if distance_meters and distance_meters > 100000:
                is_roaming = True
        
        # 定义加权关键词
        if is_roaming:
            # 乡愁模式：加权生活气息
            keywords = ["生活", "方言", "雨声", "做饭", "猫", "狗", "巷子", "童年", "老", "家乡", "煮"]
        else:
            # 探索模式：加权地标
            keywords = ["景点", "地标", "广场", "活动", "打卡", "中心", "夜景", "游乐园", "博物馆"]
            
        score_expression = sum(
            case(
                (cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"), 1),
                (AudioRecord.transcript.ilike(f"%{kw}%"), 1),
                else_=0
            ) for kw in keywords
        )
        
        # 基础查询：必须满足关键词
        query = db.query(AudioRecord).filter(keyword_filter)
        
        if query_embedding:
            # 排序：场景加权分 -> 向量距离 -> 热度
            query = query.order_by(
                desc(score_expression),
                AudioRecord.embedding.cosine_distance(query_embedding),
                desc(AudioRecord.like_count)
            )
        else:
            query = query.order_by(
                desc(score_expression),
                desc(AudioRecord.like_count)
            )
        
        return query.limit(limit).all()

    async def upload_and_process(
        self, 
        db: Session, 
        file: UploadFile, 
        latitude: float, 
        longitude: float, 
        background_tasks: BackgroundTasks,
        user_id: str = None
    ) -> schemas.AudioRecord:
        """Handles file upload, DB record creation, and triggers background processing."""
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            file_ext = ".wav"
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 使用 ffprobe 提取元数据
        duration, file_format = self._get_audio_metadata(file_path)
        file_size = os.path.getsize(file_path)
        
        # 如果 ffprobe 返回的 format 包含多个（如 "matroska,webm"），取第一个
        if "," in file_format:
            file_format = file_format.split(",")[0]
            
        # 如果 ffprobe 失败，尝试使用文件扩展名作为格式
        if file_format == "unknown":
             file_format = file_ext.lstrip('.').lower()

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
        background_tasks.add_task(self.process_audio_background, str(db_record.id), file_path)
        return db_record

audio_service = AudioService()