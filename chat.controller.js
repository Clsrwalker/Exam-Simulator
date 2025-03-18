// src/controllers/chat.controller.js
const Chat = require('../models/chat.model');
const OpenAI = require('openai');


let openai = null;
try {
  
  openai = new OpenAI(process.env.OPENAI_API_KEY);
} catch (err) {
  console.error('Failed to init OpenAI:', err.message);
}

/**
 * (system prompt)
 */
async function getExamContext(userId) {
  
  return `You are an AI assistant. The user is preparing for an exam. Provide helpful responses.`;
}

/**
 * GET /api/chat/history
 * 
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.userId; // 需在 authMiddleware 
    if (!userId) {
      return res.status(401).json({ error: 'No user in request' });
    }

    const messages = await Chat.find({ userId }).sort({ createdAt: 1 }).exec();
    return res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

/**
 * POST /api/chat/sendMessage
 * 
 */
exports.sendMessage = async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'OpenAI not initialized' });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'No user in request' });
    }

    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    
    await Chat.create({
      userId,
      role: 'user',
      content: userMessage
    });

    
    const examContext = await getExamContext(userId);

    const history = await Chat.find({ userId }).sort({ createdAt: 1 }).exec();
    
    const messages = [
      { role: 'system', content: examContext },
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: userMessage }
    ];

 
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo', 
      messages,
      temperature: 0.7
    });

    if (
      !response ||
      !response.choices ||
      !response.choices[0] ||
      !response.choices[0].message
    ) {
      throw new Error('No AI response received');
    }

    const aiReply = response.choices[0].message.content;

   
    await Chat.create({
      userId,
      role: 'assistant',
      content: aiReply
    });

   
    return res.json({ reply: aiReply });
    
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return res.status(500).json({ error: 'Failed to process message' });
  }
};
