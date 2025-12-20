这是一份基于你提供的 **EchoMap** 概念及现有代码框架生成的详细产品需求文档（PRD）。这份文档旨在指导开发人员直接进入编码阶段，涵盖了数据库设计、API 接口定义、AI 处理逻辑及前端组件逻辑。

---

# EchoMap 产品需求文档 (PRD) v1.0

| 版本 | 日期 | 作者 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| v1.0 | 2025-12-20 | Gem (AI) | 待开发 | 基于初始概念生成的 MVP 规格 |

## 1. 项目概述 (Overview)

### 1.1 产品定义

EchoMap 是一个基于地理位置的声音社交平台。它利用 AI 技术将用户的环境录音（人声+背景音）转化为结构化数据（文本、情感、地理标签）和高维向量，在地图上建立听觉锚点，并支持基于“声音氛围相似度”的跨时空推荐。

### 1.2 核心价值

* **听觉数字孪生**：记录城市的听觉维度。
* **情感共鸣**：通过声音向量匹配，连接物理距离遥远但情感氛围相似的时刻。

### 1.3 技术架构概览

* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Mapbox GL JS / Leaflet (地图组件).
* **Backend**: FastAPI (Python), SQLAlchemy (ORM).
* **Database**: PostgreSQL (PostGIS 插件处理地理信息, pgvector 插件处理向量数据).
* **AI/ML**:
* ASR (语音转文字): Whisper 或 SenseVoice (API/本地部署).
* NLP (语义分析): Qwen-Audio 或 Qwen-Turbo (提取 Tag、情感、故事).
* Embedding (声纹向量化): CLAP (Contrastive Language-Audio Pretraining) 或类似音频编码器.


* **Storage**: 本地文件系统 / S3 (存储音频原文件).

---

## 2. 数据库设计 (Database Schema)

*建议使用 PostgreSQL，需开启 `postgis` 和 `vector` 扩展。*

### 2.1 Users 表 (用户)

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | UUID, PK | 用户唯一标识 |
| `username` | String | 用户名 |
| `email` | String | 邮箱 |
| `created_at` | DateTime | 注册时间 |

### 2.2 AudioRecords 表 (音频记录)

这是核心表，存储音频元数据和 AI 处理结果。

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | UUID, PK | 记录 ID |
| `user_id` | UUID, FK | 关联用户 |
| `file_path` | String | 音频文件存储路径/URL |
| `duration` | Float | 音频时长 (秒) |
| `latitude` | Float | 纬度 |
| `longitude` | Float | 经度 |
| `location_geo` | Geometry | PostGIS 点数据 (用于地理索引) |
| `transcript` | Text | ASR 转换的逐字稿 |
| `generated_story` | Text | AI 基于音频生成的短故事/描述 |
| `emotion_tag` | String | 情感标签 (如: 宁静, 喧闹, 怀旧) |
| `scene_tags` | JSON/Array | 场景标签 (如: ["茶馆", "方言", "下雨"]) |
| `embedding` | Vector(N) | 音频/文本混合向量 (pgvector) |
| `created_at` | DateTime | 创建时间 |

---

## 3. 后端功能与 API 定义 (Backend Specification)

*基于 `backend/main.py` 扩展。使用 `FastAPI` 编写。*

### 3.1 核心服务类 (`backend/services/ai_service.py`)

我们需要一个服务类来封装 AI 处理逻辑。

```python
# 伪代码逻辑
class AIService:
    async def process_audio(self, file_bytes):
        # 1. 语音转文字 (ASR)
        # 调用 Whisper/SenseVoice API
        transcript = await self.asr_model.transcribe(file_bytes)
        
        # 2. 语义分析与故事生成 (LLM)
        # 调用 Qwen API
        prompt = f"分析这段录音内容：{transcript}。1. 提取情感。2. 提取场景标签。3. 生成一段简短的各种氛围故事。"
        analysis_result = await self.llm_model.generate(prompt)
        
        # 3. 向量化 (Embedding)
        # 将音频特征或文本描述转化为向量，用于计算相似度
        vector = await self.embedding_model.encode(file_bytes/transcript)
        
        return {
            "transcript": transcript,
            "story": analysis_result.story,
            "emotion": analysis_result.emotion,
            "tags": analysis_result.tags,
            "vector": vector
        }

```

### 3.2 API 接口列表

#### A. 上传与处理

**POST** `/api/v1/records/upload`

* **功能**: 用户上传录音，后台异步触发 AI 处理。
* **Request**: `multipart/form-data` (file: audio_blob, lat: float, lng: float).
* **Process**:
1. 保存音频文件到服务器。
2. 创建数据库记录 (Status: Processing)。
3. 使用 `FastAPI.BackgroundTasks` 启动 `AIService.process_audio`。


* **Response**: `{"id": "uuid", "status": "processing"}`

#### B. 地图数据获取 (Geo-Query)

**GET** `/api/v1/records/map`

* **功能**: 获取当前地图可视区域内的音频锚点。
* **Request Params**:
* `min_lat`, `max_lat`, `min_lng`, `max_lng` (地图边界)
* OR `center_lat`, `center_lng`, `radius` (半径搜索)


* **Logic**: 使用 PostGIS 查询 `location_geo` 在范围内的记录。
* **Response**: List of `{id, lat, lng, emotion_tag, snippet}`.

#### C. 详情与播放

**GET** `/api/v1/records/{record_id}`

* **功能**: 获取单条声音的完整信息（播放URL、AI 故事、标签）。
* **Response**: `{...full_record_details, audio_url}`.

