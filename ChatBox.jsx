// src/pages/ChatBox.jsx
import React, { useEffect, useState, useRef } from 'react';
import './ChatBox.css';

export default function ChatBox({ isExpanded = false }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

  // ============ 1. 获取历史记录 ============
  useEffect(() => {
    const token = localStorage.getItem('token'); // 如果要JWT，否则可去掉
    fetch('http://localhost:3000/api/chat/history', {
      headers: {
        'Authorization': 'Bearer ' + token // 若不需要 Token，可注释或删除
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server Error: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setMessages(data);
        scrollToBottom();
      })
      .catch(err => {
        console.error('Error fetching chat history:', err);
      });
  }, []);

  // 滚动到底部
  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ============ 2. 提交新消息 ============
  async function handleSend(e) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 先在前端显示用户的这条消息
    const userMsg = {
      role: 'user',
      content: trimmed,
      _id: 'temp-' + Date.now() // 给个临时ID，用于渲染
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    scrollToBottom();

    try {
      const token = localStorage.getItem('token'); // 如需JWT
      // 发送到服务器
      const resp = await fetch('http://localhost:3000/api/chat/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token // 如无需JWT可删
        },
        body: JSON.stringify({ message: trimmed })
      });
      if (!resp.ok) {
        throw new Error(`Server Error ${resp.status}`);
      }
      const data = await resp.json(); // 后端返回 { reply: '...' }

      // 显示AI回复
      const aiMsg = {
        role: 'assistant',
        content: data.reply,
        _id: 'temp-' + (Date.now() + 1)
      };
      setMessages(prev => [...prev, aiMsg]);
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      // 可以在UI上提示“发送失败”之类
    }
  }

  // ============ 3. 滚动到最新消息 ============
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={`chatBox-container ${isExpanded ? 'expanded' : ''}`}>
      {/* 消息列表 */}
      <div className="chatBox-messages">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={
              msg.role === 'user'
                ? 'chatBox-message user'
                : 'chatBox-message assistant'
            }
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <form className="chatBox-inputArea" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
