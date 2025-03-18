// src/pages/FloatingNoteEditor.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Draggable from 'react-draggable';
import './FloatingNoteEditor.css';

export default function FloatingNoteEditor({
  editingNote,
  onClose,
  onSaveNote,  // <-- 父组件传进来的函数 (用来把新增/更新的note传回父组件)
  onDeleteNote // <-- 父组件传进来的函数 (用来把要删除的noteId传回父组件)
}) {
  const [title, setTitle] = useState(editingNote?.title || '');
  const [content, setContent] = useState(editingNote?.content || '');

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '');
      setContent(editingNote.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [editingNote]);

  const noteId = editingNote?.id;
  const isEditMode = !!noteId;

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim() && !content.trim()) {
      alert('Please enter title or content at least');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found. Please log in first.');
      return;
    }

    try {
      const url = isEditMode
        ? `http://localhost:3000/api/notes/${noteId}`
        : 'http://localhost:3000/api/notes';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save note');
      }
      // 请求成功 => 通知父组件更新notes state
      onSaveNote(data); // data是后端返回的更新/新增后的note
      // 关闭弹窗
      onClose();
    } catch (err) {
      alert(err.message || 'Error saving note');
    }
  }

  async function handleDelete() {
    if (!isEditMode) return; // 没有noteId时不执行删除

    const confirmDel = window.confirm('Are you sure you want to delete this note?');
    if (!confirmDel) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found. Please log in first.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }
      // 请求成功 => 通知父组件删除该笔记ID
      onDeleteNote(noteId);
      // 关闭弹窗
      onClose();
    } catch (err) {
      alert(err.message || 'Error deleting note');
    }
  }

  return ReactDOM.createPortal(
    <Draggable handle="#notebook-paper > header">
      <div
        id="notebook-paper"
        style={{
          position: 'fixed',
          top: '10%',
          left: '10%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <header>
          <h1>Notebook</h1>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div id="content" style={{ flex: 1 }}>
            <p style={{ marginBottom: '1rem' }}>Write your note below:</p>

            <input
              className="notebook-input"
              type="text"
              placeholder="Note title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="notebook-textarea"
              rows="6"
              placeholder="Note content..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 0 20px 0' }}>
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                style={{ marginRight: 'auto', color: 'red' }}
              >
                Delete
              </button>
            )}

            <button type="submit" style={{ marginRight: '10px' }}>
              Save
            </button>
          </div>
        </form>
      </div>
    </Draggable>,
    document.body
  );
}
