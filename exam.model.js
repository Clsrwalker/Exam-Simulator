// src/models/exam.model.js
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  // Basic exam info
  title: { type: String, required: true },
  description: { type: String },

  // Optional reading passage (some exams might have an article)
  article: { type: String, default: '' },

  // Exam type: e.g. 'IELTS', 'CUSTOM', 'ESSAY'
  type: {
    type: String,
    enum: ['IELTS', 'CUSTOM', 'ESSAY'],
    default: 'CUSTOM'
  },

  // The main list of questions
  questions: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      score: { type: Number, default: 1 }
    }
  ],

  // Optional start/end times
  startTime: { type: Date },
  endTime: { type: Date },

  // Extended fields (for custom exam)
  topic: { type: String, default: '' },        // e.g. "History", "Technology"
  difficulty: { type: String, default: '' },   // e.g. "Basic", "Intermediate", "Advanced"
  examTime: { type: Number, default: 0 },      // Duration in minutes
  references: { type: String, default: '' },   // Reference materials or textbooks
  studentLevel: { type: String, default: '' }, // e.g. "Undergraduate", "Beginner"

  // Status
  status: {
    type: String,
    enum: ['not_started', 'ongoing', 'ended'],
    default: 'not_started'
  },

  // Creation time
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Exam', examSchema);
