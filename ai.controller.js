// src/controllers/ai.controller.js
const { generateCompletion } = require('../services/ai.service');

exports.getAIResponse = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const result = await generateCompletion(prompt);
    return res.status(200).json({ answer: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
