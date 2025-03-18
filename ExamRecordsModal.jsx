import React, { useEffect, useState } from 'react';
import { fetchUserSubmissions } from '../api/analysis';  // 你已有的封装
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './ExamRecordsModal.css';

function ExamRecordsModal({ userId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);

  // 当前选中的某一次submission
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // 控制是否查看详情
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    // 拉取当前用户的submission
    fetchUserSubmissions(userId, 20)
      .then(data => {
        setSubmissions(data); 
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch submissions');
        setLoading(false);
      });
  }, [userId]);

  // 点击"查看详情/预览"按钮
  const handleViewDetail = (sub) => {
    setSelectedSubmission(sub);
    setShowDetail(true);
  };

  // 返回列表
  const handleBackToList = () => {
    setShowDetail(false);
    setSelectedSubmission(null);
  };

  /**
   * 使用 jsPDF + autoTable(方案A) 导出可复制文本的 PDF
   */
  const handleDownloadPDF = () => {
    if (!selectedSubmission) return;
  
    // 1) 创建 jsPDF 实例
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4'
    });
  
    // ========== 写基本信息 ==========
    doc.setFontSize(14);
    const title = selectedSubmission.examSnapshot?.title || 'No Title';
    doc.text(`Exam Title: ${title}`, 40, 40);
  
    doc.setFontSize(12);
    const dateStr = new Date(selectedSubmission.createdAt).toLocaleString();
    doc.text(`Exam Date: ${dateStr}`, 40, 60);
    doc.text(`Total Score: ${selectedSubmission.totalScore}`, 40, 80);
  
    // ========== 写文章正文 ==========
    const article = selectedSubmission.examSnapshot?.article || '';
    let tableStartY = 130; // 表格起始默认 Y 值
  
    if (article) {
      // (1) 用 splitTextToSize() 拆成多行
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(article, 500); 
      // 这里 500 表示在 500pt 宽度内自动换行
  
      // (2) 在 PDF 上输出该多行文本
      const initialY = 110;
      doc.text(lines, 40, initialY);
  
      // (3) 手动计算文本实际高度
      const fontSize = doc.getFontSize();           // 当前字体大小
      const lineHeightFactor = doc.getLineHeightFactor(); // 默认1.15
      const lineHeight = fontSize * lineHeightFactor;
      const textHeight = lines.length * lineHeight; 
      // 给一点额外空白
      tableStartY = initialY + textHeight + 20; 
    }
  
    // ========== 写表格 ==========
    const questions = selectedSubmission.examSnapshot?.questions || [];
    const answers   = selectedSubmission.answers || [];
  
    // 快速查表
    const userAnswerMap    = {};
    const correctAnswerMap = {};
    answers.forEach(a => {
      const qId = typeof a.questionId === 'object'
        ? a.questionId._id
        : a.questionId;
      userAnswerMap[qId] = a.userAnswer || '(no answer)';
  
      // 如果后端 populate 了 questionId，就可直接拿到正确答案
      if (a.questionId && a.questionId.answer) {
        correctAnswerMap[qId] = a.questionId.answer.toString();
      }
    });
  
    // 整理出 autoTable 的表格数据
    const tableBody = questions.map((qItem, index) => {
      const qId = qItem.questionId;
      const qContent   = qItem.content || '(no content)';
      const userAns    = userAnswerMap[qId] || '(no answer)';
      const correctAns = correctAnswerMap[qId] || '(no correct answer)';
      return [
        `Q${index + 1}: ${qContent}`, 
        userAns, 
        correctAns
      ];
    });
  
    // 调用 autoTable，从 tableStartY 开始绘制表格
    autoTable(doc, {
      startY: tableStartY,
      head: [['Question', 'Your Answer', 'Correct Answer']],
      body: tableBody,
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 20
      }
    });
  
    // 保存 PDF
    doc.save('exam_snapshot.pdf');
  };

  // ---------- 渲染 ----------
  if (loading) {
    return (
      <div className="records-modal-overlay">
        <div className="records-modal-content">
          <p>Loading records...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="records-modal-overlay">
        <div className="records-modal-content">
          <p style={{color:'red'}}>Error: {error}</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="records-modal-overlay">
      <div className="records-modal-content">
        {/* 标题 & 关闭按钮 */}
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <h2>Exam Records</h2>
          <button onClick={onClose} style={{ marginLeft:'auto' }}>X</button>
        </div>

        {/* 如果 showDetail 为true => 显示详情，否则显示列表 */}
        {!showDetail && (
          <div>
            <table className="records-table" style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Exam Date</th>
                  <th>Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const title = sub.examSnapshot?.title || sub.examId?.title || "Untitled";
                  const dateStr = new Date(sub.createdAt).toLocaleString();
                  return (
                    <tr key={sub._id} style={{ borderBottom:'1px solid #ccc' }}>
                      <td>{title}</td>
                      <td>{dateStr}</td>
                      <td>{sub.totalScore}</td>
                      <td>
                        <button onClick={()=>handleViewDetail(sub)}>
                          Show
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 详情预览 */}
        {showDetail && selectedSubmission && (
          <div>
            <button onClick={handleBackToList}>← Back</button>
            <h3>Exam Snapshot Preview</h3>
            <div
              style={{ 
                padding:'10px',
                border:'1px solid #999',
                margin:'10px 0',
                maxHeight:'400px',
                overflow:'auto'
              }}
            >
              {/* 这里渲染 examSnapshot 里的内容 */}
              {renderExamSnapshot(selectedSubmission)}
            </div>

            {/* 下载PDF按钮 */}
            <button onClick={handleDownloadPDF}>
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 渲染 examSnapshot + 用户答案 + 正确答案
 */
function renderExamSnapshot(submission) {
  const snapshot = submission.examSnapshot || {};

  // 先做一个答案查表
  const userAnswerMap = {};
  const correctAnswerMap = {};
  if (Array.isArray(submission.answers)) {
    submission.answers.forEach(a => {
      const qId = typeof a.questionId === 'object' 
        ? a.questionId._id 
        : a.questionId;

      userAnswerMap[qId] = a.userAnswer || '(no answer)';
      if (a.questionId && a.questionId.answer) {
        correctAnswerMap[qId] = a.questionId.answer.toString();
      }
    });
  }

  return (
    <div>
      <h4>{snapshot.title || 'No Title'}</h4>
      
      {snapshot.article && 
        snapshot.article.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))
      }

      <h5>Questions</h5>
      {Array.isArray(snapshot.questions) && snapshot.questions.map((qItem, idx) => {
        const qId        = qItem.questionId;
        const userAns    = userAnswerMap[qId] || '(no answer)';
        const correctAns = correctAnswerMap[qId] || '(N/A)';

        return (
          <div key={qId} style={{ margin:'8px 0' }}>
            <p>
              <strong>Q{idx+1}:</strong> {qItem.content}
            </p>

            {/* 如果有选项，就列出来 */}
            {qItem.options && qItem.options.length > 0 && (
              <ul>
                {qItem.options.map((op, i) => (
                  <li key={i}>{op}</li>
                ))}
              </ul>
            )}

            <p style={{ color: '#333', fontStyle: 'italic' }}>
              <strong>Your Answer: </strong>{userAns}
            </p>

            <p style={{ color: 'blue' }}>
              <strong>Correct Answer: </strong>{correctAns}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default ExamRecordsModal;
