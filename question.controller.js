const Question = require('../models/question.model');

// 创建题目
exports.createQuestion = async (req, res) => {
  try {
    // req.body 里包含题目内容、选项、答案等
    const question = new Question(req.body);
    await question.save();
    return res.status(201).json(question);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 获取所有题目
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    return res.status(200).json(questions);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 获取单个题目
exports.getQuestionById = async (req, res) => {
  try {
    const questionId = req.params.id;
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.status(200).json(question);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 更新题目
exports.updateQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;
    // { new: true } => 返回更新后的文档
    const updated = await Question.findByIdAndUpdate(questionId, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 删除题目
exports.deleteQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;
    const deleted = await Question.findByIdAndDelete(questionId);
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
