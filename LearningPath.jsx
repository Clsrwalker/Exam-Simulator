import React, { useState } from 'react';
import TreeComponent from './TreeComponent';
import { Box, Button, MenuItem, Select, TextField, Typography, Alert, CircularProgress } from '@mui/material';

export default function LearningPath({ userId, learningPathData, setLearningPathData }) {
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      if (setLearningPathData) {
        setLearningPathData(null);
      }

      const finalSubject = subject === 'Other' ? customSubject : subject;
      if (!finalSubject.trim()) {
        setError('Please select or enter a subject.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/learning-paths/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: finalSubject })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      if (setLearningPathData) {
        setLearningPathData(data.learningPath);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 选择栏 & 按钮 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '80%',
       
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '30px',
          padding: '12px 20px',
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
        }}
      >
        {/* 选择科目 */}
        <Select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            if (e.target.value !== 'Other') {
              setCustomSubject('');
            }
          }}
          displayEmpty
          variant="outlined"
          sx={{
            
            bgcolor: 'rgba(255,255,255,0.6)',
            borderRadius: '20px',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }}
        >
          <MenuItem value="">Select a subject</MenuItem>
          <MenuItem value="ComputerScience">Computer Science</MenuItem>
          <MenuItem value="Mathematics">Mathematics</MenuItem>
          <MenuItem value="Physics">Physics</MenuItem>
          <MenuItem value="Chemistry">Chemistry</MenuItem>
          <MenuItem value="Biology">Biology</MenuItem>
          <MenuItem value="Medicine">Medicine</MenuItem>
          <MenuItem value="Engineering">Engineering</MenuItem>
          <MenuItem value="Business">Business</MenuItem>
          <MenuItem value="Economics">Economics</MenuItem>
          <MenuItem value="History">History</MenuItem>
          <MenuItem value="Literature">Literature</MenuItem>
          <MenuItem value="Philosophy">Philosophy</MenuItem>
          <MenuItem value="Psychology">Psychology</MenuItem>
          <MenuItem value="Sociology">Sociology</MenuItem>
          <MenuItem value="Architecture">Architecture</MenuItem>
          <MenuItem value="Art">Art</MenuItem>
          <MenuItem value="Law">Law</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>

        {/* 自定义输入框 */}
        {subject === 'Other' && (
          <TextField
            placeholder="Enter a custom subject"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            variant="outlined"
            sx={{
              flexGrow: 1,
              ml: 2,
              bgcolor: 'rgba(255,255,255,0.6)',
              borderRadius: '20px',
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
            }}
          />
        )}

        {/* 生成按钮 */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerate}
          disabled={loading}
          sx={{
            fontWeight: 'bold',
            borderRadius: '20px',
            padding: '10px 20px',
            bgcolor: '#007BFF',
            transition: 'background 0.3s',
            ml: 2,
            '&:hover': {
              bgcolor: '#0056b3',
            },
            '&:disabled': {
              bgcolor: '#d6d9dc',
              color: '#aaa',
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate'}
        </Button>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 2,
            width: '100%',
     
            textAlign: 'center',
            borderRadius: '20px',
          }}
        >
          {error}
        </Alert>
      )}

      {/* 学习路径树状图（不会影响按钮） */}
      {learningPathData && (
        <Box
          sx={{
            mt: 3,
            width: '100%',
          
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '30px',
            padding: '20px',
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
          }}
        >
          <TreeComponent data={learningPathData} />
        </Box>
      )}
    </Box>
  );
}