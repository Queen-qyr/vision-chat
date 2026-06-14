const crypto = require('crypto');

const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

function createZhipuToken(apiKey) {
  const [id, secret] = apiKey.split('.');
  if (!id || !secret) {
    throw new Error('智谱 API Key 格式错误，应为 id.secret');
  }

  const now = Date.now();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      api_key: id,
      exp: now + 3600 * 1000,
      timestamp: now,
    }),
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function buildZhipuUserContent(text, imageBase64) {
  const content = [{ type: 'text', text }];
  if (imageBase64) {
    const url = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    content.push({ type: 'image_url', image_url: { url } });
  }
  return content;
}

async function chatWithZhipu({ apiKey, model, messages, maxTokens = 300 }) {
  const token = createZhipuToken(apiKey);

  const response = await fetch(ZHIPU_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `智谱 API 错误 (${response.status})`;
    throw new Error(message);
  }

  const reply = data.choices?.[0]?.message?.content || '抱歉，我暂时无法回应。';
  const usage = data.usage || {};

  return {
    reply,
    usage: {
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    },
  };
}

module.exports = {
  buildZhipuUserContent,
  chatWithZhipu,
};
