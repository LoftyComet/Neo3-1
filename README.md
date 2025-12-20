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

## 运行项目

### 启动后端
`uvicorn backend.app.main:app --reload`

### 启动前端
`cd frontend
npm run dev`