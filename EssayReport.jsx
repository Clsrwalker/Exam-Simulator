import { useEffect, useRef, useState } from 'react';
import { drawCanvasChart } from './chartUtils';

function normalizeQuestionType(rawType) {
  if (!rawType) return 'multiple';
  const lower = rawType.toLowerCase().trim();
  switch (lower) {
    case 'essay':       return 'essay';
    case 'casestudy':   return 'caseStudy';
    case 'shortanswer': return 'shortAnswer';
    case 'fill':        return 'fill';
    case 'match':       return 'match';
    case 'multiple':    return 'multiple';
    default:            return 'multiple';
  }
}

const QUESTION_TYPE_LIST = [
  { label: 'Essay',         value: 'essay'       },
  { label: 'Case Study',    value: 'caseStudy'   },
  { label: 'Short Answer',  value: 'shortAnswer' },
  { label: 'Fill',          value: 'fill'        },
  { label: 'Match',         value: 'match'       },
  { label: 'Multiple',      value: 'multiple'    },
];

export default function EssayReport({ submissions = [] }) {
  const [latestEssaySubmission, setLatestEssaySubmission] = useState(null);

  // (A) 寻找包含 essay/caseStudy/shortAnswer 的提交
  useEffect(() => {
    const essaySubs = submissions.filter(sub => {
      if (!sub.examSnapshot?.questions) return false;
      return sub.examSnapshot.questions.some(q => {
        const mapped = normalizeQuestionType(q.type);
        return mapped === 'essay' || mapped === 'caseStudy' || mapped === 'shortAnswer';
      });
    });
    if (!essaySubs.length) {
      setLatestEssaySubmission(null);
      return;
    }
    setLatestEssaySubmission(essaySubs[0]);
  }, [submissions]);

  const [currentTypeIndex, setCurrentTypeIndex] = useState(0);
  const canvasRef = useRef(null);
  const labelRef = useRef(null);

  const handlePrevType = () => {
    setCurrentTypeIndex(prev => (prev - 1 + QUESTION_TYPE_LIST.length) % QUESTION_TYPE_LIST.length);
  };
  const handleNextType = () => {
    setCurrentTypeIndex(prev => (prev + 1) % QUESTION_TYPE_LIST.length);
  };

  // (C) 图表：按题型汇总分数
  useEffect(() => {
    console.log("=== Chart Generation Debug Log Start ===");
    if (!canvasRef.current || !labelRef.current) return;

    const currentType = QUESTION_TYPE_LIST[currentTypeIndex].value;
    console.log("[DEBUG] currentTypeIndex =", currentTypeIndex, " => currentType =", currentType);

    // 先筛选包含此题型的 submission
    const filteredSubs = submissions.filter(sub => {
      if (!sub.examSnapshot?.questions) return false;
      return sub.examSnapshot.questions.some(q => {
        const mapped = normalizeQuestionType(q.type);
        return mapped === currentType;
      });
    });
    console.log(`[DEBUG] filteredSubs.length = ${filteredSubs.length} for type=${currentType}`);

    const typedSubs = filteredSubs.map((sub, idx) => {
      let typedScore = 0;

      console.log("\n[DEBUG] Processing submission:", sub._id || "(no _id)",
        " examType=", sub.examType,
        " aiScore=", sub.aiScore
      );

      // 逐个答案，尝试在 snapshot 中找到对应题
      sub.answers.forEach(ans => {
        // 1) 从 ans.questionId 中取出真正的 ID（兼容可能是对象或字符串）
        const ansQId = ans.questionId && typeof ans.questionId === 'object'
          ? ans.questionId._id     // 如果是对象，就拿它的 _id
          : ans.questionId;        // 否则直接用

        // 2) 在 snapshot 里找出对应题
        const snapQ = sub.examSnapshot?.questions?.find(q => {
          // 同理，snapshot 里的 questionId 也可能是对象，也做一次兼容
          const snapQId = q.questionId && typeof q.questionId === 'object'
            ? q.questionId._id
            : q.questionId;
          // 统一转成字符串对比
          return String(snapQId) === String(ansQId);
        });

        if (!snapQ) {
          console.warn(`[WARN] submission ${sub._id} has answer for questionId=${ans.questionId} but question not found in snapshot.`);
          return;
        }

        const mappedType = normalizeQuestionType(snapQ.type);
        console.log(`[DEBUG]   QID=${ansQId}, snapQ.type=${snapQ.type}, mappedType=${mappedType}, scoreObtained=${ans.scoreObtained}, userAnswer=${ans.userAnswer}`);

        if (mappedType === currentType) {
          let realScore = ans.scoreObtained;
          // 如果是 essay/caseStudy/shortAnswer 且 scoreObtained=0 => 用 AI 分数兜底
          if ((mappedType === 'essay' || mappedType === 'caseStudy' || mappedType === 'shortAnswer') && realScore === 0) {
            realScore = sub.aiScore || 0;
          }
          console.log(`[DEBUG]     => contributing realScore=${realScore}`);
          typedScore += realScore;
        }
      });

      console.log(`[DEBUG] => typedScore for sub ${sub._id} is ${typedScore}`);
      return { sub, typedScore };
    });

    // 整理数据，reverse() => 让最新提交在最前
    const chartData = typedSubs.map((item, i) => ({
      index: i + 1,
      value: item.typedScore,
      examTitle: item.sub.examSnapshot?.title || 'No Title'
    })).reverse();

    console.log("[DEBUG] Final chartData =", chartData);

    // 交给 drawCanvasChart 渲染
    drawCanvasChart(canvasRef.current, labelRef, chartData, 'score');
    console.log("=== Chart Generation Debug Log End ===\n");
  }, [submissions, currentTypeIndex]);

  // (D) 渲染
  return (
    <div style={{ padding: '1rem' }}>
      <h2>Latest Essay/Case Study Report</h2>
      {latestEssaySubmission ? (
        <>
          <p>
            <strong>AI Score: </strong>
            {latestEssaySubmission.aiScore !== undefined
              ? `${latestEssaySubmission.aiScore}/100`
              : '(No AI score)'}
          </p>

          {/* 重点：AI Feedback 可能是对象 */}
          <AIResponse feedback={latestEssaySubmission.aiFeedback} />

          <hr style={{ margin: '1rem 0' }} />
        </>
      ) : (
        <p>No essay, case study, or short answer submission found.</p>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>Score Trend by Question Type</h3>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button onClick={handlePrevType} style={{ marginRight: '1rem' }}>
            &lt; Prev
          </button>
          <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
            {QUESTION_TYPE_LIST[currentTypeIndex].label}
          </span>
          <button onClick={handleNextType} style={{ marginLeft: '1rem' }}>
            Next &gt;
          </button>
        </div>
        <div
          style={{
            position: 'relative',
            width: '700px',
            height: '300px',
            border: '1px solid #555',
            margin: '0 auto'
          }}
        >
          <canvas ref={canvasRef} width="700" height="300" />
          <div
            ref={labelRef}
            style={{
              position: 'absolute',
              display: 'none',
              background: 'rgba(255,255,255,0.8)',
              color: '#333',
              padding: '0.3em',
              pointerEvents: 'none',
              fontSize: '14px',
              borderRadius: '3px',
              boxShadow: '1px 1px 3px rgba(0,0,0,0.3)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** 统一处理 AI feedback，避免渲染 object 时报错 */
function AIResponse({ feedback }) {
  // 如果 feedback 不是一个对象，直接显示
  if (!feedback || typeof feedback !== 'object') {
    return (
      <div style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
        <strong>AI Feedback: </strong>
        {feedback || '(no AI feedback)'}
      </div>
    );
  }

  const keys = Object.keys(feedback);
  if (!keys.length) {
    return (
      <div style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
        <strong>Feedback: </strong>(empty object)
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
      <strong>Feedback:</strong>
      <ul style={{ marginTop: '0.5rem' }}>
        {keys.map((k) => {
          const val = feedback[k];
          // 若 val 是对象 => 转成字符串或深度解析
          if (typeof val === 'object' && val !== null) {
            return (
              <li key={k} style={{ marginBottom: '0.5rem' }}>
                <strong>{k}:</strong> {JSON.stringify(val)}
              </li>
            );
          } else {
            // val 是字符串或数字
            return (
              <li key={k} style={{ marginBottom: '0.5rem' }}>
                <strong>{k}:</strong> {val}
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
}
