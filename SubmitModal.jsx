// src/pages/SubmitModal.jsx
import React from 'react';
import './SubmitModal.css';

function SubmitModal({ 
  isOpen,
  onClose,
  exam,
  userAnswers,
  startTime,
  setScore,
  setFeedback,
  setShowSolution,
  setHideSubmit,
  // NEW: scoring callbacks
  onStartScoring,
  onFinishScoring
}) {
  if (!isOpen) return null;

  async function confirmAndSubmit() {
    onClose();
    // 1) Trigger the "scoring" state in the parent => show flipping book
    onStartScoring && onStartScoring();

    try {
      if (!exam || !exam.questions) return;

      // a) local time spent
      const now = Date.now();
      const timeSpentMinutes = Math.floor(((now - startTime) / 1000) / 60);

      // b) local scoring + building data for server
      let correctCount = 0;
      const newFeedback = {};
      const answersForBackend = exam.questions.map(qItem => {
        const qDoc = qItem.questionId;
        const userVal = userAnswers[qDoc._id] || "";
        const correctAns = String(qDoc.answer ?? "").trim();

        let isCorrect = false;
        if ((qDoc.type === 'fill' || qDoc.type === 'multiple' || qDoc.type === 'match')
            && correctAns.toLowerCase() === userVal.trim().toLowerCase()) {
          isCorrect = true;
          correctCount++;
        }

        newFeedback[qDoc._id] = { isCorrect, correctAnswer: correctAns };
        
        return {
          questionId: qDoc._id,
          userAnswer: userVal,
          wrongOptions: isCorrect ? [] : [userVal],
        };
      });

      setScore(correctCount);
      setFeedback(newFeedback);

      // c) send to server
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          examId: exam._id,
          timeSpent: timeSpentMinutes,
          answers: answersForBackend
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Submission error:", errData.error);
      } else {
        const data = await res.json();
        console.log("Submission saved:", data);
      }

      // d) show solutions & hide submit button
      setShowSolution(true);
      setHideSubmit(true);

      // close this modal
      onClose();
    } catch (err) {
      console.error('Scoring or submission error:', err);
      alert('Error: ' + err.message);
    } finally {
      // 2) Stop the flipping book animation no matter success or fail
      onFinishScoring && onFinishScoring();
    }
  }

  return (
    <div className="submitModal-overlay" onClick={onClose}>
      <div className="submitModal-content" onClick={e => e.stopPropagation()}>
        <h2 className="submitModal-title">
          Are you sure you want to submit?
        </h2>
        <div className="submitModal-body">
          <p>After submitting, you will see your score and solutions.</p>
          <div className="submitModal-actions">
            <button
              className="submitModal-btn submitModal-btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="submitModal-btn submitModal-btn--confirm"
              onClick={confirmAndSubmit}
            >
              Submit and Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubmitModal;
