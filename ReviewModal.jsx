import React from 'react';
import './ReviewModal.css'; // 这里放对应样式

function ReviewModal({ isOpen, onClose, questions, userAnswers }) {
  // 如果没打开, 不渲染或返回 null
  if (!isOpen) return null;

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      {/* 阻止点击内容区时冒泡关闭 */}
      <div className="review-modal-content" onClick={e => e.stopPropagation()}>
        {/* 右上角关闭icon */}
        <button className="close-icon" onClick={onClose}>
          &times;
        </button>
        
        <h2 className="review-title">Review your answers</h2>
        <p className="review-subtitle">
          * This window is to review your answers only, you cannot change the answers in here
        </p>

        {/* 显示题号和答案 => 用表格或网格 */}
        <div className="review-grid">
          {questions.map((qItem, index) => {
            const questionNumber = index + 1; // 1-based
            const rawAnswer = userAnswers[qItem.questionId._id] || "";
            let displayAnswer = rawAnswer;
            // 如果答案里是类似 "A. ..."、"B. ...", 只想留字母
            // 可以用简单方法：取第一个字符
            // (或更严谨: 检查格式再取)
            if (/^[A-Z]\.\s/.test(rawAnswer)) {
              displayAnswer = rawAnswer.charAt(0);  // 取第一个字符" A B C D"
            }
            return (
              <div key={qItem.questionId._id} className="review-cell">
                <strong>Q{questionNumber}:</strong> {displayAnswer}
                {/* 如果想显示该题的用户答案: */}
               
              </div>
            );
          })}
        </div>

      
      </div>
    </div>
  );
}

export default ReviewModal;
