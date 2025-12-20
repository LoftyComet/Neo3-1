import sys
import os
import asyncio

# 将当前目录添加到 Python 跑道，确保能导入 backend 模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.core.database import SessionLocal
from backend.app.models.audio import AudioRecord
from backend.app.services.audio_service import audio_service

def init_embeddings():
    db = SessionLocal()
    try:
        # 1. 查询所有 embedding 为空的记录
        # 注意：根据数据库不同，空可能是 None
        records = db.query(AudioRecord).filter(AudioRecord.embedding == None).all()
        
        print(f"Found {len(records)} records needing embeddings...")
        
        count = 0
        for record in records:
            # 组合多维度信息生成更丰富的语义向量
            text_parts = [
                f"城市: {record.city or ''}",
                f"标签: {', '.join(record.scene_tags) if record.scene_tags else ''}",
                f"情感: {record.emotion_tag or ''}",
                f"内容: {record.generated_story or record.transcript or ''}"
            ]
            text_content = " ".join(text_parts)
            
            if not text_content:
                print(f"Skipping record {record.id}: No text content.")
                continue
                
            print(f"[{count+1}/{len(records)}] Generating embedding for: {record.city} - {text_content[:20]}...")
            
            # 调用 Service 里的方法生成向量
            # 注意：这里复用了 audio_service 里的配置和方法
            vector = audio_service._get_embedding(text_content)
            
            if vector:
                record.embedding = vector
                count += 1
            else:
                print(f"Failed to generate embedding for {record.id}")
                
            # 每处理 10 条提交一次，防止 API 超时或内存溢出
            if count % 10 == 0:
                db.commit()
                print("--- Batch committed ---")
        
        db.commit()
        print(f"Successfully updated {count} records!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting embedding initialization...")
    init_embeddings()