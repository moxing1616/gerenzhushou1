const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const { content, images, keyword } = req.body;

  if (!keyword || keyword.trim().length === 0) {
    return res.status(400).json({ error: '请输入关键词' });
  }

  if ((!content || content.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ error: '请输入内容或上传图片' });
  }

  try {
    const userContent = [];

    if (images && images.length > 0) {
      for (const img of images) {
        userContent.push({ type: 'image_url', image_url: { url: img } });
      }
    }

    const textPrompt = `请从以下内容中，完整提取所有与关键词"${keyword}"相关的内容片段。

要求：
1. 提取所有包含该关键词或与该关键词主题相关的完整段落、句子
2. 如果图片中有相关内容，也要提取并描述
3. 保持原文的完整性，不要省略或概括
4. 按照在原文中出现的顺序排列
5. 每个提取的片段用分隔线隔开
6. 如果没有找到相关内容，请说明

内容如下：
${content || '（请查看图片内容）'}`;

    userContent.push({ type: 'text', text: textPrompt });

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [
          { role: 'system', content: '你是一个专业的内容提取助手。你的任务是从用户提供的文章、文档或图片中，精确提取与指定关键词相关的所有内容。提取时要保持原文的完整性和准确性。' },
          { role: 'user', content: userContent }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || '调用 AI 失败' });
    }

    const extracted = data.choices?.[0]?.message?.content || '未找到相关内容';
    res.json({ extracted });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}
