// src/pages/CustomExam.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReviewModal from './ReviewModal';
import SolutionModal from './SolutionModal'; 
import SubmitModal from './SubmitModal'; 
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './CustomExam.css';

export default function CustomExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [startTime] = useState(Date.now());

  const [exam, setExam]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Store user answers: questionId => answer
  const [userAnswers, setUserAnswers] = useState({});
  // Local scoring
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState({});

  // UI states
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [textSize, setTextSize] = useState('medium');
  const [textSizeOpen, setTextSizeOpen] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [hideSubmit, setHideSubmit] = useState(false);

  // Split layout
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [leftWidth, setLeftWidth] = useState('50%');

  // After submission
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [scoringExam, setScoringExam] = useState(false);
  // ----------------------------
  // 1) Load exam data
  // ----------------------------
  useEffect(() => {
    if (!examId) {
      setError('No examId in URL');
      setLoading(false);
      return;
    }
    fetchExamData(examId);

    // Restore user answers from localStorage
    const saved = localStorage.getItem(`answers_${examId}`);
    if (saved) {
      setUserAnswers(JSON.parse(saved));
    }

    // Default split
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setLeftWidth(rect.width / 2);
    }
  }, [examId]);

  async function fetchExamData(id) {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/exams/${id}`);
      if (!res.ok) {
        throw new Error('Exam not found or server error');
      }
      const data = await res.json();
      setExam(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // ----------------------------
  // 2) Handle user answer
  // ----------------------------
  function handleChoose(questionId, chosenValue) {
    setUserAnswers(prev => {
      const newData = { ...prev, [questionId]: chosenValue };
      localStorage.setItem(`answers_${examId}`, JSON.stringify(newData));
      return newData;
    });
  }

  // ----------------------------
  // 3) Submit => local scoring + server save
  // ----------------------------
  async function handleSubmit() {
    if (!exam || !exam.questions) return;

    // (1) local scoring
    let correctCount = 0;
    const newFeedback = {};

    for (const qItem of exam.questions) {
      const qDoc = qItem.questionId;
      const userSelected = userAnswers[qDoc._id] || "";
      const correctAns   = (qDoc.answer || "").toString();
      let isCorrect = false;

      // Simple local scoring example
      if (qDoc.type === 'fill') {
        // ignoring case for fill
        if (userSelected.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
          isCorrect = true;
          correctCount++;
        }
      }
      else if (qDoc.type === 'multiple' || qDoc.type === 'match') {
        if (userSelected.trim() === correctAns.trim()) {
          isCorrect = true;
          correctCount++;
        }
      }
      // If you have shortAnswer / essay / caseStudy => you might skip local scoring or do partial checks

      newFeedback[qDoc._id] = { isCorrect, correctAnswer: correctAns };
    }

    setScore(correctCount);
    setFeedback(newFeedback);

    // (2) Prepare backend data
    const answersForBackend = exam.questions.map(q => ({
      questionId: q.questionId._id,
      userAnswer: userAnswers[q.questionId._id] || ""
    }));

    // (3) Send to server
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3000/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId: exam._id,
          answers: answersForBackend
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Submission error:", data.error);
      } else {
        console.log("Submission saved:", data);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
    // (4) show success modal
    setSubmitModalOpen(true);
  }

  function handleSubmitModalClose() {
    setSubmitModalOpen(false);
  }

  function handleRetake() {
    setUserAnswers({});
    setScore(null);
    setFeedback({});
    setSubmitModalOpen(false);
    localStorage.removeItem(`answers_${examId}`);
  }
  function handleChoose(questionId, chosenValue, event) {
    setUserAnswers(prev => {
      const newData = { ...prev, [questionId]: chosenValue };
      localStorage.setItem(`answers_${examId}`, JSON.stringify(newData));
      return newData;
    });
  
    // 自动扩展 textarea
    if (event?.target?.tagName === 'TEXTAREA') {
      event.target.style.height = 'auto'; // 先重置高度，防止塌缩
      event.target.style.height = `${event.target.scrollHeight}px`; // 根据内容调整
    }
  }
  

  // ----------------------------
  // 4) Show solutions
  // ----------------------------
  function handleSolution() {
    setShowSolutionModal(true);
  }
  function handleConfirmSolution() {
    setShowSolutionModal(false);
    setHideSubmit(true);
    setShowSolution(true);
  }
  function handleCancelSolution() {
    setShowSolutionModal(false);
  }

  // ----------------------------
  // 5) Download PDF
  // ----------------------------
  function handleDownloadPDF() {
    const pdfContent = document.getElementById('pdf-content');
    if (!pdfContent) return;

    html2canvas(pdfContent, { scale: 2, useCORS: true })
      .then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p','pt','a4');
        const pdfWidth  = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth  = canvas.width;
        const imgHeight = canvas.height;
        const ratio     = imgHeight / imgWidth;

        const pdfImgWidth  = pdfWidth;
        const pdfImgHeight = pdfWidth * ratio;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfImgWidth, pdfImgHeight);
        pdf.save('custom_exam.pdf');
      })
      .catch(err => {
        console.error('PDF download error:', err);
      });
  }

  // ----------------------------
  // 6) Other UI logic
  // ----------------------------
  function handleReview() {
    setReviewOpen(true);
  }
  function handleCloseReview() {
    setReviewOpen(false);
  }
  function toggleTextSizeMenu() {
    setTextSizeOpen(!textSizeOpen);
  }
  function handleSetSize(size) {
    setTextSize(size);
    setTextSizeOpen(false);
  }
  function toggleMenu() {
    setMenuOpen(m => !m);
  }
  function handleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  function handleExitTest() {
    navigate("/dashboard");
  }

  // drag for split layout
  function handleMouseDown(e) {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }
  function handleMouseMove(e) {
    if (!isDraggingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const minLeft = 200;
    const maxLeft = rect.width - 300;
    const newLeft = e.clientX - rect.left;

    if (newLeft < minLeft) {
      setLeftWidth(minLeft);
    } else if (newLeft > maxLeft) {
      setLeftWidth(maxLeft);
    } else {
      setLeftWidth(newLeft);
    }
  }
  function handleMouseUp() {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  if (loading) return <div className="customExam-container">Loading exam...</div>;
  if (error)   return <div className="customExam-container error">{error}</div>;
  if (!exam)   return <div className="customExam-container">No exam data</div>;

  // Filter questions by type
  const multipleQs = exam.questions.filter(q => q.questionId.type === 'multiple');
  const fillQs     = exam.questions.filter(q => q.questionId.type === 'fill');
  const matchQs    = exam.questions.filter(q => q.questionId.type === 'match');
  const shortAnsQs = exam.questions.filter(q => q.questionId.type === 'shortAnswer');
  const essayQs    = exam.questions.filter(q => q.questionId.type === 'essay');
  const caseQs     = exam.questions.filter(q => q.questionId.type === 'caseStudy');
  // (If you add more types in the future, do the same filtering)

  return (
    <div className="customExam-container">
              {/* 1) Add an overlay for "scoringExam" (flipping book) */}
      {scoringExam && (
        <div className="bookLoader-overlay">
          <div className="book">
            <div className="inner">
              <div className="left"></div>
              <div className="middle"></div>
              <div className="right"></div>
            </div>
            <ul>
              {[...Array(18)].map((_, i) => <li key={i}></li>)}
            </ul>
          </div>
          <p className="bookLoader-text">Uploading to GPT for scoring, please wait...</p>
        </div>
      )}

      {/* Top navbar */}
      <header className="customExam-navbar">
        <div className="customNav-left">
          <button className="icon-btn" onClick={handleFullScreen} title="FullScreen">⛶</button>
          <button className="icon-btn" onClick={toggleMenu} title="Menu">≡</button>
          {menuOpen && (
  <div className={`custom-dropdown ${menuOpen ? "show" : ""}`}>
    <button onClick={toggleTextSizeMenu}>
      Text Size {textSizeOpen ? '▲' : '▼'}
    </button>
    {textSizeOpen && (
      <div className="textSize-dropdown">
        <button onClick={() => handleSetSize('small')}  className="textSize-option small">Aa</button>
        <button onClick={() => handleSetSize('medium')} className="textSize-option medium">Aa</button>
        <button onClick={() => handleSetSize('large')}  className="textSize-option large">Aa</button>
      </div>
    )}
    <button onClick={handleSolution}>Solution</button>
    <button onClick={handleDownloadPDF}>Download PDF</button>
    <button onClick={handleExitTest}>Exit</button>
  </div>
)}

        </div>
  
        <div className="customNav-right">
          <button className="review-btn" onClick={handleReview}>🔍 Review</button>
          <ReviewModal
            isOpen={reviewOpen}
            onClose={handleCloseReview}
            questions={exam.questions}
            userAnswers={userAnswers}
          />
  
          {!hideSubmit ? (
            <button className="submit-btn" onClick={() => setSubmitModalOpen(true)}>
              Submit
            </button>
          ) : (
            <button className="exit-btn" onClick={handleExitTest}>
              Exit
            </button>
          )}
  
          {submitModalOpen && (
            <SubmitModal
              isOpen={submitModalOpen}
              onClose={() => setSubmitModalOpen(false)}
              exam={exam}
              userAnswers={userAnswers}
              startTime={startTime}
              setScore={setScore}
              setFeedback={setFeedback}
              setShowSolution={setShowSolution}
              setHideSubmit={setHideSubmit}
              onStartScoring={() => setScoringExam(true)}
              onFinishScoring={() => setScoringExam(false)}
            />
          )}
          {showSolutionModal && (
  <SolutionModal
    isOpen={showSolutionModal}
    onConfirm={handleConfirmSolution}
    onCancel={handleCancelSolution}
  />
)}

        </div>
      </header>
  
      {/* 
         根据 exam.article 是否存在来决定：
           - 有文章 => 左面板 + 分割条 + 右面板
           - 无文章 => 只渲染右面板（独占）
      */}
      <div className="split-layout" ref={containerRef} style={{ height: '100vh' }}>
        {exam.article && exam.article.trim() ? (
          <>
            {/* 有文章 => 显示左侧面板 + 分隔栏 */}
            <div className={`left-pane ${textSize}`} style={{ width: leftWidth }}>
              <div className="block">
                <section className="block__item">
                  <h2 className="block__head">{exam.title}</h2>
                  {exam.article.split(/\n\s*\n/).map((para, idx) => (
                    <p key={idx} className="block__body">{para}</p>
                  ))}
                </section>
              </div>
            </div>
  
            <div className="splitter-handle" onMouseDown={handleMouseDown}>
              <span className="splitter-icon">&#10094;&#10095;</span>
            </div>
          </>
        ) : null}
  
        {/* 右侧面板 => question list
           如果无文章，则它自动宽度100%，并加一个额外的类 “no-article-pane” 
           便于CSS里设置居中、两边收窄等
        */}
        <div 
          className={`right-pane ${!exam.article?.trim() ? 'no-article-pane' : ''}`}
        >
          {score !== null && (
            <div className="exam-score">
              You scored {score} / {exam.questions.length}
            </div>
          )}
  
          {/* 1) Multiple Choice */}
          {multipleQs.length > 0 && (
            <>
              <h2>Multiple-Choice Questions</h2>
              {multipleQs.map((qItem, idx) => {
                const qDoc = qItem.questionId;
                const userVal = userAnswers[qDoc._id] || "";
                const fb = feedback[qDoc._id] || null;
                return (
                  <div key={qDoc._id} className="question-block">
                    <p>Q{idx + 1}. {qDoc.content}</p>
                    {qDoc.options?.map(opt => (
                      <label key={opt} style={{ display:'block', marginLeft:'1rem' }}>
                        <input
                          type="radio"
                          value={opt}
                          checked={userVal === opt}
                          onChange={() => handleChoose(qDoc._id, opt)}
                        />
                        {opt}
                      </label>
                    ))}
                    {showSolution ? (
                      <div style={{ marginTop:'0.5rem', color:'blue' }}>
                        **Solution**: {qDoc.answer}
                      </div>
                    ) : (
                      fb && (
                        fb.isCorrect 
                          ? <div style={{ color:'green' }}>✓ Correct</div>
                          : <div style={{ color:'red' }}>
                              ✗ Incorrect, correct answer: <strong>{fb.correctAnswer}</strong>
                            </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* 2) Fill-in-the-Blank */}
          {fillQs.length > 0 && (
            <>
              <h2>Fill-in-the-Blank Questions</h2>
              {fillQs.map((qItem, idx) => {
                const qDoc = qItem.questionId;
                const userVal = userAnswers[qDoc._id] || "";
                const fb = feedback[qDoc._id] || null;

                return (
                  <div key={qDoc._id} className="question-block">
                    <p>Q{idx + 1}. {qDoc.content}</p>
                    <input
                      type="text"
                      value={userVal}
                      onChange={e => handleChoose(qDoc._id, e.target.value)}
                    />
                    {showSolution ? (
                      <div style={{ marginTop:'0.5rem', color:'blue' }}>
                        **Solution**: {qDoc.answer}
                      </div>
                    ) : (
                      fb && (
                        fb.isCorrect 
                          ? <div style={{ color:'green' }}>✓ Correct</div>
                          : <div style={{ color:'red' }}>
                              ✗ Incorrect, correct answer: <strong>{fb.correctAnswer}</strong>
                            </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* 3) Matching */}
          {matchQs.length > 0 && (
            <>
              <h2>Matching Questions</h2>
              {matchQs.map((qItem, idx) => {
                const qDoc = qItem.questionId;
                const userVal = userAnswers[qDoc._id] || "";
                const fb = feedback[qDoc._id] || null;

                return (
                  <div key={qDoc._id} className="question-block">
                    <pre>Q{idx + 1}. {qDoc.content}</pre>
                    <select
                      value={userVal}
                      onChange={e => handleChoose(qDoc._id, e.target.value)}
                    >
                      <option value="">--Select--</option>
                      {qDoc.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {showSolution ? (
                      <div style={{ marginTop:'0.5rem', color:'blue' }}>
                        **Solution**: {qDoc.answer}
                      </div>
                    ) : (
                      fb && (
                        fb.isCorrect 
                          ? <div style={{ color:'green' }}>✓ Correct</div>
                          : <div style={{ color:'red' }}>
                              ✗ Incorrect, correct answer: <strong>{fb.correctAnswer}</strong>
                            </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* 4) Short Answer */}
          {shortAnsQs.length > 0 && (
            <>
              <h2>Short Answer Questions</h2>
              {shortAnsQs.map((qItem, idx) => {
                const qDoc = qItem.questionId;
                const userVal = userAnswers[qDoc._id] || "";
                const fb = feedback[qDoc._id] || null;

                return (
                  <div key={qDoc._id} className="question-block">
                    <p>Q{idx + 1}. {qDoc.content}</p>
                    <textarea
                      rows={3}
                      value={userVal}
                      onChange={e => handleChoose(qDoc._id, e.target.value)}
                      placeholder="Type your short answer..."
                    />
                    {showSolution ? (
                      <div style={{ marginTop:'0.5rem', color:'blue' }}>
                        <strong>Solution:</strong> {qDoc.answer}
                      </div>
                    ) : (
                      fb && (
                        fb.isCorrect 
                          ? <div style={{ color:'green' }}>✓ Correct</div>
                          : <div style={{ color:'red' }}>
                              ✗ Incorrect, correct answer: <strong>{fb.correctAnswer}</strong>
                            </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* 5) Essay */}
          {essayQs.length > 0 && (
            <>
              <h2>Essay Questions</h2>
              {essayQs.map((qItem, idx) => {
                const qDoc = qItem.questionId;
                const userVal = userAnswers[qDoc._id] || "";
                const fb = feedback[qDoc._id] || null;

                return (
                  <div key={qDoc._id} className="question-block">
                    <p>Q{idx + 1}. {qDoc.content}</p>
                    <textarea
                      rows={6}
                      value={userVal}
                      onChange={e => handleChoose(qDoc._id, e.target.value)}
                      placeholder="Write your essay here..."
                    />
                    {showSolution ? (
                      <div style={{ marginTop:'0.5rem', color:'blue' }}>
                        <strong>Suggested Essay Outline:</strong> {qDoc.answer}
                      </div>
                    ) : (
                      fb && (
                        fb.isCorrect 
                          ? <div style={{ color:'green' }}>✓ 'Correct' (AI judge may be simplistic)</div>
                          : <div style={{ color:'red' }}>
                              ✗ Not matching the suggested essay: <strong>{fb.correctAnswer}</strong>
                            </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* 6) Case Study */}
          {caseQs.length > 0 && (
            <>
              <h2>Case Study Questions</h2>
              {caseQs.map((qItem, idx) => {
                const qDoc = qItem.questionId;
                const userVal = userAnswers[qDoc._id] || "";
                const fb = feedback[qDoc._id] || null;

                return (
                  <div key={qDoc._id} className="question-block">
                    <p>Q{idx + 1}. {qDoc.content}</p>
                    <textarea
                      rows={8}
                      value={userVal}
                      onChange={e => handleChoose(qDoc._id, e.target.value)}
                      placeholder="Analyze this case..."
                    />
                    {showSolution ? (
                      <div style={{ marginTop:'0.5rem', color:'blue' }}>
                        <strong>Case Analysis Guidance:</strong> {qDoc.answer}
                      </div>
                    ) : (
                      fb && (
                        fb.isCorrect 
                          ? <div style={{ color:'green' }}>✓ 'Correct'</div>
                          : <div style={{ color:'red' }}>
                              ✗ The sample solution: <strong>{fb.correctAnswer}</strong>
                            </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Hidden container => generate PDF */}
      <div
        id="pdf-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '800px',
          padding: '20px'
        }}
      >
        <h1>{exam.title}</h1>
        {exam.article && exam.article.split(/\n\s*\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <hr />
        <h2>Questions & Your Answers</h2>
        {exam.questions.map((qItem, index) => {
          const qDoc      = qItem.questionId;
          const userVal   = userAnswers[qDoc._id] || "";
          const correct   = qDoc.answer;
          const fb        = feedback[qDoc._id] || null;
          const isCorrect = fb?.isCorrect;

          return (
            <div key={qDoc._id} style={{ marginBottom:'1rem' }}>
              <p><strong>Q{index + 1}.</strong> {qDoc.content}</p>
              <p><em>Your Answer:</em> {userVal || '(no answer)'}</p>
              {(showSolution || fb) && (
                <p>
                  <strong>Correct Answer:</strong> {correct}
                  {fb && (
                    isCorrect 
                      ? <span style={{ color:'green', marginLeft:10 }}>✓ Correct</span>
                      : <span style={{ color:'red', marginLeft:10 }}>✗ Incorrect</span>
                  )}
                </p>
              )}
            </div>
          );
        })}
        {score !== null && (
          <div style={{ marginTop:'2rem', fontWeight:'bold' }}>
            Total Score: {score} / {exam.questions.length}
          </div>
        )}
      </div>
    </div>
  );
}
