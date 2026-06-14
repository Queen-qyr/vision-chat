require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { buildZhipuUserContent, chatWithZhipu } = require('./zhipu');

const app = express();
const PORT = process.env.PORT || 3001;

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || 'glm-4v-flash';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SYSTEM_PROMPT = `你是「AI 视觉对话助手」，能够通过用户摄像头画面和语音与用户自然交流。
规则：
1. 结合用户说的话和当前画面内容作答，描述要准确、简洁。
2. 若画面看不清或用户未提及视觉内容，不要编造画面细节。
3. 用口语化中文回复，适合语音朗读，每次回复控制在 2-4 句。
4. 主动、友好，可针对画面中的物体、场景给出有用建议。`;

function trimHistory(messages, maxTurns = 10) {
  const system = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');
  return [...system, ...rest.slice(-maxTurns * 2)];
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    provider: 'zhipu',
    hasApiKey: Boolean(ZHIPU_API_KEY),
    model: ZHIPU_MODEL,
  });
});

app.post('/api/chat', async (req, res) => {
  if (!ZHIPU_API_KEY) {
    return res.status(500).json({
      error: '未配置 ZHIPU_API_KEY，请在 .env 或 Render 环境变量中填写智谱 API Key',
    });
  }

  const { message, image, history = [] } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  const messages = trimHistory([
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((h) => ({
      role: h.role,
      content: h.role === 'user' && h.image
        ? buildZhipuUserContent(h.content, h.image)
        : h.content,
    })),
    {
      role: 'user',
      content: buildZhipuUserContent(message, image),
    },
  ]);

  try {
    const result = await chatWithZhipu({
      apiKey: ZHIPU_API_KEY,
      model: ZHIPU_MODEL,
      messages,
      maxTokens: 300,
    });
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message || '对话请求失败' });
  }
});

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: '前端未构建，请运行 npm run dev' });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('AI 视觉对话助手已启动（智谱 GLM-4V）');
  console.log(`  本机访问: http://localhost:${PORT}`);
  console.log(`  模型: ${ZHIPU_MODEL}`);
  if (!ZHIPU_API_KEY) {
    console.warn('警告: 未设置 ZHIPU_API_KEY');
  }
});
