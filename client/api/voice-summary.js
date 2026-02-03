const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const { transcript, summaryType } = req.body;

  if (!transcript || transcript.trim().length === 0) {
    return res.status(400).json({ error: '请提供转录文本' });
  }

  const typePrompts = {
    meeting: `请将以下会议录音转录内容整理为完整的会议纪要：

【会议纪要格式】
一、会议基本信息
- 会议主题：（根据内容推断）
- 参会人员：（根据角色标记识别）

二、会议议程与讨论内容
（按讨论顺序整理各议题）

三、主要决议与结论
（列出达成的共识和决定）

四、待办事项
| 序号 | 任务内容 | 负责人 | 截止时间 |
（如有提及）

五、下一步计划
（后续安排）

请根据实际内容填写，没有的项目可以省略。`,

    keypoints: `请从以下会议内容中提取核心要点：
1. 会议主要议题
2. 关键讨论点（按重要性排序）
3. 重要数据或结论
4. 需要关注的问题`,

    todo: `请从以下会议内容中提取所有待办事项：
1. 任务描述
2. 负责人（如有提及）
3. 截止时间（如有提及）
4. 优先级（根据上下文判断）

请按优先级排序输出。`,

    decision: `请从以下会议内容中提取所有决策记录：
1. 决策事项
2. 决策结果
3. 决策依据或背景
4. 相关责任人

请按讨论顺序整理。`
  };

  const systemPrompt = typePrompts[summaryType] || typePrompts.meeting;

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-omni-turbo',
        messages: [
          { role: 'system', content: `你是一个专业的语音内容分析助手。${systemPrompt}` },
          { role: 'user', content: `转录内容：\n\n${transcript}` }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || '生成总结失败' });
    }

    const summary = data.choices?.[0]?.message?.content || '无法生成总结';
    res.json({ summary });

  } catch (error) {
    console.error('Voice summary error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}
