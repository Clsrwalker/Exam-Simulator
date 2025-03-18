// src/pages/AiAnalysis.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'; 
// 简单示例使用LineChart
// 也可 import PieChart, RadarChart, etc.

function AiAnalysis() {
  const userId = localStorage.getItem('userId');
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [aiAdvice, setAiAdvice] = useState("");
  const [fetchingAdvice, setFetchingAdvice] = useState(false);


  // 1) 拉取submissions
  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/api/analysis/user/${userId}?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch user submissions");
        return res.json();
      })
      .then(data => {
        setSubmissions(data.submissions || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [navigate, userId]);

  // 2) 生成可视化所需 data
  //   例如: submissions => [ { createdAt, totalScore, timeSpent } ... ]
  const chartData = submissions.map((s, idx) => ({
    name: `Exam #${submissions.length - idx}`, // 逆序  // or just "Exam #idx"
    score: s.totalScore,
    time: s.timeSpent || 0
  })).reverse();

  // 3) 处理 AI Suggestion
  const handleAiSuggestion = async () => {
    setFetchingAdvice(true);
    setAiAdvice("");

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/analysis/ai-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,         // 必需
          // submissionIds: [...], // 可选: 前端指定要分析的submission
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI suggestion error');
      }
      setAiAdvice(data.aiAdvice || "(No advice returned)");
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingAdvice(false);
    }
  };

  if (loading) return <div>Loading analysis data...</div>;
  if (error)   return <div style={{ color:'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding:'1rem' }}>
      <h2>AI Analysis & Suggestions</h2>

      <div style={{ marginBottom:'1rem' }}>
        <button onClick={handleAiSuggestion} disabled={fetchingAdvice}>
          {fetchingAdvice ? 'Generating AI Advice...' : 'Generate AI Advice'}
        </button>
      </div>

      {aiAdvice && (
        <div style={{ whiteSpace:'pre-wrap', margin:'1rem 0', padding:'1rem', background:'#f9f9f9' }}>
          <h3>AI Suggestion:</h3>
          <p>{aiAdvice}</p>
        </div>
      )}

      <h3>Recent Submissions (Score Trend)</h3>
      <div style={{ width:'100%', height:'300px' }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={['dataMin - 1','dataMax + 1']} />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3>Time Spent Trend</h3>
      <div style={{ width:'100%', height:'300px' }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={['dataMin - 10','dataMax + 10']} />
            <Tooltip />
            <Line type="monotone" dataKey="time" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AiAnalysis;