#### D. 共鸣匹配 (Vector Search)

**GET** `/api/v1/records/{record_id}/similar`

* **功能**: "寻找世上另一个我"。查找向量距离最近的 N 条记录。
* **Request Params**: `limit=5`
* **Logic**:
1. 查询当前 record 的 `embedding`。
2. 使用 pgvector (L2 distance 或 Cosine Similarity) 查询数据库中其他记录。
3. 排除地理位置极近的（可选，为了寻找异地共鸣）。


* **Response**: List of Similar Records.

---

## 4. 前端功能开发 (Frontend Specification)

*基于 `frontend/src/app` 扩展。*

### 4.1 组件：MapComponent (`src/app/components/MapComponent.tsx`)

* **现状**: 只有 Mock 的 div 点。
* **开发任务**:
1. 引入 **Mapbox GL JS** 或 **React Leaflet** (推荐 Leaflet + OpenStreetMap 降低 MVP 成本)。
2. **State**:
* `viewState`: { latitude, longitude, zoom }
* `markers`: Array<AudioRecord>


3. **Effect**: 当 `viewState` 变化（拖动地图）停止后，调用 API `GET /records/map` 更新 `markers`。
4. **Interaction**: 点击 Marker，弹出一个简略卡片 (Mini Card)，包含播放按钮和情感标签。



### 4.2 组件：RecordButton (`src/app/components/RecordButton.tsx`)

* **现状**: UI 已有，只有 `setTimeout` 模拟。
* **开发任务**:
1. 使用 Web Audio API (`MediaRecorder`) 获取麦克风权限。
2. **Recording Logic**:
* Start: `navigator.geolocation.getCurrentPosition` 获取坐标 -> `mediaRecorder.start()`.
* Stop: `mediaRecorder.stop()` -> 获取 `Blob` 数据。


3. **Upload Logic**:
* 将 Blob 封装为 `FormData`。
* 调用 API `POST /records/upload`。


4. **Feedback**: 上传期间显示 Loading 动画，成功后在地图当前位置添加一个临时 Marker。



### 4.3 页面：声音详情 Overlay (新组件 `AudioDetail.tsx`)

* **位置**: 悬浮在 Map 之上。
* **触发**: 点击地图上的 Marker。
* **内容**:
* **Player**: 进度条、波形图 (可视化)。
* **Story Card**: 显示 AI 生成的故事文本。
* **Similar Recommendation**: "世界上另一个角落的声音" —— 展示 `GET /similar` 返回的列表。点击可跳转。



---

## 5. AI Prompt 策略 (Prompt Engineering)

在 `AIService` 中调用的 LLM Prompt 设计至关重要。

**System Prompt:**

> 你是一个听觉叙事专家和情感分析师。你的任务是基于一段环境录音的转录文本（以及可选的声音分类标签），构建这段声音的“数字灵魂”。

**User Prompt 模板:**

> 录音转录内容："{transcript}"
> 录音发生的地理位置："{city}, {poi_name}" (通过逆地理编码获取)
> 时间："{time}"
> 请输出 JSON 格式，包含以下字段：
> 1. `emotion`: 用一个词概括情感氛围 (如: 孤独、热闹、治愈、紧张)。
> 2. `tags`: 3-5个关键标签 (如: 茶馆, 下雨声, 方言)。
> 3. `story`: 一段 50-100 字的短文。不要只是复述内容，要结合环境音进行想象，描绘出一幅画面，具有文学性和画面感。
> 
> 

---

## 6. 开发路线图 (Roadmap)

### 第一阶段：基础设施 (Day 1-2)

1. **Backend**: 设置 PostgreSQL 数据库，安装 PostGIS 和 pgvector 扩展。
2. **Backend**: 定义 SQLAlchemy Models (`User`, `AudioRecord`)。
3. **Frontend**: 替换 `MapComponent` 中的 Mock 逻辑，接入真实的 Map SDK (Leaflet/Mapbox)。

### 第二阶段：录制与存储 (Day 3-4)

1. **Frontend**: 完善 `RecordButton`，实现真实的录音生成 Blob。
2. **Backend**: 实现文件上传接口，保存音频文件至本地 `static` 目录或 S3。
3. **Backend**: 实现简单的写库逻辑（暂无 AI）。

### 第三阶段：AI 大脑接入 (Day 5-6)

1. **Backend**: 申请 Qwen/OpenAI/Whisper API Key。
2. **Backend**: 编写 `AIService`，实现 `process_audio` 异步任务。
3. **Backend**: 测试音频上传后，数据库是否自动生成了 story 和 transcript。

### 第四阶段：地图交互与共鸣 (Day 7+)

1. **Backend**: 实现 `Geo-Query` 接口。
2. **Backend**: 实现 `Vector Search` 接口（若无音频向量模型，初期可用 `transcript` 的文本向量代替）。
3. **Frontend**: 对接地图 Marker 展示，完成“点击 Marker -> 播放 -> 推荐相似”的闭环。

---

## 7. 立即执行的修改建议 (Immediate Actions)

基于你上传的文件，请按照以下步骤开始：

1. **Backend**: 在 `backend/requirements.txt` 中添加依赖：
```text
python-multipart
psycopg2-binary
geoalchemy2
pgvector
openai  # 或者 dashscope (阿里云 Qwen)

```


2. **Backend**: 修改 `main.py`，配置数据库连接。
3. **Frontend**: 在 `frontend/src/app/components/RecordButton.tsx` 中移除 `setTimeout` 模拟，写入真实的 `MediaRecorder` 逻辑。