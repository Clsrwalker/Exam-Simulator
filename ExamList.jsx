// src/pages/ExamList.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ExamList() {
  const [exams, setExams] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {

    axios.get('http://localhost:3000/api/exams') 
      .then(response => {
        console.log('API response:', response.data);
        setExams(response.data);
      })
      .catch(err => {
        console.error('API error:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Exam List</h2>
      <ul>
        {exams.map(exam => (
          <li key={exam._id}>{exam.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default ExamList;
