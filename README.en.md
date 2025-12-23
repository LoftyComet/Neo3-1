> ⚠️ Usage Restrictions
> 1. This project is dual-licensed under **Apache-2.0 + Additional Terms**.
> 2. **Any commercial use requires prior written authorization.**
> 3. **If you use this code for academic publications, you must list the four core Contributors as co-authors** (see [Additional_Terms.md](./Additional_Terms.md)).

# EchoMap

## Environment Setup

### Frontend
```powershell
cd frontend
npm install
```

### Docker Environment

- Download Docker: <https://www.docker.com/>
- Add to PATH (may differ by setup):
```powershell
$env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
```

#### Run a PostGIS image
```powershell
docker run -d --name echomap-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=echomap -p 5432:5432 postgis/postgis:16-3.4
```

#### Enter the container and open psql
```powershell
docker exec -it echomap-db psql -U postgres -d echomap
```

Enable extensions (PostGIS usually enabled in the image, but confirm):
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
-- If the image doesn't include pgvector, the next command may fail
CREATE EXTENSION IF NOT EXISTS vector;
```

> Simple alternative (pgvector official image)
1. Remove old container (if exists)
```powershell
docker rm -f echomap-db
```
2. Run pgvector official image
```powershell
docker run -d --name echomap-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=echomap -p 5432:5432 pgvector/pgvector:pg16
```
3. Install PostGIS inside the container (requires network access in container)
```powershell
docker exec -u 0 -it echomap-db bash -c "apt-get update && apt-get install -y postgis postgresql-16-postgis-3"
```
4. Enable extensions
```powershell
docker exec -it echomap-db psql -U postgres -d echomap -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker exec -it echomap-db psql -U postgres -d echomap -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Backend
Install Python dependencies:
```powershell
pip install -r .\backend\requirements.txt
```

### Cloud Model Deployment
Use a cloud GPU server (e.g., AutoDL 4090):
1. Install dependencies
```powershell
pip install -r .\docs\autodl_requirements.txt
```
2. Download models
```powershell
python .\docs\download.py
```
3. Start inference server (exposes API on port 6006). In AutoDL console "Custom Service", find the URL mapped to port 6006 as the API URL.
```powershell
python .\docs\server.py
```

## Data Initialization (Important)
To enable **semantic search** and **spatiotemporal resonance**, initialize the database and generate demo embeddings.

### 1. Import Base Data
Use a DB tool (e.g., DBeaver, pgAdmin) or psql to execute the SQL in `SQL.txt`. This inserts 100 synthetic audio records distributed across China.

### 2. Generate Embedding Vectors
Synthetic data has no embeddings by default. Run the initializer to call the AI model and generate vectors.

1. Ensure `EMBEDDING_API_KEY` is set (via environment variable or in `backend/app/services/audio_service.py`).
2. From the project root, run:
```powershell
python -m backend.init_embeddings
```

## Run the Project

### Start Backend
```powershell
uvicorn backend.app.main:app --reload
```

### Start Frontend
```powershell
cd frontend
npm run dev
```