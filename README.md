# AI 视觉对话助手

打开摄像头与麦克风，让 AI **看见**你的画面、**听见**你说的话，并给出自然的中文回复。

## 功能特性

- 实时摄像头预览 + 连续语音识别（Web Speech API）
- 用户每说完一句话，自动截取当前画面并发送给多模态大模型
- AI 结合画面与对话历史回复，支持语音朗读
- 文字输入、手动「分析当前画面」、麦克风/摄像头独立开关
- 端云协同成本控制：端侧 STT/TTS、按需截图、压缩去重、历史裁剪

## 快速开始

### 方式一：双击启动（推荐，Windows）

1. 双击项目文件夹中的 **`启动.bat`**
2. 浏览器会自动打开 **http://localhost:3001**
3. 首次使用需编辑 `.env`，填入 `OPENAI_API_KEY`

### 方式二：命令行启动

```bash
# 1. 安装依赖（仅首次）
npm run install:all

# 2. 配置 API Key
copy .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY

# 3. 构建并启动（单端口 3001）
npm run launch
```

浏览器访问：**http://localhost:3001**

### 开发模式（热更新）

```bash
npm run dev
# 或双击 开发模式.bat
```

开发模式访问：**http://localhost:5173**（需同时保持后端 3001 运行）

> **注意**：请访问 `http://localhost:3001` 或 `http://localhost:5173`，不要用 `https://`，也不要在未启动服务时访问。

## 云端部署

**可以部署到云端。** 

- **有 GitHub？** 看 [docs/GITHUB_DEPLOY.md](docs/GITHUB_DEPLOY.md)（`ronaqyr810` + Render 免费部署）
- 其他方式见 [docs/DEPLOY.md](docs/DEPLOY.md)

## 访问不了？常见问题

| 现象 | 解决方法 |
|------|----------|
| 页面打不开 / 连接被拒绝 | 先运行 `启动.bat` 或 `npm run launch`，确认命令行里出现「已启动」 |
| 访问 3001 空白或报错 | 运行 `npm run build` 构建前端，或直接用 `启动.bat`（会自动构建） |
| 开发模式 5173 打不开 | 运行 `开发模式.bat` 或 `npm run dev`，访问 **5173** 而非 3001 |
| 显示「API 未配置」 | 编辑 `.env`，填入有效的 `OPENAI_API_KEY` 后重启服务 |
| 摄像头/麦克风无法使用 | 使用 Chrome/Edge，并允许浏览器权限；地址必须是 localhost |

### 环境要求

- Node.js 18+
- Chrome 或 Edge 浏览器（推荐，语音识别支持最好）
- OpenAI API Key（支持视觉的多模态模型，如 `gpt-4o-mini`）

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | 必填 |
| `OPENAI_MODEL` | 对话模型 | `gpt-4o-mini` |
| `OPENAI_TTS_VOICE` | 云端 TTS 音色 | `nova` |
| `PORT` | 后端端口 | `3001` |

## 使用说明

1. 点击 **「开始对话」**，允许浏览器使用摄像头和麦克风
2. 直接对着麦克风说话，说完后 AI 会自动结合当前画面回复
3. 也可在输入框打字发送，或点击 **「分析当前画面」**
4. 在顶部可切换 **浏览器免费语音** / **云端高质量语音**
5. 页脚可查看 API 调用次数与 Token 消耗

## 设计文档

详见 [docs/DESIGN.md](docs/DESIGN.md)，包含：

- 计划 vs 实现的用户故事
- 成本控制策略与实现对照
- 架构说明与后续迭代建议

## 技术栈

- **前端**：React + TypeScript + Vite
- **后端**：Node.js + Express + OpenAI SDK
- **端侧**：MediaDevices API、Web Speech API、Canvas 帧压缩
- **云端**：OpenAI Chat Completions（多模态）+ 可选 TTS

## 注意事项

- 请使用 **HTTPS 或 localhost**，否则浏览器可能拒绝摄像头/麦克风权限
- 语音识别依赖浏览器能力，Firefox/Safari 支持有限，建议使用 Chrome/Edge
- API Key 仅保存在服务端 `.env`，请勿提交到版本库

## 许可证

MIT
