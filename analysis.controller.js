// src/controllers/analysis.controller.js

const Submission = require('../models/submission.model');
const User       = require('../models/user.model');
const OpenAI     = require('openai');
const config     = require('../config'); 

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });


exports.getUserSubmissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 0;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = Submission.find({ userId }).sort({ createdAt: -1 });
    if (limit > 0) {
      query = query.limit(limit);
    }

    //  populate
    const submissions = await query
      .populate('examId')
      .populate('answers.questionId') 
      .exec();

    return res.json({ user, submissions });
  } catch (err) {
    console.error('getUserSubmissions error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 
 * POST /api/analysis/ai-suggestion
 * body: { userId, submissionIds? }
 * 
 * 
 */
exports.generateAiSuggestion = async (req, res) => {
  try {
    const { userId, submissionIds } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

   
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2)  Submission
    let query = Submission.find({ userId }).sort({ createdAt: -1 });
    if (submissionIds && submissionIds.length > 0) {
      query = Submission.find({ userId, _id: { $in: submissionIds } });
    } else {
      //  5 
      query = query.limit(5);
    }

    const subms = await query
      .populate('examId')
      .populate('answers.questionId') 
      .exec();

   
    const totalExams = subms.length;
    let totalScore = 0;
    subms.forEach(s => {
      totalScore += (s.totalScore || 0);
    });
    const avgScore = totalExams ? (totalScore / totalExams).toFixed(1) : 0;

    // user level, examProgress
    const { level, examProgress } = user;

   
    if (!subms.length) {
      const empty = {
        summary: {
          totalExams: 0,
          avgScore: 0,
          level: user.level || 1,
          examProgress: user.examProgress || 0
        },
        examAnalysis: {},
        recentMistakesAnalysis: [],
        overallAdvice: ""
      };
      return res.json({
        user: { _id: user._id, level: user.level, examProgress: user.examProgress },
        aiAdvice: JSON.stringify(empty)
      });
    }

  
    const latest = subms[0];


    const prompt = buildPromptNoQid({
      totalExams,
      avgScore,
      level,
      examProgress,
      submission: latest
    });

    //  OpenAI
    const openaiResp = await openai.chat.completions.create({
      model: 'gpt-4-turbo', 
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const aiAdvice = openaiResp.choices[0]?.message?.content || '(No response)';

   
    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        level: user.level,
        examProgress: user.examProgress
      },
      summary: {
        totalExams,
        avgScore
      },
      aiAdvice
    });

  } catch (err) {
    console.error('generateAiSuggestion error:', err);
    return res.status(500).json({ error: err.message });
  }
};


function buildPromptNoQid({ totalExams, avgScore, level, examProgress, submission }) {
  const examTitle  = submission.examSnapshot?.title || "(No Title)";
  const timeSpent  = submission.timeSpent || 0;
  const score      = submission.totalScore || 0;
  const article    = submission.examSnapshot?.article || "";


  const mistakes   = submission.answers.filter(a => (a.scoreObtained || 0) < 1);

  let mistakesInfo = "";
  if (!mistakes.length) {
    
    mistakesInfo = "No mistakes found in this submission.";
  } else {
    mistakes.forEach((m, idx) => {
      
      let ansQidStr = "";
      if (m.questionId && m.questionId._id) {
        ansQidStr = m.questionId._id.toString();
      }

      const qItem = submission.examSnapshot?.questions.find(q => {
        return q.questionId && String(q.questionId) === ansQidStr;
      });

      console.log(">>> Checking QItem for mistake #", idx+1, qItem); 
      const userAns = m.userAnswer || "(No user answer)";
      // correct
      let correctAns = "(Unknown)";
    
      if (m.questionId && m.questionId.answer) {
        correctAns = m.questionId.answer;
      }
     
      let qContent = qItem ? (qItem.content || "") : "";
      console.log(">>> qContent =", qContent);
      qContent = qContent.slice(0,100);

      mistakesInfo += `
[Mistake #${idx+1}]
questionContent: ${qContent}
userAnswer: ${userAns}
correctAnswer: ${correctAns}
`;
    });
  }

 
  return `
You are an advanced IELTS Reading tutor assistant.

We have a user with these stats:
- totalExams: ${totalExams}
- avgScore: ${avgScore}
- level: ${level}
- examProgress: ${examProgress}

Latest Submission:
- examTitle: ${examTitle}
- timeSpent: ${timeSpent}
- totalScore: ${score}
- article (truncated): ${article.slice(0, 200)}

Below are the mistakes (if any). We do NOT want questionId displayed; only the text:
${mistakesInfo}

Please produce valid JSON with the structure:

{
  "summary": {
    "totalExams": ...,
    "avgScore": ...,
    "level": ...,
    "examProgress": ...
  },
  "examAnalysis": {
    "examTitle": "...",
    "timeSpent": ...,
    "score": ...,
    "keyObservations": "1-2 sentences about performance"
  },
  "recentMistakesAnalysis": [
    {
      "questionContent": "...",
      "userAnswer": "...",
      "correctAnswer": "...",
      "whyWrong": "...",
      "knowledgePoint": "...",
      "improvementTip": "..."
    }
  ],
  "overallAdvice": "..."
}

In "recentMistakesAnalysis", do NOT output any questionId field, only questionContent, userAnswer, correctAnswer, whyWrong, knowledgePoint, improvementTip.
whyWrong,knowledgePoint,improvementTip and overallAdvice are must related to IELTS.improvementTip must give related english meaning and explanation.
No disclaimers or extra text. Only valid JSON.
`.trim();
}
