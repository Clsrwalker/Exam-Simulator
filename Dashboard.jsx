// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeBG from './ThreeBG';
import AiSuggestion from './AiSuggestion';
import ExamRecordsModal from './ExamRecordsModal';
import ThemeToggleButton from './ThemeToggleButton';
import NotebookPage from './NotebookPage';
import FloatingNoteEditor from './FloatingNoteEditor';
import CalendarPage from './CalendarPage';
import ChatBox from './ChatBox';
import EditProfileModal from './EditProfileModal';
import CreateCustomExamModal from './CreateCustomExamModal';

import './Dashboard.css';
import './BookLoader.css';
import './SidebarPages.css';
import './NotebookPage.css';

// Example thresholds and level names
const levelThresholds = {
  1: 10,
  2: 20,
  3: 30,
  4: 40,
  5: Infinity
};
const levelNames = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
  5: '∞ Infinity'
};

// ChatPage component
function ChatPage({ isExpanded }) {
  return (
    <div className="chatPage-container">
      <ChatBox isExpanded={isExpanded} />
    </div>
  );
}

export default function MyDashboard() {
  const navigate = useNavigate();

  // ============== User & Theme ==============
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const userId = localStorage.getItem('userId');

  // ============== Notes ==============
  const [notes, setNotes] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  // ============== Sidebar pages ==============
  const [sidebarPage, setSidebarPage] = useState('calendar');

  // ============== Exam & Records ==============
  const [showExamModal, setShowExamModal] = useState(false);
  const [generatingExam, setGeneratingExam] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);

  // ============== Custom Exam Modal ==============
  const [showCustomExamModal, setShowCustomExamModal] = useState(false);

  // ============== AI Chat Expand ==============
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const handleAdviceGenerated = () => setIsChatExpanded(true);

  // ============== Edit Profile Modal ==============
  function handleEditProfile() {
    setShowEditModal(true);
  }
  function handleCloseEditModal() {
    setShowEditModal(false);
  }

  // ------------- A) Validate login & fetch user -------------
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:3000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch user info');
        }
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
        navigate('/login');
      });
  }, [navigate]);

  // ------------- B) Fetch notes after login -------------
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('http://localhost:3000/api/notes', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch notes');
        }
        return res.json();
      })
      .then(data => setNotes(data))
      .catch(err => console.error('Fetch notes error:', err));
  }, []);

  // ------------- C) Load theme from localStorage -------------
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.body.classList.add('myDash-dark');
    } else {
      setTheme('light');
      document.body.classList.add('myDash-light');
    }
  }, []);

  // ------------- D) Toggle theme -------------
  function toggleTheme() {
    if (theme === 'light') {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
      document.body.classList.remove('myDash-light');
      document.body.classList.add('myDash-dark');
    } else {
      setTheme('light');
      localStorage.setItem('theme', 'light');
      document.body.classList.remove('myDash-dark');
      document.body.classList.add('myDash-light');
    }
  }

  // ------------- E) Logout -------------
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  }

  // ------------- F) Notes -------------
  function handleCreateNote() {
    setEditingNote(null);
    setShowEditor(true);
  }
  function handleShowNote(note) {
    setEditingNote(note);
    setShowEditor(true);
  }
  async function handleSaveNote(noteData) {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found.');
      return;
    }
  
    const isEditMode = !!noteData.id;
    const url = isEditMode
      ? `http://localhost:3000/api/notes/${noteData.id}`
      : 'http://localhost:3000/api/notes';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: noteData.title,
          content: noteData.content
        })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save note');
      }
  
      if (!isEditMode) {
        setNotes(prev => [result, ...prev]);
      } else {
        setNotes(prev => prev.map(n => n.id === noteData.id ? result : n));
      }
  
      setShowEditor(false);
      setEditingNote(null);
    } catch (err) {
      alert('Error saving note: ' + err.message);
    }
  }
  async function handleDeleteNote(noteId) {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found.');
      return;
    }

    if (!window.confirm('Are you sure to delete this note?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }
      setNotes(prev => prev.filter(n => n.id !== noteId));
      setShowEditor(false);
      setEditingNote(null);
    } catch (err) {
      alert('Error deleting note: ' + err.message);
    }
  }
  function closeFloatingNote() {
    setShowEditor(false);
    setEditingNote(null);
  }

  // ------------- G) Exams -------------
  function handleStartExam() {
    setShowExamModal(true);
  }
  function handleCloseModal() {
    setShowExamModal(false);
  }
  async function handleSelectExam(examType) {
    if (examType === 'IELTS') {
      try {
        setGeneratingExam(true);
        const res = await fetch('http://localhost:3000/api/ielts/reading/generate', {
          method: 'POST'
        });
        if (!res.ok) {
          throw new Error('Failed to generate IELTS exam');
        }
        const examData = await res.json();
        navigate(`/ielts-exam/${examData._id}`);
      } catch (error) {
        alert('Error: ' + error.message);
      } finally {
        setGeneratingExam(false);
        setShowExamModal(false);
      }
    }
    else if (examType === 'CUSTOM') {
      setShowExamModal(false);
      setShowCustomExamModal(true);
    }
    else {
      alert(`Exam type ${examType} not implemented yet`);
    }
  }

  // ------------- H) Profile update -------------
  async function handleSaveProfile(updateData) {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg);
      }
      const result = await res.json();
      setUser(result.user);
      setShowEditModal(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Update profile error:', err);
      alert('Error: ' + err.message);
    }
  }

  // ------------- Records Modal -------------
  function handleOpenRecordsModal() {
    setShowRecordsModal(true);
  }
  function handleCloseRecordsModal() {
    setShowRecordsModal(false);
  }

  // ------------- Handle loading or error -------------
  if (loading) {
    return <div style={{ margin: 30 }}>Loading user info...</div>;
  }
  if (error) {
    return <div style={{ margin: 30, color: 'red' }}>Error: {error}</div>;
  }
  if (!user) {
    return <div style={{ margin: 30 }}>No user data found</div>;
  }

  // ------------- Calculate user level progress -------------
  const levelName = levelNames[user.level] || 'Unknown';
  const threshold = levelThresholds[user.level] || Infinity;
  let ratio = 0;
  let percentStr = '0%';
  if (user.level < 5) {
    ratio = user.examProgress / threshold;
    if (ratio > 1) ratio = 1;
    percentStr = (ratio * 100).toFixed(1) + '%';
  }

  return (
    <div className="myDash-container">
      {/* Header */}
      <header className="myDash-header">
        <h1 className="one-bounce-title">
          <span>E</span><span>x</span><span>a</span><span>m</span>
          <span>&nbsp;</span><span>&nbsp;</span>
          <span>S</span><span>i</span><span>m</span><span>u</span>
          <span>l</span><span>a</span><span>t</span><span>o</span>
          <span>r</span>
          <span>&nbsp;</span><span>&nbsp;</span>
          <span>D</span><span>a</span><span>s</span><span>h</span>
          <span>b</span><span>o</span><span>a</span><span>r</span>
          <span>d</span>
        </h1>

        <div className="myDash-headerActions">
          <button className="myDash-logoutBtn" onClick={handleLogout}>
            Logout
          </button>
          <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* If the exam is generating, show overlay */}
      {generatingExam && (
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
          <p className="bookLoader-text">Exam is generating, please wait...</p>
        </div>
      )}

      {/* Main content: sidebar + main */}
      <div className="myDash-content">
        {/* Sidebar */}
        <aside className="myDash-sidebar">
          <div className="userCard-bg" style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0
            }}>
              <ThreeBG />
            </div>
            <div className="userCard" style={{ position: 'relative', zIndex: 1 }}>
              <div className="avatar-wrapper">
                {user.avatarUrl ? (
                  <img
                    className="user-avatar"
                    src={`http://localhost:3000${user.avatarUrl}`}
                    alt="avatar"
                  />
                ) : (
                  <img
                    className="user-avatar"
                    src="/images/defaultAvatar.png"
                    alt="default avatar"
                  />
                )}
              </div>
              <h3 className="userName">{user.name || 'N/A'}</h3>
              <p className="userEmail">{user.email}</p>

              <p className="userLevel">Level: {levelName}</p>
              {user.level < 5 ? (
                <>
                  <p>Progress: {user.examProgress}/{threshold}</p>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: percentStr }}
                    />
                  </div>
                </>
              ) : (
                <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
                  Max Level Reached (∞)
                </p>
              )}

              <button className="myDash-editBtn" onClick={handleEditProfile}>
                Edit Profile
              </button>
            </div>
          </div>

          {/* Multi-page box */}
          <div className="multiPageBox">
            <div className="multiPageBox-tabs">
              <button
                className={sidebarPage === 'calendar' ? 'active' : ''}
                onClick={() => setSidebarPage('calendar')}
              >
                Calendar
              </button>
              <button
                className={sidebarPage === 'notebook' ? 'active' : ''}
                onClick={() => setSidebarPage('notebook')}
              >
                Notebook
              </button>
              <button
                className={sidebarPage === 'chat' ? 'active' : ''}
                onClick={() => setSidebarPage('chat')}
              >
                AI Chat
              </button>
            </div>

            <div className="multiPageBox-content">
              {sidebarPage === 'calendar' && <CalendarPage />}
              {sidebarPage === 'notebook' && (
                <NotebookPage
                  notes={notes}
                  setNotes={setNotes}
                  onCreateNote={handleCreateNote}
                  onShowNote={handleShowNote}
                />
              )}
              {sidebarPage === 'chat' && (
                <ChatPage isExpanded={isChatExpanded} />
              )}
            </div>
          </div>
        </aside>

        {/* EditProfileModal */}
        {showEditModal && (
          <EditProfileModal
            user={user}
            onClose={handleCloseEditModal}
            onSave={handleSaveProfile}
            onUpdateUser={updatedUser => setUser(updatedUser)}
          />
        )}

        {/* Main content (right side) */}
        <main className="myDash-mainContent">
          <div
            className="myDash-card clickable ripple-effect"
            onClick={handleStartExam}
          >
            <h2>Exam Entrance</h2>
            <p>Click here to start your exam.</p>
          </div>

          <div className="myDash-card">
            <AiSuggestion userId={userId} onAdviceGenerated={handleAdviceGenerated} />
          </div>

          <div
            className="myDash-card clickable ripple-effect"
            onClick={handleOpenRecordsModal}
          >
            <h2>Exam Records</h2>
            <p>Click here to view your exam records.</p>
          </div>
        </main>
      </div>

      {/* ExamRecordsModal */}
      {showRecordsModal && (
        <ExamRecordsModal
          userId={userId}
          onClose={handleCloseRecordsModal}
        />
      )}

      {/* Select exam type popup */}
      {showExamModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select Exam Type</h2>
            <button
              className="exam-type-btn"
              onClick={() => handleSelectExam('IELTS')}
            >
              IELTS
            </button>
            <button
              className="exam-type-btn"
              onClick={() => handleSelectExam('CUSTOM')}
            >
              Custom
            </button>
            <button className="close-modal" onClick={handleCloseModal}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CreateCustomExamModal */}
      {showCustomExamModal && (
        <CreateCustomExamModal
          onClose={() => setShowCustomExamModal(false)}
          onStartGenerating={() => setGeneratingExam(true)}
          onFinishGenerating={() => setGeneratingExam(false)}
        />
      )}

      {/* FloatingNoteEditor */}
      {showEditor && (
        <FloatingNoteEditor
          editingNote={editingNote}
          onClose={closeFloatingNote}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
        />
      )}
    </div>
  );
}
