from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, desc, or_, cast, String, and_
from backend.app.models.audio import AudioRecord
from backend.app.schemas.audio import AudioRecordCreate
from geoalchemy2.elements import WKTElement
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

# --- 核心策略实现 ---

def get_city_resonance_records(db: Session, city: str, current_hour: int, limit: int = 20):
    """
    策略一：时空共鸣 (Time-Space Resonance)
    逻辑：获取指定城市中，与当前时间段（前后2小时）氛围相符的声音。
    处理了跨午夜的时间计算（例如 23:00 的范围是 21:00 - 01:00）。
    """
    min_hour = current_hour - 2
    max_hour = current_hour + 2
    
    time_filter = None
    
    # 处理跨天逻辑
    if min_hour < 0:
        # 例如 current=1 (01:00), min=-1 (23:00), max=3 (03:00)
        # 范围应为: [23, 24) OR [0, 3]
        time_filter = or_(
            extract('hour', AudioRecord.created_at) >= (24 + min_hour),
            extract('hour', AudioRecord.created_at) <= max_hour
        )
    elif max_hour >= 24:
        # 例如 current=23 (23:00), min=21, max=25 (01:00)
        # 范围应为: [21, 24) OR [0, 1]
        time_filter = or_(
            extract('hour', AudioRecord.created_at) >= min_hour,
            extract('hour', AudioRecord.created_at) <= (max_hour - 24)
        )
    else:
        # 正常范围
        time_filter = extract('hour', AudioRecord.created_at).between(min_hour, max_hour)
    
    return db.query(AudioRecord).filter(
        AudioRecord.city == city,
        time_filter
    ).order_by(
        AudioRecord.like_count.desc()
    ).limit(limit).all()

def get_cultural_recommendations(db: Session, city: str, limit: int = 20):
    """
    策略二：文化声标 (Cultural Landmarks)
    逻辑：优先展示具有强烈文化属性的声音。
    通过 SQL Case When 动态计算权重，不依赖外部搜索引擎。
    """
    # 定义文化关键词
    cultural_keywords = ['方言', '叫卖', '钟声', '戏曲', '集市', '夜市', '地铁报站', '寺庙', '老街', '茶馆']
    
    # 构建加权逻辑: 匹配一个关键词得 1 分
    # 注意：scene_tags 是 JSON 类型，需要 cast 为 String 才能进行 ilike 模糊匹配
    score_expression = sum(
        case(
            (cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"), 1),
            (AudioRecord.transcript.ilike(f"%{kw}%"), 1),
            else_=0
        ) for kw in cultural_keywords
    )
    
    return db.query(AudioRecord).filter(
        AudioRecord.city == city
    ).order_by(
        desc(score_expression),      # 优先级1：文化属性分
        desc(AudioRecord.like_count) # 优先级2：热度
    ).limit(limit).all()

def get_roaming_records(db: Session, city: str, user_lat: float, user_lon: float, limit: int = 20):
    """
    策略三：乡愁漫游 (Nostalgic Roaming)
    逻辑：
    1. 计算目标城市所有音频的几何中心。
    2. 计算用户当前位置与该中心的距离。
    3. 如果距离 > 100km，判定为“异地/乡愁模式”，优先推荐生活化、方言类声音。
    4. 如果距离 <= 100km，判定为“本地/探索模式”，优先推荐地标、景点类声音。
    """
    
    # 1. 计算目标城市的几何中心 (无需外部 API，直接利用现有数据)
    # ST_Centroid 计算几何中心，ST_Collect 将所有点聚合
    city_center_query = db.query(
        func.ST_X(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo))),
        func.ST_Y(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo)))
    ).filter(AudioRecord.city == city).first()
    
    is_roaming = False
    
    if city_center_query and city_center_query[0] is not None:
        city_lon, city_lat = city_center_query
        
        # 2. 计算距离 (使用 PostGIS ST_DistanceSphere 计算球面距离，单位：米)
        user_point = WKTElement(f'POINT({user_lon} {user_lat})', srid=4326)
        city_point = func.ST_SetSRID(func.ST_MakePoint(city_lon, city_lat), 4326)
        
        distance_meters = db.scalar(func.ST_DistanceSphere(city_point, user_point))
        
        if distance_meters and distance_meters > 100000: # 100公里
            is_roaming = True
            
    # 3. 根据模式定义关键词
    if is_roaming:
        # 【乡愁模式】：游子更想听到的生活气息
        keywords = ["生活", "方言", "雨声", "做饭", "猫", "狗", "巷子", "童年", "老", "家乡", "煮"]
    else:
        # 【探索模式】：游客更想听到的地标打卡
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
        AudioRecord.city == city
    ).order_by(
        desc(score_expression),
        desc(AudioRecord.like_count)
    ).limit(limit).all()