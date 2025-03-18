// src/pages/AiSuggestion.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 1) Import the backend API
import { fetchUserSubmissions } from '../api/analysis';

// 2) Import styles
import './AiSuggestion.css';
import './pillTabs.css';

// 3) Import child components
import ReadingAnalysis from './ReadingAnalysis';
import EssayReport from './EssayReport';
// === Import the LearningPath page ===
import LearningPath from './LearningPath';

export default function AiSuggestion({ userId, onAdviceGenerated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // All submissions
  const [allSubmissions, setAllSubmissions] = useState([]);
  // Current tab: "reading" | "essay" | "learningPath"
  const [activeTab, setActiveTab] = useState('reading');

  // === AI report related states ===
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [fetchingAdvice, setFetchingAdvice] = useState(false);

  // =========== 1) Validate user & fetch submissions ===========
  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    setLoading(true);

    fetchUserSubmissions(userId, 20)
      .then((allSubs) => {
        setAllSubmissions(allSubs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId, navigate]);

  // =========== 2) Handle "Generate AI report" logic ===========
  const handleAiSuggestion = async () => {
    try {
      setFetchingAdvice(true);
      setShowReport(false);
      setReportData(null);
      setError(null);

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/analysis/ai-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI suggestion error');
      }

      // data.aiAdvice might be a JSON string
      try {
        const parsed = JSON.parse(data.aiAdvice);
        setReportData(parsed);
      } catch (e) {
        console.warn('Failed to parse aiAdvice:', e);
        setReportData(null);
      }
      setShowReport(true);

      if (onAdviceGenerated) {
        onAdviceGenerated();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingAdvice(false);
    }
  };

  // =========== 3) Learning Path data lifted up here ===========
  //    so it won't get lost when the tab unmounts.
  const [learningPathData, setLearningPathData] = useState(null);

  if (loading) {
    return <div>Loading AI Suggestion...</div>;
  }
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="aiSuggestion-container">
      {/* Tab switch buttons */}
      <div className="aiSuggestion-tabs">
        <button
          className={activeTab === 'reading' ? 'active' : ''}
          onClick={() => setActiveTab('reading')}
        >
          Reading Analysis
        </button>
        <button
          className={activeTab === 'essay' ? 'active' : ''}
          onClick={() => setActiveTab('essay')}
        >
          Custom Analysis
        </button>
        {/* New tab button for Learning Path */}
        <button
          className={activeTab === 'learningPath' ? 'active' : ''}
          onClick={() => setActiveTab('learningPath')}
        >
          Learning Path
        </button>
      </div>

      {/* =========== Reading Tab =========== */}
      {activeTab === 'reading' && (
        <ReadingAnalysis
          submissions={allSubmissions.filter((s) => s.examType === 'IELTS')}
          showReport={showReport}
          reportData={reportData}
          fetchingAdvice={fetchingAdvice}
          onGenerateAi={handleAiSuggestion}
        />
      )}

      {/* =========== Essay Tab =========== */}
      {activeTab === 'essay' && (
        <EssayReport
          submissions={allSubmissions.filter(
            (s) => s.examType === 'ESSAY' || s.examType === 'CUSTOM'
          )}
        />
      )}

      {/* =========== Learning Path Tab =========== */}
      {activeTab === 'learningPath' && (
        <LearningPath
          userId={userId}
          learningPathData={learningPathData}
          setLearningPathData={setLearningPathData}
        />
      )}
    </div>
  );
}