import React from 'react';
import './SolutionModal.css';

function SolutionModal({ onConfirm, onCancel }) {
  return (
    <div className="solution-modal-overlay" onClick={onCancel}>
      <div className="solution-modal-content" onClick={e => e.stopPropagation()}>
        

        {/* Header: 图标 + 标题 */}
        <div className="solution-modal-header">
          <div className="solution-modal-icon-wrapper">
            <div className="solution-modal-icon">i</div>
          </div>
          <h2 className="solution-modal-title">Are you sure you want to view the solution now?</h2>
        </div>

        <p className="solution-modal-subtitle">
          *This action will <strong>NOT SUBMIT</strong> your test and your answers will be <strong>LOST</strong>.
        </p>

    {/* 按钮: YES / NO */}
    <div className="solution-modal-actions">
          <button 
            className="solution-modal-btn solution-modal-btn--cancel"
            onClick={onConfirm}
          >
            YES
          </button>
          <button
            className="solution-modal-btn solution-modal-btn--confirm"
            onClick={onCancel}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}

export default SolutionModal;
