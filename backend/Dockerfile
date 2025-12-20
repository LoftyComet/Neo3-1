FROM python:3.10-slim
WORKDIR /app

# 换源加速
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends ffmpeg gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 关键：直接拷贝到 /app 目录下
COPY . .
# 创建软链接，让 /app/backend 指向自己，从而满足 from backend.app 的导入
RUN ln -s /app /app/backend

# 环境变量
ENV PYTHONPATH=/app

EXPOSE 8000

# 运行命令：如果 main.py 在 app 文件夹里，就用 app.main:app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]