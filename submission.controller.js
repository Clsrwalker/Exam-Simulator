// src/controllers/submission.controller.js

const Submission = require('../models/submission.model');
const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const User = require('../models/user.model');

const OpenAI = require('openai');
const config = require('../config');
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const levelThresholds = {
  1: 10,
  2: 20,
  3: 30,
  4: 40,
  5: Infinity,
};

async function updateProgressAndLevel(user) {
  user.examProgress += 1;
  if (user.level < 5) {
    const threshold = levelThresholds[user.level];
    if (user.examProgress >= threshold) {
      user.level += 1;
      user.examProgress -= threshold;
    }
  }
  await user.save();
}

/**
 * 创建提交 (考试答卷)
 * POST /api/submissions
 */
exports.createSubmission = async (req, res) => {
  try {
    const { examId, answers, timeSpent } = req.body;
    const userId = req.userId; // 从 token 中解析

    if (!examId || !answers) {
      return res.status(400).json({ error: 'Missing examId or answers' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'No userId from token, please login.' });
    }
    const existingSubmission = await Submission.findOne({ examId, userId });
    if (existingSubmission) {
      return res.status(400).json({ error: 'You have already submitted this exam.' });
    }

    // 1) 找到对应Exam
    const exam = await Exam.findById(examId).populate('questions.questionId');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // 2) 获取考试类型
    //    假设 Exam 模型里有 exam.type 代表考试类型('ielts','custom','essay'等)
    //    若没有可改成 exam.category 或根据实际字段名调整
    const examType = exam.type || 'custom'; // 默认给个'custom'之类的

    // 3) 生成 examSnapshot 用于防止后续试卷改动
    const examSnapshot = {
      title: exam.title,
      article: exam.article,
      questions: exam.questions.map(qItem => {
        const qDoc = qItem.questionId;
        return {
          questionId: qDoc._id,
          type: qDoc.type,
          content: qDoc.content,
          options: qDoc.options || []
        };
      })
    };

    let totalScore = 0;
    const processedAnswers = [];

    // 4) 遍历答案进行客观题判分
    for (const ans of answers) {
      const questionId = ans.questionId;
      const userAnswer = ans.userAnswer;

      const examQ = exam.questions.find(q => q.questionId._id.toString() === questionId);
      if (!examQ) continue;

      const questionDoc = examQ.questionId; // Question model
      let scoreObtained = 0;
      let wrongOptions = [];

      // 这里排除 essay / caseStudy / shortAnswer，不走本地判分
      if (
        typeof questionDoc.answer === 'string' &&
        questionDoc.type !== 'essay' &&
        questionDoc.type !== 'caseStudy' &&
        questionDoc.type !== 'shortAnswer'
      ) {
        const correct = questionDoc.answer.trim();
        const userAns = (userAnswer || '').trim();
        if (correct === userAns) {
          // 如果Exam里给此题定义了score字段，就使用，否则默认1分
          scoreObtained = examQ.score || 1;
        } else {
          wrongOptions.push(userAns);
        }
      }

      totalScore += scoreObtained;
      processedAnswers.push({
        questionId,
        userAnswer,
        scoreObtained,
        wrongOptions
      });
    }

    // 5) 创建 Submission，status = "submitted"
    let newSubmission = new Submission({
      examId,
      userId,
      timeSpent: timeSpent || 0,
      answers: processedAnswers,
      totalScore,
      status: 'submitted',
      examSnapshot,
      examType
    });
    await newSubmission.save();

    // 6) 检测 essay/caseStudy/shortAnswer => 由 GPT 评分
    const essayAnswers = processedAnswers.filter(ans => {
      const snapQ = examSnapshot.questions.find(q => q.questionId.equals(ans.questionId));
      return snapQ && (
        snapQ.type === 'essay' ||
        snapQ.type === 'caseStudy' ||
        snapQ.type === 'shortAnswer'  // <=== 新增 shortAnswer
      );
    });

    if (essayAnswers.length > 0) {
      // 如果可能有多道 essay/caseStudy/shortAnswer，可遍历，这里只示例处理第一道
      const firstEssay = essayAnswers[0];
      const essayContent = String(firstEssay.userAnswer || '');

      // 定义英文评分标准
      const criteria = `
1. Logic and coherence (clarity of arguments and ideas)
2. Depth of analysis (whether the essay thoroughly explores the topic)
3. Language use (grammar, spelling, vocabulary)
4. Relevance to the prompt (staying on topic and addressing the question)
5. Structural integrity (introduction, body, conclusion)
      `.trim();

      // 构建 prompt，要求仅返回纯 JSON
      const prompt = `
You are an experienced English writing examiner.
Please evaluate the following essay strictly in valid JSON format (no code fences, no markdown).

Essay Content:
"""
${essayContent}
"""

Criteria:
${criteria}

Your response must be valid JSON like:
{
  "score": 85,
  "feedback": "Your essay is generally coherent ... suggestions ..."
}
Do not include any additional text or formatting.
`.trim();

      try {
        const aiResp = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        });

        let gptContent = aiResp.choices[0].message.content || '';
        // 去除可能的 ``` 标记
        gptContent = gptContent.replace(/```[\s\S]*?```/g, '').trim();

        // 尝试解析 GPT 返回的 JSON
        const aiResult = JSON.parse(gptContent);

        newSubmission.aiScore = aiResult.score;
        newSubmission.aiFeedback = aiResult.feedback || {};
        // 若希望 GPT 的分数更新 totalScore，可直接覆盖
        newSubmission.totalScore = aiResult.score || 0;
        newSubmission.status = 'graded';

        await newSubmission.save();
      } catch (gptErr) {
        console.error('GPT scoring failed:', gptErr);
        // 如果解析失败，也不会影响该Submission被保存，只是没有AI评分
      }
    }

    // 7) 更新用户等级进度（可选逻辑）
    const user = await User.findById(userId);
    if (user) {
      await updateProgressAndLevel(user);
    }

    // 8) 返回创建成功的submission
    return res.status(201).json(newSubmission);

  } catch (err) {
    console.error('createSubmission error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 获取某份提交的答卷详情
 * GET /api/submissions/:id
 */
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    // Populate examId 以及 answers.questionId 来显示题目详情
    const submission = await Submission.findById(id)
      .populate('examId')
      .populate('answers.questionId');

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.status(200).json(submission);
  } catch (err) {
    console.error('getSubmissionById error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 可选: 更新Submission (人工改分或添加评语等)
 * PUT /api/submissions/:id
 */
exports.updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Submission.findByIdAndUpdate(id, req.body, { new: true })
      .populate('examId')
      .populate('answers.questionId');
    if (!updated) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    return res.status(200).json(updated);
  } catch (err) {
    console.error('updateSubmission error:', err);
    return res.status(500).json({ error: err.message });
  }
};
