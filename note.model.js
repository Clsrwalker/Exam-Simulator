// src/models/note.model.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // 关联User表
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  // 改为可选，不再 required
  content: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
  // 如果需要，可在此扩展: updatedAt, tags, isArchived 等字段
});

module.exports = mongoose.model('Note', noteSchema);
