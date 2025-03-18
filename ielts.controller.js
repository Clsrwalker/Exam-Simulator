// src/controllers/ielts.controller.js
const { generateIeltsExam } = require('../services/ielts.service');

exports.generateIeltsReadingExam = async (req, res) => {
  try {
    const examData = await generateIeltsExam(); // 生成+存储Exam
    // 返回 examData._id, title, questions
    return res.status(201).json(examData); 
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

