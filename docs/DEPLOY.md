# 云端部署指南

本项目**可以部署到云端**。架构上只有后端 API 和静态页面上云，**摄像头和麦克风仍在用户浏览器本地采集**，不会把视频流上传到服务器（仅按需发送截图）。

---

## 部署前须知

| 项目 | 说明 |
|------|------|
| **HTTPS 必须** | 云端地址必须是 `https://`，否则浏览器会拒绝摄像头/麦克风权限 |
| **API Key** | `OPENAI_API_KEY` 只配置在服务器环境变量，不要写进前端代码 |
| **OpenAI 访问** | 服务器需能访问 OpenAI API；国内云主机可能需要代理或换国内多模态 API |
| **语音识别** | 仍使用用户浏览器 Web Speech API（Chrome/Edge 效果最好） |
| **费用** | 云主机月租 + OpenAI 按 Token 计费 |

---

## 方式一：Docker 部署（通用，推荐）

适用于：阿里云、腾讯云、华为云、AWS、自己的 VPS 等任何支持 Docker 的机器。

### 1. 上传代码到服务器

```bash
# 本地打包（排除 node_modules）
git clone <你的仓库> 
# 或用 scp / FTP 上传整个项目文件夹
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY
```

### 3. 构建并启动

```bash
docker compose up -d --build
```

访问：`http://服务器IP:3001`  
生产环境建议在前面加 **Nginx + SSL 证书**，对外提供 `https://你的域名`。

### 单条 Docker 命令

```bash
docker build -t ai-vision-chat .
docker run -d -p 3001:3001 \
  -e OPENAI_API_KEY=sk-xxx \
  -e OPENAI_MODEL=gpt-4o-mini \
  --name ai-vision-chat \
  ai-vision-chat
```

---

## 方式二：Railway（国外，最简单）

1. 将项目推送到 GitHub
2. 打开 [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. 选择本仓库
4. 在 Variables 中添加：
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`（可选）
5. 设置：
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
6. Railway 会自动分配 `https://xxx.up.railway.app` 域名

---

## 方式三：Render（国外，免费档可用）

1. 推送代码到 GitHub
2. [render.com](https://render.com) → New → Web Service
3. 配置：
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. 在 Environment 添加 `OPENAI_API_KEY`
5. Render 自动提供 `https://xxx.onrender.com`

> 免费档冷启动较慢，首次访问可能要等 30–60 秒。

---

## 方式四：Fly.io（国外）

```bash
# 安装 flyctl 后
fly launch
fly secrets set OPENAI_API_KEY=sk-xxx
fly deploy
```

项目已包含 `Dockerfile`，Fly 会直接使用。

---

## 方式五：国内云服务器（阿里云 / 腾讯云）

### 步骤概要

1. 购买轻量应用服务器（1核2G 即可）
2. 安装 Node.js 20+ 或 Docker
3. 上传项目，配置 `.env`
4. 运行：
   ```bash
   npm run launch
   ```
   或使用 Docker（见方式一）
5. 安全组放行 **80 / 443** 端口
6. 用 Nginx 反向代理并配置 SSL（Let's Encrypt 或云厂商免费证书）

### Nginx 反向代理示例

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 方式六：Vercel / 纯静态托管 — ⚠️ 不完全适合

- **前端**可以部署到 Vercel / Netlify / 对象存储 CDN
- **后端** Express 需要单独部署（Railway、Render、云函数改造等）
- 本项目默认是**前后端一体**的单体部署，拆分会需要改代码

若只想快速演示，优先用 **Docker** 或 **Railway / Render**。

---

## 环境变量清单

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI 密钥 |
| `OPENAI_MODEL` | ❌ | 默认 `gpt-4o-mini` |
| `OPENAI_TTS_VOICE` | ❌ | 云端 TTS 音色 |
| `PORT` | ❌ | 云平台通常自动注入，默认 3001 |

---

## 部署后自检

1. 访问 `https://你的域名/api/health` → 应返回 `{"ok":true,"hasApiKey":true,...}`
2. 打开首页 → 右上角显示 **API: ✓ 已配置**
3. 点击「开始对话」→ 浏览器弹出摄像头/麦克风授权
4. 说一句话 → AI 能结合画面回复

---

## 常见问题

**Q: 部署后摄像头打不开？**  
A: 检查是否用了 HTTPS；HTTP 下除 localhost 外无法使用摄像头。

**Q: 国内服务器连不上 OpenAI？**  
A: 需要配置代理，或将 `server/index.js` 改为调用国内多模态 API（如通义千问、智谱等）。

**Q: 能不能部署到微信小程序？**  
A: 当前是 Web 应用，小程序需要单独改造（使用 `camera` 组件、`wx.startRecord` 等）。

**Q: 视频会上传到云端吗？**  
A: 不会持续上传。仅在你说话时截取**一张压缩截图**发给 AI，成本可控。

---

*更新日期：2026-06-14*
