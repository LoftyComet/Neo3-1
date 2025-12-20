# --- Builder 阶段 ---
FROM node:18-alpine AS builder
WORKDIR /app

# 1. 先复制依赖配置文件（注意：如果 context 设为 ./frontend，这里直接写文件名）
COPY package.json package-lock.json* ./

# --- 优化点：使用国内淘宝镜像源 ---
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

# 3. 复制所有源代码
COPY . .

# 4. 设置环境变量并构建
ENV NEXT_PUBLIC_API_BASE_URL=http://114.132.228.27:8000
RUN npm run build

# --- Runner 阶段 ---
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# 5. 复制构建产物
# 注意：因为你反馈没有 public 目录，所以下面这行必须注释掉或删除
# COPY --from=builder /app/public ./public 

# 复制 standalone 产物和静态资源
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
# 运行 standalone 模式生成的 server.js
CMD ["node", "server.js"]