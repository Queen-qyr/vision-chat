require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3001;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SYSTEM_PROMPT = `你是「AI 视觉对话助手」，能够通过用户摄像头画面和语音与用户自然交流。
规则：
1. 结合用户说的话和当前画面内容作答，描述要准确、简洁。
2. 若画面看不清或用户未提及视觉内容，不要编造画面细节。
3. 用口语化中文回复，适合语音朗读，每次回复控制在 2-4 句。
4. 主动、友好，可针对画面中的物体、场景给出有用建议。`;

/** 裁剪对话历史，控制 token 成本 */
function trimHistory(messages, maxTurns = 10) {
  const system = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');
  const trimmed = rest.slice(-maxTurns * 2);
  return [...system, ...trimmed];
}

/** 构建多模态消息 */
function buildUserContent(text, imageBase64) {
  const content = [{ type: 'text', text }];
  if (imageBase64) {
    const url = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    content.push({
      type: 'image_url',
      image_url: { url, detail: 'low' },
    });
  }
  return content;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
});

app.post('/api/chat', async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: '未配置 OPENAI_API_KEY，请复制 .env.example 为 .env 并填写密钥' });
  }

  const { message, image, history = [] } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const messages = trimHistory([
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((h) => ({
      role: h.role,
      content: h.role === 'user' && h.image
        ? buildUserContent(h.content, h.image)
        : h.content,
    })),
    {
      role: 'user',
      content: buildUserContent(message, image),
    },
  ]);

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || '抱歉，我暂时无法回应。';
    const usage = completion.usage;

    res.json({
      reply,
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message || '对话请求失败' });
  }
});

app.post('/api/tts', async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: '未配置 OPENAI_API_KEY' });
  }

  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: '文本不能为空' });
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: process.env.OPENAI_TTS_VOICE || 'nova',
      input: text.slice(0, 500),
      speed: 1.05,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: err.message || '语音合成失败' });
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
  console.log(`AI 视觉对话助手已启动`);
  console.log(`  本机访问: http://localhost:${PORT}`);
  console.log(`  局域网访问: http://<你的IP>:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('警告: 未设置 OPENAI_API_KEY，请复制 .env.example 为 .env 并填写密钥');
  }
});
