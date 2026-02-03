const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const { audio, enableSpeaker } = req.body;

  if (!audio) {
    return res.status(400).json({ error: '请上传音频文件' });
  }

  try {
    const transcribePrompt = enableSpeaker
      ? `请转录这段音频的语音内容，并根据声音特征区分说话人。

格式要求：
- 每句话前标注说话人，格式为"【说话人X】："
- 第一个说话的人标为"【主持人】："
- 其他不同声音的人依次标为"【角色1】："、"【角色2】："等
- 同一人连续说话只需标注一次
- 如果只有一个人说话，也要标注为"【主持人】："

请直接输出转录内容：`
      : '请仔细听这段音频，将其中的语音内容完整转录为文字。直接输出转录内容，不要添加任何解释。';

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-omni-turbo',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: {
                  data: audio,
                  format: 'wav'
                }
              },
              { type: 'text', text: transcribePrompt }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('API错误:', data.error);
      return res.json({ transcript: '', error: data.error.message });
    }

    const transcript = data.choices?.[0]?.message?.content || '';

    const invalidPatterns = [
      '[无语音内容]', '没有语音信息', '无语音信息', '这段音频没有语音内容',
      '没有听到语音内容', '无法识别', '没有可辨识', '无法听到', '听不到任何',
      '没有声音', '音频为空', '无音频', '[Music]', '[音乐]', '音频中没有',
      '无法从音频', '音频内容为空', '没有检测到'
    ];

    const isInvalid = invalidPatterns.some(p => transcript.includes(p));
    const trimmed = transcript.trim();
    const isTooShort = trimmed.length <= 2 && /^[嗯啊哦呃哈嘿唔]+$/.test(trimmed);

    if (isInvalid || trimmed.length === 0 || isTooShort) {
      return res.json({ transcript: '' });
    }

    res.json({ transcript });

  } catch (error) {
    console.error('转录异常:', error);
    res.json({ transcript: '', error: '转录失败' });
  }
}
