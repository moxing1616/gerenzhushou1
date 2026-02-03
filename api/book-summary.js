const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const { bookName, content, images, summaryType } = req.body;

  if ((!content || content.trim().length === 0) && (!bookName || bookName.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ error: '请输入书名或书籍内容' });
  }

  const typePrompts = {
    complete: `请对这本书/内容进行完整总结，包括：
1. 书籍概述（一段话介绍）
2. 核心主题和论点
3. 主要章节/部分内容概要
4. 作者的核心观点
5. 书中的重要概念和术语
6. 总结与评价`,

    keypoints: `请提炼这本书/内容的核心要点：
1. 一句话概括全书主旨
2. 5-10个核心要点（每个要点用1-2句话说明）
3. 最重要的3个观点
4. 值得记住的金句`,

    mindmap: `请用 Markdown 格式的思维导图整理这本书/内容的结构。
严格按照以下格式输出，使用 # 表示层级：

# 书名/主题
## 主要分支1
### 子分支1.1
### 子分支1.2
## 主要分支2
### 子分支2.1
### 子分支2.2

注意：
1. 必须使用 Markdown 标题格式（# ## ### ####）
2. 每个节点单独一行
3. 内容要简洁，每个节点不超过15个字
4. 层级不要超过4层`,

    actionable: `请从这本书/内容中提取可执行的行动清单：
1. 立即可以做的事情（3-5项）
2. 需要培养的习惯（3-5项）
3. 需要改变的思维方式
4. 推荐的下一步学习资源
5. 30天行动计划建议`
  };

  const systemPrompt = typePrompts[summaryType] || typePrompts.complete;

  try {
    const userContent = [];

    if (images && images.length > 0) {
      for (const img of images) {
        userContent.push({ type: 'image_url', image_url: { url: img } });
      }
    }

    let textPrompt = '';
    if (bookName && bookName.trim()) textPrompt += `书名：《${bookName}》\n\n`;
    if (content && content.trim()) textPrompt += `内容：\n${content}`;
    if (!textPrompt && images && images.length > 0) textPrompt = '请根据图片中的书籍内容生成读书笔记。';

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
          { role: 'system', content: `你是一个专业的读书笔记助手。${systemPrompt}` },
          { role: 'user', content: userContent }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || '调用 AI 失败' });
    }

    const summary = data.choices?.[0]?.message?.content || '无法生成读书笔记';
    res.json({ summary });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}
