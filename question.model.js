// src/models/question.model.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  content: { type: String, required: true }, // 题干
  type: {
    type: String,
    enum: [
      'single',      // 可能是“单选题”？如果你已经在用 multiple 表示多选，可以合并逻辑
      'multiple',    // 多选
      'fill',        // 填空
      'essay',       // 论文/文章题
      'match',       // 匹配题
      'shortAnswer', // 新增 - 短答题
      'caseStudy'    // 新增 - 案例题
    ],
    default: 'single',
  },
  options: [String], // 可选项（适合单选/多选题）
  answer: { type: mongoose.Schema.Types.Mixed }, // 正确答案（字符串、数组、文本均可）
  difficulty: { type: Number, default: 1 },      // 难度
  createdAt: { type: Date, default: Date.now }
  // 视需求可加 tags、解析等字段
});

module.exports = mongoose.model('Question', questionSchema);
