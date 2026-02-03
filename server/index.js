import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import https from 'https';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

app.post('/api/summary', async (req, res) => {
  const { content, images } = req.body;

  if ((!content || content.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ error: '请输入文章内容或图片' });
  }

  try {
    // 构建消息内容
    const userContent = [];

    // 添加图片
    if (images && images.length > 0) {
      for (const img of images) {
        userContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      }
    }

    // 添加文本
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
});

// 关键词提取接口
app.post('/api/extract-keyword', async (req, res) => {
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
        userContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
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
            content: '你是一个专业的内容提取助手。你的任务是从用户提供的文章、文档或图片中，精确提取与指定关键词相关的所有内容。提取时要保持原文的完整性和准确性。'
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

    const extracted = data.choices?.[0]?.message?.content || '未找到相关内容';
    res.json({ extracted });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 读书笔记接口
app.post('/api/book-summary', async (req, res) => {
  const { bookName, content, images, summaryType } = req.body;

  if ((!content || content.trim().length === 0) && (!bookName || bookName.trim().length === 0) && (!images || images.length === 0)) {
    return res.status(400).json({ error: '请输入书名或书籍内容' });
  }

  // 根据总结类型生成不同的提示词
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
        userContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      }
    }

    let textPrompt = '';
    if (bookName && bookName.trim()) {
      textPrompt += `书名：《${bookName}》\n\n`;
    }
    if (content && content.trim()) {
      textPrompt += `内容：\n${content}`;
    }
    if (!textPrompt && images && images.length > 0) {
      textPrompt = '请根据图片中的书籍内容生成读书笔记。';
    }

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
            content: `你是一个专业的读书笔记助手。${systemPrompt}`
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

    const summary = data.choices?.[0]?.message?.content || '无法生成读书笔记';
    res.json({ summary });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 代理获取图片并转为base64
app.post('/api/fetch-image', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: '缺少图片URL' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://mp.weixin.qq.com/'
      }
    });

    if (!response.ok) {
      return res.status(400).json({ error: '获取图片失败' });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    res.json({ base64: dataUrl });
  } catch (error) {
    console.error('Fetch image error:', error);
    res.status(500).json({ error: '获取图片失败' });
  }
});

// PDF 解析接口（使用 AI 视觉能力解析）
app.post('/api/parse-pdf', async (req, res) => {
  const { base64, filename } = req.body;
  if (!base64) {
    return res.status(400).json({ error: '缺少文件内容' });
  }

  try {
    // 使用通义千问的文档理解能力
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
      // 如果 AI 解析失败，返回空文本
      console.error('PDF parse error:', data.error);
      return res.json({ text: `[无法解析PDF文件: ${filename}]` });
    }

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ text });

  } catch (error) {
    console.error('Parse PDF error:', error);
    res.json({ text: `[PDF解析失败: ${filename}]` });
  }
});

// 语音转录接口
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传音频文件' });
  }

  console.log('收到音频文件:', req.file.size, 'bytes, 类型:', req.file.mimetype);

  try {
    const audioBase64 = req.file.buffer.toString('base64');
    // 强制使用 audio/wav 或让 API 自动检测
    const mimeType = req.file.mimetype || 'audio/webm';
    const enableSpeaker = req.body.enableSpeaker === 'true';

    // 根据是否启用说话人识别使用不同的提示词
    const transcribePrompt = enableSpeaker
      ? `请转录这段音频的语音内容，并根据声音特征区分说话人。

格式要求：
- 每句话前标注说话人，格式为"【说话人X】："
- 第一个说话的人标为"【主持人】："
- 其他不同声音的人依次标为"【角色1】："、"【角色2】："等
- 同一人连续说话只需标注一次
- 如果只有一个人说话，也要标注为"【主持人】："

示例输出：
【主持人】：大家好，欢迎收看今天的节目。
【角色1】：谢谢主持人，很高兴来到这里。
【主持人】：那我们开始今天的话题吧。

请直接输出转录内容：`
      : '请仔细听这段音频，将其中的语音内容完整转录为文字。直接输出转录内容，不要添加任何解释。';

    // 使用通义千问的语音识别能力
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
                  data: `data:${mimeType};base64,${audioBase64}`,
                  format: 'wav' // 尝试让 API 按 wav 处理
                }
              },
              {
                type: 'text',
                text: transcribePrompt
              }
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
    console.log('转录结果:', transcript.substring(0, 100));

    // 过滤掉明确的无效内容
    const invalidPatterns = [
      '[无语音内容]',
      '没有语音信息',
      '无语音信息',
      '这段音频没有语音内容',
      '没有听到语音内容',
      '无法识别',
      '没有可辨识',
      '无法听到',
      '听不到任何',
      '没有声音',
      '音频为空',
      '无音频',
      '[Music]',
      '[音乐]',
      '音频中没有',
      '无法从音频',
      '音频内容为空',
      '没有检测到'
    ];

    // 检查是否是无效内容
    const isInvalid = invalidPatterns.some(p => transcript.includes(p));

    // 过滤掉太短或无意义的内容（如只有"嗯"）
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
});

// 会议纪要总结接口
app.post('/api/voice-summary', async (req, res) => {
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
          {
            role: 'system',
            content: `你是一个专业的语音内容分析助手。${systemPrompt}`
          },
          {
            role: 'user',
            content: `转录内容：\n\n${transcript}`
          }
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
});

// 生成自签名证书
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// 如果证书不存在，生成新的
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('生成自签名证书...');
  try {
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('无法自动生成证书，请手动安装 openssl 或使用 HTTP 模式');
  }
}

const PORT = process.env.PORT || 3006;

// 启动服务器
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTPS 服务器运行在 https://0.0.0.0:${PORT}`);
  });
} else {
  // 回退到 HTTP
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP 服务器运行在 http://0.0.0.0:${PORT}`);
  });
}
