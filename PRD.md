这是一份基于你提供的 **EchoMap** 概念及现有代码框架生成的详细产品需求文档（PRD）。这份文档旨在指导开发人员直接进入编码阶段，涵盖了数据库设计、API 接口定义、AI 处理逻辑及前端组件逻辑。

---

# EchoMap 产品需求文档 (PRD) v1.0

| 版本 | 日期 | 作者 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| v1.0 | 2025-12-20 | Gem (AI) | 待开发 | 基于初始概念生成的 MVP 规格 |
| v1.1 | 2025-12-20 | Copilot | 开发中 | 后端基础架构已搭建 (DB, Models) |
| v1.2 | 2025-12-20 | Copilot | 开发中 | 后端 AI 服务集成 (External API + DeepSeek), 前端基础地图组件 (OSM iframe) |
| v1.3 | 2025-12-20 | Copilot | 验证通过 | 后端核心流程 (Upload -> AI -> DB) 经 `test_user_flow.py` 验证通过。补充环境变量配置说明。 |

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
* **Audio Analysis**: External API (Custom Model on GPUHub) for initial processing.
* **NLP (Story/Tags)**: DeepSeek LLM (via OpenAI-compatible API) for generating stories, emotion tags, and scene tags.
* **Embedding**: Currently mocked (placeholder), planned to use CLAP or similar audio encoder.


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

** Front TBD
对于“听觉叙事”这个概念，我们需要一种沉浸式（Immersive）、**灵动（Fluid）且具有连接感（Connectivity）**的设计语言。普通的 Leaflet 地图和简单的 DIV 点无法满足“年薪百万”的视觉标准。我们需要 WebGL 的力量。
🎨 设计哲学 (Design Philosophy)
材质 (Material): 使用 Glassmorphism (毛玻璃) 结合深色模式 (Dark Mode)。地图不仅是背景，是深邃的夜空或海洋；UI 悬浮其上，通透且高级。
动效 (Motion): 拒绝生硬的显隐。所有交互必须符合物理直觉（Spring Physics）。
核心视效 - "Sonic Rays" (声之射线): 当系统匹配相似声音时，我们不只是列出列表，而是要在地图上绘制出Great Circle Arcs (大圆弧)。这些光束将从用户的当前位置（原点）发散，飞向地球另一端的匹配点，寓意“声音穿越时空”。
🛠 技术选型 (Tech Stack)
Core: React 18 + TypeScript (强类型保障)
Map Engine: Mapbox GL JS (必须使用 Mapbox，Leaflet 性能和 3D 表现力不足以支撑百万级视效)
Animation: Framer Motion (UI 交互) + Mapbox Native Animations (地图光束)
Styling: Tailwind CSS (快速构建布局)

### 1.4 环境配置 (Configuration)

后端服务依赖以下环境变量 (Environment Variables)：

| 变量名 | 说明 | 默认值/示例 |
| --- | --- | --- |
| `LLM_API_KEY` | DeepSeek/OpenAI API Key | `sk-xxx` |
| `LLM_BASE_URL` | LLM API Base URL | `https://api.deepseek.com` |
| `LLM_MODEL_NAME` | 模型名称 | `deepseek-chat` |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://user:pass@localhost/dbname` |

---

## 3. 后端功能与 API 定义 (Backend Specification)

*基于 `backend/main.py` 扩展。使用 `FastAPI` 编写。*

### 3.1 核心服务类 (`backend/services/ai_service.py`)

我们需要一个服务类来封装 AI 处理逻辑。

