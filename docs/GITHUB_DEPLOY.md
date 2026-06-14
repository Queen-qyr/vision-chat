# GitHub + Render 部署教程（ronaqyr810）

用 GitHub 托管代码，用 **Render** 免费运行（自动 HTTPS）。

> GitHub Pages **不能**直接跑本项目（需要 Node.js 后端）。  
> 流程是：**代码放 GitHub → Render 从 GitHub 拉取并运行**。

---

## 第一步：把代码推到 GitHub

在项目文件夹 `ai视角对话` 打开终端，依次执行：

```bash
git init
git add .
git commit -m "AI 视觉对话助手初始版本"

git branch -M main
git remote add origin https://github.com/Queen-qyr/vision-chat.git
git push -u origin main
```

### 先在 GitHub 网页创建仓库

1. 打开 https://github.com/new
2. 登录账号 **ronaqyr810**
3. 仓库名填：`vision-chat`
4. 选 **Public**
5. **不要**勾选 "Add a README"（本地已有代码）
6. 点 Create repository

创建后，把上面 `git remote` 里的地址换成你实际的仓库地址。

---

## 第二步：Render 一键部署

1. 打开 https://render.com
2. 用 **GitHub 账号登录**（授权 Render 访问仓库）
3. 点击 **New +** → **Blueprint**（或 Web Service）
4. 选择仓库 `Queen-qyr/vision-chat`
5. Render 会自动读取项目里的 `render.yaml` 配置

### 手动配置（若不用 Blueprint）

| 配置项 | 值 |
|--------|-----|
| Build Command | `npm run install:all && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

### 添加环境变量（重要）

在 Render 控制台 → 你的服务 → **Environment**：

| Key | Value |
|-----|-------|
| `ZHIPU_API_KEY` | 你的智谱 API 密钥（在 https://open.bigmodel.cn 申请） |
| `ZHIPU_MODEL` | `glm-4v-flash`（免费视觉模型，可选） |

保存后 Render 会自动重新部署。

---

## 第三步：访问你的应用

部署完成后 Render 会给你一个地址，例如：

```
https://ai-vision-chat-xxxx.onrender.com
```

1. 打开该地址
2. 右上角应显示 **API: ✓ 已配置**
3. 点击「开始对话」，允许摄像头和麦克风

---

## 免费版注意事项

- **冷启动**：免费服务 15 分钟无访问会休眠，首次打开可能要等 30–60 秒
- **HTTPS**：Render 自动提供，摄像头/麦克风可正常使用
- **费用**：Render 免费档 + OpenAI API 按量计费

---

## 后续更新代码

改完代码后：

```bash
git add .
git commit -m "更新说明"
git push
```

Render 检测到 GitHub 有新提交后会**自动重新部署**。

---

## 常见问题

**推送时要求登录 GitHub？**  
使用 GitHub Personal Access Token 作为密码，或安装 [GitHub Desktop](https://desktop.github.com/)。

**仓库名不是 ai-vision-chat？**  
没关系，把 `git remote` 地址改成你的实际仓库 URL 即可。

**Render 部署失败？**  
查看 Render 日志，常见原因：Node 版本、缺少 `OPENAI_API_KEY`、构建超时（免费档偶尔发生，重试即可）。

---

*你的 GitHub：https://github.com/Queen-qyr/vision-chat*
