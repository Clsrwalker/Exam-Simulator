// controllers/learningPath.controller.js

const OpenAI = require('openai');
const config = require('../config'); // 假设这里面包含 OPENAI_API_KEY

// 用你 config 文件里的 Key 来初始化
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
});

/**
 * 生成学习路径
 * POST /api/learning-paths/generate
 * body: { subject }
 */
exports.generateLearningPath = async (req, res) => {
  console.log('generateLearningPath called!');
  console.log('subject:', req.body.subject);

  try {
    const { subject } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    // 构造提示，要求仅返回纯 JSON
    const prompt = `
Please generate a pure JSON learning path for the subject "${subject}" with at least 5 levels of depth.
- Each node should have "name" and an array "children" if more detail is possible.
- For each subtopic, break it down into further subtopics when relevant.
- The top-level should have "name": "${subject}" and a "children" array of subtopics.
Return only valid JSON, with no extra explanation.
`;

    // 调用 ChatCompletion 接口
    const openaiResp = await openai.chat.completions.create({
      model: 'gpt-4-turbo', 
      messages: [
        { role: 'system', content: 'You are a JSON-only assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    // 获取 GPT 返回的文本
    const rawResponse = openaiResp.choices[0]?.message?.content?.trim() || '';

    // 尝试解析为 JSON
    let jsonObj;
    try {
      jsonObj = JSON.parse(rawResponse);
    } catch (err) {
      console.error('Failed to parse JSON from GPT:', err);
      return res.status(500).json({ error: 'Invalid JSON returned by GPT' });
    }

    // 返回解析后的 JSON
    return res.json({ learningPath: jsonObj });

  } catch (error) {
    console.error('Error generating learning path:', error);
    return res.status(500).json({ error: error.message });
  }
};