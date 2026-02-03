const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { content, images } = req.body;

  if ((!content || content.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ error: '请输入文章内容或图片' });
  }

  try {
    const userContent = [];

    if (images && images.length > 0) {
      for (const img of images) {
        userContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      }
    }

    const textPrompt = content && content.trim()
      ? `请对以下文章进行摘要：\n\n${content}`
      : '请对图片中的内容进行摘要，提取核心观点和关键信息。';

    userContent.push({
      type: 'text',
      text: textPrompt
    });

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文章摘要助手。请对用户提供的文章和图片进行摘要，提取核心观点和关键信息。输出格式：1. 一句话总结 2. 核心观点（3-5条） 3. 关键信息'
          },
          {
            role: 'user',
            content: userContent
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || '调用 AI 失败' });
    }

    const summary = data.choices?.[0]?.message?.content || '无法生成摘要';
    res.json({ summary });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}
