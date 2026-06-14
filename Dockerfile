# ---- 构建前端 ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/

RUN npm install && npm install --prefix client

COPY client ./client

RUN npm run build

# ---- 运行服务 ----
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001

CMD ["node", "server/index.js"]
