> ⚠️ 使用限制  
> 1. 本项目采用 **Apache-2.0 许可证 + 附加条款** 双重授权。  
> 2. **任何商业用途必须事先获得书面授权**；  
> 3. **使用本代码发表科研论文者，必须将四位核心 Contributor 列为作者**（详见 [ADDITIONAL_TERMS.md](./ADDITIONAL_TERMS.md)）。
# <div align="right">
   <a href="./README.en.md" style="text-decoration:none;">
      <img src="https://img.shields.io/badge/English-Version-blue?logo=readme&logoColor=white" alt="English Version" />
   </a>
</div>
# EchoMap

## 环境配置

### 前端环境
cd frontend
npm install

### docker环境

#### 下载 docker
<https://www.docker.com/>

#### 添加环境(可能不一样)
`$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"`

#### 运行 pgvector 官方镜像
`docker run -d --name echomap-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=echomap -p 5432:5432 postgis/postgis:16-3.4`

#### 进入容器
`docker exec -it echomap-db psql -U postgres -d echomap`

-- 开启 PostGIS (镜像通常已开启，但确认一下)
`CREATE EXTENSION IF NOT EXISTS postgis;`
-- 开启 Vector (如果镜像里没有，这一步会报错)
`CREATE EXTENSION IF NOT EXISTS vector;`

> 简单的解决方案
1. 删除旧容器（如果有）
`docker rm -f echomap-db`

2. 运行 pgvector 官方镜像
`docker run -d --name echomap-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=echomap -p 5432:5432 pgvector/pgvector:pg16`

3. 进入容器安装 PostGIS (这一步需要容器内有网络)
`docker exec -u 0 -it echomap-db bash -c "apt-get update && apt-get install -y postgis postgresql-16-postgis-3"`

4. 登录数据库开启扩展
`docker exec -it echomap-db psql -U postgres -d echomap -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker exec -it echomap-db psql -U postgres -d echomap -c "CREATE EXTENSION IF NOT EXISTS vector;"`

### 后端环境
运行 `pip install -r .\backend\requirements.txt` 安装依赖

### 云端模型部署
租用一个云端GPU服务器，此处以AutoDL 4090 为例
1. 配置环境变量
`pip install -r .\docs\requirements.txt` 
2. 下载模型
`python daownload.py`
3. 运行 `python server.py` 开始模型推理，并将api暴露给6006端口，然后在autodl控制台"自定义服务"中查看6006对应的链接，即为API URL


## 数据初始化 (重要)

为了启用**语义搜索**和**时空共鸣**功能，需要初始化数据库并生成演示向量数据。

### 1. 导入基础数据
使用数据库管理工具（如 DBeaver, pgAdmin）或命令行，运行 `SQL.txt` 中的 SQL 语句。这将插入 100 条分布在全国各地的合成音频数据。

### 2. 生成 Embedding 向量
由于合成数据默认没有向量信息（无法被搜索到），需要运行初始化脚本来调用 AI 模型生成向量。

1. 确保后端环境已配置好 `EMBEDDING_API_KEY` (在 `backend/app/services/audio_service.py` 或环境变量中)。
2. 在项目根目录下运行：
   ```bash
   python -m backend.init_embeddings
## 运行项目

### 启动后端
`uvicorn backend.app.main:app --reload`

### 启动前端
`cd frontend
npm run dev`