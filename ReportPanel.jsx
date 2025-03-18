// ReportPanel.jsx
import MistakesPanel from './MistakesPanel';
import './ReportPanel.css'; // ① 引入外部CSS

export default function ReportPanel({ reportData }) {
  if (!reportData) {
    return (
      <div className="report-panel-container">
        <h2>AI Reading Report</h2>
        <p className="report-error">No valid JSON from GPT.</p>
      </div>
    );
  }

  const { summary, examAnalysis, recentMistakesAnalysis, overallAdvice } = reportData;

  return (
    <div className="report-panel-container">
      <h2 className="report-panel-title">AI Reading Report</h2>

      {summary && (
        <div className="report-panel-section summary-section" style={{ marginBottom: '1rem' }}>
          <h3>Summary</h3>
          <p>TotalExams: {summary.totalExams}</p>
          <p>AvgScore: {summary.avgScore}</p>
          <p>Level: {summary.level}</p>
          <p>ExamProgress: {summary.examProgress}</p>
        </div>
      )}

      {examAnalysis && (
        <div className="report-panel-section exam-analysis-section" style={{ marginBottom: '1rem' }}>
          <h3>Exam Analysis</h3>
          <p><strong>ExamTitle:</strong> {examAnalysis.examTitle}</p>
          <p><strong>TimeSpent:</strong> {examAnalysis.timeSpent}</p>
          <p><strong>Score:</strong> {examAnalysis.score}</p>
          <p><strong>KeyObservations:</strong> {examAnalysis.keyObservations}</p>
        </div>
      )}

      <MistakesPanel
        mistakes={Array.isArray(recentMistakesAnalysis) ? recentMistakesAnalysis : []}
      />

      {overallAdvice && (
        <div className="report-panel-section advice-section" style={{ marginBottom: 0 }}>
          <h3>Overall Advice</h3>
          <p style={{ whiteSpace:'pre-wrap' }}>{overallAdvice}</p>
        </div>
      )}
    </div>
  );
}
