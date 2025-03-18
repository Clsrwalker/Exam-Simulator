// src/models/submission.model.js
const mongoose = require('mongoose');

/**
 * Submission Schema
 *
 * 用于存储用户对某场考试 (exam) 的提交信息，包括答题详情、得分、以及可选的考试快照 (examSnapshot)。
 */
const submissionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examType: {
    type: String,
    default: 'CUSTOM' // 或者根据你需要设置默认值
  },

  // 耗时 (单位秒或毫秒)，由前端提交
  timeSpent: {
    type: Number,
    default: 0
  },

  // 用户答题详情
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      userAnswer: mongoose.Schema.Types.Mixed, // 选的答案（字符串、多选数组、填空等）
      scoreObtained: { type: Number, default: 0 },
      wrongOptions: [String] // 记录错误的选项或答案
    }
  ],

  // 考试总分
  totalScore: { type: Number, default: 0 },

  // 提交状态
  status: {
    type: String,
    enum: ['not_submitted', 'submitted', 'graded'],
    default: 'not_submitted'
  },
  aiScore:    { type: Number, default: 0 },
  aiFeedback: { type: mongoose.Schema.Types.Mixed, default: {} },

  // 用于存储考试的快照信息 (可选)，以防后续试卷改动
  examSnapshot: {
    title: { type: String, default: '' },
    article: { type: String, default: '' },
    questions: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId }, // 不必 ref, 只是存个ID即可
        type: { type: String },
        content: { type: String },
        options: [String]
      }
    ]
  },

  // 创建时间
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
