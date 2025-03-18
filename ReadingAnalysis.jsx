// src/pages/ReadingAnalysis.jsx
import { useEffect, useRef, useState } from 'react';
import { transformData, drawCanvasChart } from './chartUtils';
import ReportPanel from './ReportPanel';

export default function ReadingAnalysis({
  submissions = [],
  showReport,
  reportData,
  fetchingAdvice,
  onGenerateAi,
}) {
  const canvasRef = useRef(null);
  const labelRef  = useRef(null);

  // metric: "score" | "time"
  const [metric, setMetric] = useState('score');

  // =========== 1) 当 submissions 或 metric 改变时，重绘图表 =========== 
  useEffect(() => {
    if (!canvasRef.current || !labelRef.current) return;
    if (!submissions.length) return;

    const chartData = transformData(submissions, metric);
    drawCanvasChart(canvasRef.current, labelRef.current, chartData, metric);
  }, [submissions, metric]);

  return (
    <div className="readingPanel" style={{ display: 'flex', flex: 1 }}>
      {/* 左侧：图表区 */}
      <div
        style={{
          flex: showReport ? '0 0 60%' : '0 0 100%',
          transition: 'all 0.3s ease',
          padding: '1rem'
        }}
      >
        <h2>IELTS READING</h2>

        {/* Pill Tabs for score/time */}
        <div className="pill-tabs-container">
          <div className="tabs">
            <input
              type="radio"
              id="radio-score"
              name="pilltabs"
              checked={metric === 'score'}
              onChange={() => setMetric('score')}
            />
            <label className="tab" htmlFor="radio-score">Score</label>

            <input
              type="radio"
              id="radio-time"
              name="pilltabs"
              checked={metric === 'time'}
              onChange={() => setMetric('time')}
            />
            <label className="tab" htmlFor="radio-time">TimeSpent</label>

            <span className="glider"></span>
          </div>
        </div>

        {/* Reading 图表 */}
        <div
          style={{
            position: 'relative',
            width: '700px',
            height: '300px',
            border: '1px solid #555',
            margin: '1rem auto'
          }}
        >
          <canvas ref={canvasRef} width="700" height="300"></canvas>
          {/* 悬浮提示 label */}
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

        {/* 生成AI报告按钮 */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            className="genAiBtn"
            onClick={onGenerateAi}
            disabled={fetchingAdvice}
          >
            {fetchingAdvice ? "Generating AI Advice..." : "Generate AI Advice"}
          </button>
        </div>
      </div>

      {/* 右侧：报告区 */}
      <div
        className="aiSuggestion-reportSide"
        style={{
          flex: showReport ? '0 0 40%' : '0 0 0%',
          opacity: showReport ? 1 : 0,
          transition: 'all 0.3s ease',
          padding: '1rem'
        }}
      >
        {showReport && <ReportPanel reportData={reportData} />}
      </div>
    </div>
  );
}
