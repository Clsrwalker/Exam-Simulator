// src/controllers/exam.controller.js
const OpenAI = require('openai');
const config = require('../config');
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const Exam = require('../models/exam.model');
const Question = require('../models/question.model');

/**
 * 根据前端传入的字符串 (如 "ShortAnswer")，
 * 映射到 Question model 接受的类型 (如 "fill")。
 */
function mapQuestionType(frontType) {
  // 先把前端传来的 questionType 转成小写
  const ft = (frontType || '').trim().toLowerCase();

  switch (ft) {
    // 例如前端 <option value="shortAnswer" /> => 进来后变 "shortanswer"
    case 'shortanswer':
      // 你自己想在 Question Model 存啥就返回啥
      // 比如要存 'shortAnswer'
      return 'shortAnswer';
    
    case 'fill':
      return 'fill';
    
    case 'essay':
      return 'essay';

    case 'casestudy':
      return 'caseStudy';

    case 'match':
      return 'match';

    default:
      return 'multiple';
  }
}


/**
 * 创建考试
 * POST /api/exams
 * Body: { title, description, questions, startTime, endTime, status }
 */
exports.createExam = async (req, res) => {
  try {
    const {
      title,
      description,
      questions,    // [{ questionId, score }, ...]
      startTime,
      endTime,
      status
    } = req.body;

    const newExam = new Exam({
      title,
      description,
      questions,
      startTime,
      endTime,
      status
    });

    await newExam.save();
    return res.status(201).json(newExam);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 获取所有考试
 * GET /api/exams
 */
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find().populate('questions.questionId');
    return res.status(200).json(exams);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 获取单个考试
 * GET /api/exams/:id
 */
exports.getExamById = async (req, res) => {
  try {
    const examId = req.params.id;
    const exam = await Exam.findById(examId).populate('questions.questionId');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    return res.status(200).json(exam);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 更新考试
 * PUT /api/exams/:id
 * Body: { title, description, questions, startTime, endTime, status }
 */
exports.updateExam = async (req, res) => {
  try {
    const examId = req.params.id;

    const updatedExam = await Exam.findByIdAndUpdate(examId, req.body, {
      new: true
    }).populate('questions.questionId');

    if (!updatedExam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    return res.status(200).json(updatedExam);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 删除考试
 * DELETE /api/exams/:id
 */
exports.deleteExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const deletedExam = await Exam.findByIdAndDelete(examId);

    if (!deletedExam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    return res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 生成自定义考试
 * POST /api/exams/generate-custom
 * Body: {
 *   title, topic, difficulty, examTime, questionCount,
 *   questionType, references, studentLevel
 * }
 *
 * 前端会在 Body 里发送一个 questionType
 * (e.g. "ShortAnswer", "Essay", "CaseStudy", "MCQ", "Matching", "ProblemSolving", "FillInBlank"...)
 *
 * 本示例会调用 GPT 让它返回一个 JSON，然后将题目写入数据库。
 */
exports.generateCustomExam = async (req, res) => {
  try {
    const {
      title,
      topic,
      difficulty,
      examTime,
      questionCount,
      questionType,  // <=== 重点
      references,
      studentLevel
    } = req.body;

    // 将前端传过来的 questionType 映射为后端 Question Model 可用的类型
    const dbQuestionType = mapQuestionType(questionType);

    // 1) 构建给 GPT 的 prompt
    const prompt = `
      You are an advanced exam generator.

      Exam specification:
      - Title: ${title || 'Untitled'}
      - Topic: ${topic || 'General'}
      - Difficulty: ${difficulty || 'Basic'}
      - Time Allowed: ${examTime || 60} minutes
      - Number of Questions: ${questionCount || 10}
      - Question Type: ${questionType || 'MultipleChoice'}
      - Student Level: ${studentLevel || 'Beginner'}
      - References: ${references || 'None'}

      Please return a JSON object with the structure:
      {
        "title": "...",
        "questions": [
          {
            "question": "...",
            "options": ["...","...","..."],   // only if it's a multiple-choice style
            "correctAnswer": "...",
            "explanation": "..."              // optional
          }
        ]
      }

      Only valid JSON, no disclaimers.
    `.trim();

    // 2) 调用 OpenAI
    const aiResp = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    const content = aiResp.choices[0].message.content;

    // 3) 解析 AI 返回的 JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('JSON parse error:', err);
      console.error('AI raw content:', content);
      return res.status(400).json({ error: 'AI response is not valid JSON' });
    }

    // parsed => { title, questions: [ { question, options[], correctAnswer, ... }, ... ] }
    const questionRefs = [];

    // 4) 循环保存 AI 生成的每个题目 => Question 表
    for (const q of (parsed.questions || [])) {
      const newQ = await Question.create({
        content: q.question || '',
        type: dbQuestionType,       // <=== 这里使用我们映射后的题型
        options: q.options || [],
        answer: q.correctAnswer || ''
      });
      questionRefs.push({
        questionId: newQ._id,
        score: 1
      });
    }

    // 5) 创建 Exam
    const exam = new Exam({
      title: parsed.title || title || 'AI-Generated Exam',
      description: `Generated by AI (Topic:${topic}, Difficulty:${difficulty}, Type:${questionType})`,
      type: 'CUSTOM',

      questions: questionRefs,
      topic: topic || '',
      difficulty: difficulty || '',
      examTime: examTime || 60,
      references: references || '',
      studentLevel: studentLevel || ''
    });

    await exam.save();
    return res.status(201).json(exam);

  } catch (err) {
    console.error('generateCustomExam error:', err);
    return res.status(500).json({ error: err.message });
  }
};
