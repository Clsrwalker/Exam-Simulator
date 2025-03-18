// MistakesPanel.jsx
import { useState } from 'react';
import './MistakesPanel.css'; // ① 引入CSS文件

export default function MistakesPanel({ mistakes }) {
  const [page, setPage] = useState(0);

  // 如果没有错题
  if (!Array.isArray(mistakes) || mistakes.length === 0) {
    return (
      <div className="mistakes-panel">
        <h3>Mistakes</h3>
        <p className="no-mistakes">No mistakes found.</p>
      </div>
    );
  }

  // 错题总数
  const total = mistakes.length;
  // 取当前页对应的那条错题
  const current = mistakes[page];

  // 翻页函数
  const handlePrev = () => setPage(p => Math.max(0, p - 1));
  const handleNext = () => setPage(p => Math.min(total - 1, p + 1));

  return (
    <div className="mistakes-panel">
      <h3>Mistakes ({page + 1}/{total})</h3>

      {/* 当前这一条错题 */}
      {current && (
        <div className="mistake-item">
          {current.questionContent && (
            <p><strong>Question:</strong> {current.questionContent}</p>
          )}
          <p><strong>UserAnswer:</strong> {current.userAnswer}</p>
          <p><strong>Correct:</strong> {current.correctAnswer}</p>
          <p><strong>WhyWrong:</strong> {current.whyWrong}</p>
          <p><strong>Knowledge:</strong> {current.knowledgePoint}</p>
          <p><strong>Tip:</strong> {current.improvementTip}</p>
        </div>
      )}

      {/* 分页按钮 */}
      <div className="mistakes-pagination">
        <button 
          onClick={handlePrev}
          disabled={page === 0}
          style={{ marginRight:'1rem' }}
        >
          Prev
        </button>
        <button 
          onClick={handleNext}
          disabled={page === total - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
