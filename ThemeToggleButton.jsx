// ThemeToggleButton.jsx
import React from 'react';
import './ThemeToggleButton.css'; // 下面会贴CSS

export default function ThemeToggleButton({ theme, onToggle }) {
  // 当theme==='dark'时，让按钮显示“活跃”状态（滑块在右侧、月亮图标显示）
  const isDark = theme === 'dark';

  return (
    <button
      className={`c-theme ${isDark ? 'c-theme--active' : ''}`}
      onClick={onToggle}
    >
      {/* 灰色轨道 */}
      <span className="c-theme__track"></span>

      {/* 滑块 */}
      <span className="c-theme__knob">
        {/* 太阳图标 (Light icon) */}
        <span className="c-theme__icon-wrapper c-theme__icon-wrapper--light">
          <svg
            className="c-theme__icon"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.828 5.243L2.343 3.757a1 1 0 0 1 1.414-1.414l1.486 1.485a5.027 5.027 0 0 0-1.415 1.415zM7 3.1V1a1 1 0 1 1 2 0v2.1a5.023 5.023 0 0 0-2 0zm3.757.728l1.486-1.485a1 1 0 1 1 1.414 1.414l-1.485 1.486a5.027 5.027 0 0 0-1.415-1.415zM12.9 7H15a1 1 0 0 1 0 2h-2.1a5.023 5.023 0 0 0 0-2zm-.728 3.757l1.485 1.486a1 1 0 1 1-1.414 1.414l-1.486-1.485a5.027 5.027 0 0 0 1.415-1.415zM9 12.9V15a1 1 0 0 1-2 0v-2.1a5.023 5.023 0 0 0 2 0zm-3.757-.728l-1.486 1.485a1 1 0 0 1-1.414-1.414l1.485-1.486a5.027 5.027 0 0 0 1.415 1.415zM3.1 9H1a1 1 0 1 1 0-2h2.1a5.023 5.023 0 0 0 0 2zM8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
              fillRule="evenodd"
            />
          </svg>
        </span>

        {/* 月亮图标 (Dark icon) */}
        <span className="c-theme__icon-wrapper c-theme__icon-wrapper--dark">
          <svg
            className="c-theme__icon"
            viewBox="0 0 17 16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.914 0a6.874 6.874 0 0 0-1.26 3.972c0 3.875 3.213 7.017 7.178 7.017.943 0 1.843-.178 2.668-.5C15.423 13.688 12.34 16 8.704 16 4.174 16 .5 12.41.5 7.982.5 3.814 3.754.389 7.914 0z"
              fillRule="evenodd"
            />
          </svg>
        </span>
      </span>
    </button>
  );
}