```python
# 实际实现逻辑 (backend/services/ai_service.py)
class AIService:
    async def process_audio(self, file_bytes, filename):
        # 1. 调用外部音频分析 API
        # URL: https://u570751-8ln3hmx6jjjqkskb3rez.westc.gpuhub.com:8443/analyze
        analysis_raw = await self._call_api(file_bytes, filename)
        
        # 2. 调用 LLM (DeepSeek) 生成故事和标签
        # 基于分析结果生成结构化数据
        llm_result = await self._call_llm(analysis_raw.transcript, analysis_raw.emotion)
        
        # 3. 向量化 (Embedding)
        # 目前使用 Mock 数据，后续集成 CLAP
        vector = [0.1] * 768
        
        return {
            "transcript": llm_result.transcript,
            "story": llm_result.story,
            "emotion_tag": llm_result.emotion,
            "scene_tags": llm_result.emotion_tags,
            "embedding": vector
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

* **现状**: 使用 OpenStreetMap iframe 进行基础展示，叠加 HTML Markers。
* **开发任务**:
1. 升级为 **Mapbox GL JS** 以支持更丰富的视觉效果和交互 (WebGL)。
2. **State**:
* `viewState`: { latitude, longitude, zoom }
* `markers`: Array<AudioRecord>


3. **Effect**: 当 `viewState` 变化（拖动地图）停止后，调用 API `GET /records/map` 更新 `markers`。
4. **Interaction**: 点击 Marker，弹出一个简略卡片 (Mini Card)，包含播放按钮和情感标签。



### 4.2 组件：RecordButton (`src/app/components/RecordButton.tsx`)

* **现状**: 已实现录音功能 (MediaRecorder) 和声波可视化 (AudioContext)。上传逻辑目前为 Mock。
* **开发任务**:
1. **Upload Logic**:
* 将 `Blob` 转换为 `File` 对象。
* 获取当前地理位置 (Geolocation API)。
* 调用 `POST /api/v1/records/upload` 上传音频和坐标。
2. **Feedback**: 上传期间显示 Loading 动画，成功后在地图当前位置添加一个临时 Marker。



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

1. **Backend**: 设置 PostgreSQL 数据库，安装 PostGIS 和 pgvector 扩展。 [已完成]
2. **Backend**: 定义 SQLAlchemy Models (`User`, `AudioRecord`)。 [已完成]
3. **Frontend**: 替换 `MapComponent` 中的 Mock 逻辑，接入真实的 Map SDK (Leaflet/Mapbox)。 [进行中 - 目前使用 OSM iframe]

### 第二阶段：录制与存储 (Day 3-4)

1. **Frontend**: 完善 `RecordButton`，实现真实的录音生成 Blob。 [已完成]
2. **Backend**: 实现文件上传接口，保存音频文件至本地 `static` 目录。 [已完成]
3. **Backend**: 实现简单的写库逻辑。 [已完成]

### 第三阶段：AI 大脑接入 (Day 5-6)

1. **Backend**: 集成外部音频分析 API 和 DeepSeek LLM。 [已完成]
2. **Backend**: 编写 `AIService`，实现 `process_audio` 异步任务。 [已完成]
3. **Backend**: 测试音频上传后，数据库自动生成 story 和 transcript。 [已验证 - test_user_flow.py]

### 第四阶段：地图交互与共鸣 (Day 7+)

1. **Backend**: 实现 `Geo-Query` 接口。 [已完成]
2. **Backend**: 实现 `Vector Search` 接口（目前 Mock，需接入真实 Embedding）。 [待办]
3. **Frontend**: 对接地图 Marker 展示，完成“点击 Marker -> 播放 -> 推荐相似”的闭环。 [待办]

---

## 7. 下一步行动计划 (Next Steps)

基于当前进度（后端核心功能已通过 `test_user_flow.py` 验证），接下来的重点是前端功能的实装和前后端联调。

1. **Frontend**: 在 `frontend/src/app/components/RecordButton.tsx` 中移除 `setTimeout` 模拟，调用后端 `POST /api/v1/records/upload` 接口。
2. **Frontend**: 升级 `MapComponent` 为 Mapbox GL JS，实现更酷炫的视觉效果。
3. **Backend**: 完善 Vector Search，替换 Mock 的 Embedding 数据。
