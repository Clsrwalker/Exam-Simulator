// src/pages/IeltsExam.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReviewModal from './ReviewModal';
import SolutionModal from './SolutionModal'; 
import SubmitModal from './SubmitModal'; 
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './IeltsExam.css';

function IeltsExam() {
  const { examId } = useParams();       
  const navigate   = useNavigate();
  const [startTime] = useState(Date.now());

  const [exam, setExam]        = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState(null);

  // 存放用户的作答: questionId => user answer
  const [userAnswers, setUserAnswers] = useState({});
  // 本地判分
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState({});

  // UI 状态
  const [menuOpen, setMenuOpen]       = useState(false);
  const [reviewOpen, setReviewOpen]   = useState(false);
  const [textSize, setTextSize]       = useState('medium'); 
  const [textSizeOpen, setTextSizeOpen] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [hideSubmit, setHideSubmit]     = useState(false);

  // 分栏
  const containerRef = useRef(null);
  const isDraggingRef= useRef(false);
  const [leftWidth, setLeftWidth]      = useState('50%');

  // 提交成功后弹窗
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // ----------------------------
  // 1) 初始化
  // ----------------------------
  useEffect(() => {
    if (!examId) {
      setError('No examId in URL');
      setLoading(false);
      return;
    }
    fetchExamData(examId);

    // 从 localStorage 恢复作答
    const saved = localStorage.getItem(`answers_${examId}`);
    if (saved) {
      setUserAnswers(JSON.parse(saved));
    }

    // 分栏初始 => 左Pane 半宽
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
  // 用户答题 -> 同步写 localStorage
  // ----------------------------
  function handleChoose(questionId, chosenValue) {
    setUserAnswers(prev => {
      const newData = { ...prev, [questionId]: chosenValue };
      localStorage.setItem(`answers_${examId}`, JSON.stringify(newData));
      return newData;
    });
  }

  // ----------------------------
  // 提交 => 本地判分 + 后端保存
  // ----------------------------
  async function handleSubmit() {
    if (!exam || !exam.questions) return;
  
    // (1) 本地判分
    let correctCount = 0;
    const newFeedback = {};
  
    for (const qItem of exam.questions) {
      const qDoc = qItem.questionId;
      const userSelected = userAnswers[qDoc._id] || "";
      const correctAns   = (qDoc.answer || "").toString();
      let isCorrect      = false;
  
      if (qDoc.type === 'fill') {
        // 忽略大小写
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
  
      newFeedback[qDoc._id] = { isCorrect, correctAnswer: correctAns };
    }
    // 更新前端显示的分数 & 对错反馈
    setScore(correctCount);
    setFeedback(newFeedback);
  
    // (2) 构造要发往后端的 answers
    const answersForBackend = exam.questions.map(q => ({
      questionId: q.questionId._id,                // 题目ID
      userAnswer: userAnswers[q.questionId._id] || ""  // 用户作答
    }));
  
    // (3) 携带 token 调用后端
    // 注意：后端在 authMiddleware 中会用 jwt.verify() 拿到 req.userId
    const token = localStorage.getItem('token');  // 假设用户登录后已存 token
    try {
      const res = await fetch('http://localhost:3000/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  // 重点：在头部传 JWT
        },
        body: JSON.stringify({
          examId: exam._id,        // 试卷ID
          answers: answersForBackend
          // 不再传 userId，让后端自行从 token 解析
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
  
    // (4) 打开提交成功弹窗
    setSubmitModalOpen(true);
  }
  

  // 关闭提交弹窗
  function handleSubmitModalClose() {
    setSubmitModalOpen(false);
  }
  // 再做一次 => 重置
  function handleRetake() {
    // 你可以清空 userAnswers，score, feedback
    setUserAnswers({});
    setScore(null);
    setFeedback({});
    setSubmitModalOpen(false);
    localStorage.removeItem(`answers_${examId}`);
  }

  // ----------------------------
  // Solution
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
  // Download PDF (离屏 #pdf-content)
  // ----------------------------
  function handleDownloadPDF() {
    const pdfContent = document.getElementById('pdf-content');
    if (!pdfContent) return;

    html2canvas(pdfContent, {
      scale: 2,
      useCORS: true
    })
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
        pdf.save('my_exam.pdf');
      })
      .catch(err => {
        console.error('PDF download error:', err);
      });
  }

  // ----------------------------
  // 其他UI逻辑
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

  // 分栏拖拽
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

    if (newLeft < minLeft) setLeftWidth(minLeft);
    else if (newLeft > maxLeft) setLeftWidth(maxLeft);
    else setLeftWidth(newLeft);
  }
  function handleMouseUp() {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  if (loading) return <div className="ieltsExam-container">Loading exam...</div>;
  if (error)   return <div className="ieltsExam-container error">{error}</div>;
  if (!exam)   return <div className="ieltsExam-container">No exam data</div>;

  const multipleQs = exam.questions.filter(q => q.questionId.type === 'multiple');
  const fillQs     = exam.questions.filter(q => q.questionId.type === 'fill');
  const matchQs    = exam.questions.filter(q => q.questionId.type === 'match');

  return (
    <div className="ieltsExam-container">
      {/* 顶部导航栏 */}
      <header className="ieltsExam-navbar">
        <div className="ieltsNav-left">
          <button className="icon-btn" onClick={handleFullScreen} title="FullScreen">⛶</button>
          <button className="icon-btn" onClick={toggleMenu} title="Menu">≡</button>
          {menuOpen && (
            <div className="ielts-dropdown">
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
              {showSolutionModal && (
                <SolutionModal
                isOpen={showSolutionModal}
                  onConfirm={handleConfirmSolution}
                  onCancel={handleCancelSolution}
                />
              )}
              <button onClick={handleDownloadPDF}>Download PDF</button>
              <button onClick={handleExitTest}>Exit</button>
            </div>
          )}
        </div>
        {/* 右侧菜单 */}
        <div className="ieltsNav-right">
          <button className="review-btn" onClick={handleReview}>🔍 Review</button>
          <ReviewModal
            isOpen={reviewOpen}
            onClose={handleCloseReview}
            questions={exam.questions}
            userAnswers={userAnswers}
          />
                   { !hideSubmit ? (
            // Submit按钮
            <button className="submit-btn" onClick={() => setSubmitModalOpen(true)}>
              ✈ Submit
            </button>
          ) : (
            // Exit按钮 (当 hideSubmit===true 时出现)
            <button className="exit-btn" onClick={handleExitTest}>
              Exit
            </button>
          )}
          {/* 提交后弹窗 */}
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
            />
          )}
        </div>
      </header>

      {/* 分栏布局 */}
      <div className="split-layout" ref={containerRef} style={{ height: '100vh' }}>
        {/* 左Pane => 文章 */}
        <div className={`left-pane ${textSize}`} style={{ width: leftWidth }}>
          <div className="block">
            <section className="block__item">
              <h2 className="block__head">{exam.title}</h2>
              {exam.article
                ? exam.article.split(/\n\s*\n/).map((para, idx) => (
                    <p key={idx} className="block__body">
                      {para}
                    </p>
                  ))
                : "No article text"}
            </section>
          </div>
        </div>

        {/* 分割线 */}
        <div className="splitter-handle" onMouseDown={handleMouseDown}>
          <span className="splitter-icon">&#10094;&#10095;</span>
        </div>

        {/* 右Pane => 题目列表 */}
        <div className="right-pane">
          {score !== null && (
            <div className="exam-score">
              You scored {score} / {exam.questions.length}
            </div>
          )}

          <h2>Questions 1-3</h2>
          <h3>Choose the correct letter A, B, C or D.</h3>
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
                      onChange={()=>handleChoose(qDoc._id, opt)}
                    />
                    {opt}
                  </label>
                ))}
                {/* 显示解答或判分反馈 */}
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

          <h2>Questions 4-6 (Fill in the blank)</h2>
          <h3>Complete the summary with ONE WORD ONLY.</h3>
          {fillQs.map((qItem, idx) => {
            const qDoc = qItem.questionId;
            const userVal = userAnswers[qDoc._id] || "";
            const fb = feedback[qDoc._id] || null;

            return (
              <div key={qDoc._id} className="question-block">
                <p>Q{idx + 4}. {qDoc.content}</p>
                <input
                  type="text"
                  value={userVal}
                  onChange={e=>handleChoose(qDoc._id, e.target.value)}
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

          <h2>Questions 7-10 (Matching)</h2>
          {matchQs.map((qItem, idx) => {
            const qDoc = qItem.questionId;
            const userVal = userAnswers[qDoc._id] || "";
            const fb = feedback[qDoc._id] || null;

            return (
              <div key={qDoc._id} className="question-block">
                <pre>Q{idx + 7}. {qDoc.content}</pre>
                <select
                  value={userVal}
                  onChange={e=>handleChoose(qDoc._id, e.target.value)}
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
        </div>
      </div>

      {/* 离屏容器 -> 生成 PDF */}
      <div
        id="pdf-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '800px', // 你想要的PDF宽度
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
              <p><em>Your Answer:</em> {userVal ? userVal : '(no answer)'}</p>

              {(showSolution || fb) && (
                <p>
                  <strong>Correct Answer:</strong> {correct}
                  {fb && (
                    isCorrect 
                      ? <span style={{ color:'green', marginLeft:10 }}>✓ Correct</span>
                      : <span style={{ color:'red',   marginLeft:10 }}>✗ Incorrect</span>
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

export default IeltsExam;
