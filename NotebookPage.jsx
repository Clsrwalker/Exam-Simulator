// src/pages/NotebookPage.jsx
import React, { useState } from 'react';
import './NotebookPage.css';
import FloatingNoteEditor from './FloatingNoteEditor';

export default function NotebookPage({ notes, setNotes }) {
  // 允许的最大标题字符数
  const MAX_TITLE_LENGTH = 10;

  // ------ 分页相关 ------
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(notes.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayedNotes = notes.slice(startIndex, endIndex);

  function goToPage(pageNumber) {
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
  }

  // ------ 笔记编辑浮窗相关 ------
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  function handleCreateNote() {
    // 新建模式
    setEditingNote(null);
    setShowEditor(true);
  }

  function handleShowNote(note) {
    // 编辑模式
    setEditingNote(note);
    setShowEditor(true);
  }

  // 当保存(新增或更新)成功后
  function handleSaveNote(savedNote) {
    if (!savedNote.id) return;

    if (editingNote?.id) {
      // 更新模式
      setNotes(prev =>
        prev.map(n => (n.id === savedNote.id ? savedNote : n))
      );
    } else {
      // 新建模式 => 将新笔记插到开头
      setNotes(prev => [savedNote, ...prev]);
      // 如果想立刻显示在第一页，确保我们切到第一页
      setCurrentPage(1);
    }
  }

  // 当删除成功后
  function handleDeleteNote(noteId) {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingNote(null);
  }

  return (
    <div className="notebook-wrapper">
      {/* 标题 & 创建笔记按钮 */}
      <div className="notebook-header">
        <h2 className="notebook-title">My Notebook</h2>
        <button className="create-note-btn" onClick={handleCreateNote}>
          Create New Note
        </button>
      </div>

      {/* 如果没有笔记 */}
      {notes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        <>
          {/* 笔记表格，显示当前页的数据 */}
          <table className="notes-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Title</th>
                <th style={{ width: '60%' }}>Content (Preview)</th>
                <th style={{ width: '20%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedNotes.map(note => (
                <tr key={note.id}>
                  <td>
                    {note.title.length > MAX_TITLE_LENGTH
                      ? note.title.slice(0, MAX_TITLE_LENGTH) + '...'
                      : note.title}
                  </td>
                  <td className="content-cell">
                    {note.content.slice(0, 40)}...
                  </td>
                  <td>
                    <button onClick={() => handleShowNote(note)}>
                      Show
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 分页控件 */}
          <div className="pagination-wrapper">
            {/* 上一页 */}
            <button
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Prev
            </button>

            {/* 页码按钮 */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                className={pageNum === currentPage ? 'active-page' : ''}
                onClick={() => goToPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            {/* 下一页 */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* 笔记浮窗编辑器 */}
      {showEditor && (
        <FloatingNoteEditor
          editingNote={editingNote}
          onClose={closeEditor}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
        />
      )}
    </div>
  );
}
