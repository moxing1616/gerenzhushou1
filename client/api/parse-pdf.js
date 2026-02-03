const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const { base64, filename } = req.body;
  if (!base64) {
    return res.status(400).json({ error: '缺少文件内容' });
  }

  try {
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
            role: 'user',
            content: [
              {
                type: 'file',
                file: {
                  file_type: 'pdf',
                  file_data: base64
                }
              },
              {
                type: 'text',
                text: '请提取这个PDF文档的全部文字内容，保持原有的段落结构。只输出文字内容，不要添加任何解释或总结。'
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('PDF parse error:', data.error);
      return res.json({ text: `[无法解析PDF文件: ${filename}]` });
    }

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ text });

  } catch (error) {
    console.error('Parse PDF error:', error);
    res.json({ text: `[PDF解析失败: ${filename}]` });
  }
}
