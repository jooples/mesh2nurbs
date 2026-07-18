# ─── Next.js 生产 Dockerfile ───
# 构建:
#   docker build -t hunyuan3d-frontend .
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/v1 -t hunyuan3d-frontend .
# 运行:
#   docker run -p 3000:3000 hunyuan3d-frontend

# Stage 1: 构建
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 构建时设置 API 地址（默认通过 nginx 同域代理）
ARG NEXT_PUBLIC_API_URL=/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# Stage 2: 生产运行（standalone 模式，仅包含必要文件）
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
