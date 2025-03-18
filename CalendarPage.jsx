// src/components/CalendarPage.jsx
import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';

// 自定义样式文件(不要再 import 'react-calendar/dist/Calendar.css')
import './Calendar.css';

export default function CalendarPage() {
  // (1) 当用户在日历上点击某天，react-calendar 会在 selectedDate 中反映
  const [selectedDate, setSelectedDate] = useState(new Date());

  // (2) examDate 用于记录“当前用户在数据库中保存的考试日期”
  const [examDate, setExamDate] = useState(null);

  // (3) 弹窗控制：showPopup=true 显示；pendingDate 暂存将要设置/取消的日期
  const [showPopup, setShowPopup] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  // ========== A) 组件挂载时，向后端获取用户信息，初始化 examDate ========== 
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, user not logged in.');
      return;
    }

    fetch('http://localhost:3000/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch user info');
        }
        return res.json();
      })
      .then(userData => {
        // 如果后端返回 userData.examDate，就转成Date对象
        if (userData.examDate) {
          setExamDate(new Date(userData.examDate));
        }
      })
      .catch(err => {
        console.error('Error fetching user data:', err);
      });
  }, []);

  // ========== B) 点击某天 => 打开弹窗 ========== 
  const handleClickDay = (value) => {
    // 如果想阻止过去日期
    const now = new Date();
    const todayWithoutTime = now.setHours(0, 0, 0, 0);
    if (value < todayWithoutTime) {
      alert('不能选择过去的日期');
      return;
    }

    setPendingDate(value);
    setShowPopup(true);
  };

  // ========== C) React-Calendar 自带的 onChange，仅用于更新选中状态 ========== 
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // ========== D) 确认按钮 => 调用后端接口、更新 examDate ==========
  const handleConfirmDate = async () => {
    // 如果再点同一天 => 视为“取消考试日”
    if (examDate && isSameDay(examDate, pendingDate)) {
      await updateExamDateOnServer(null);
      setExamDate(null);
    } else {
      // 否则设置新的考试日
      await updateExamDateOnServer(pendingDate);
      setExamDate(pendingDate);
    }
    setShowPopup(false);
    setPendingDate(null);
  };

  // ========== E) 关闭弹窗 ========== 
  const handleClosePopup = () => {
    setShowPopup(false);
    setPendingDate(null);
  };

  // ========== F) 调后端接口 /api/users/exam-date ========== 
  async function updateExamDateOnServer(dateValue) {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Not logged in!');
      return;
    }

    const bodyData = {
      examDate: dateValue ? dateValue.toISOString() : null
    };

    try {
      const response = await fetch('http://localhost:3000/api/users/exam-date', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });
      if (!response.ok) {
        throw new Error('Failed to save exam date');
      }
      const result = await response.json();
      console.log('Exam date updated on server:', result.examDate);
    } catch (err) {
      console.error(err);
      alert('Error saving exam date: ' + err.message);
    }
  }

  // ========== G) 给 examDate 做高亮 className ========== 
  const tileClassName = ({ date, view }) => {
    // 只在月视图判断
    if (view === 'month') {
      if (examDate && isSameDay(date, examDate)) {
        return 'examDay'; // 在 CSS 中定义 examDay
      }
    }
    return null;
  };

  // ========== H) 工具函数：判断是否同一天 ========== 
  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  return (
    <div className="calendarContainer">
 

      {/* 1) onChange 只影响 selectedDate; 2) onClickDay 触发弹窗; 3) tileClassName 用于高亮 */}
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        onClickDay={handleClickDay}
        tileClassName={tileClassName}
      />

      <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        Exam Date: {examDate ? examDate.toDateString() : 'None'}
      </p>

      {/* 弹窗覆盖层 */}
      {showPopup && (
        <div className="popupOverlay" onClick={handleClosePopup}>
          {/* 弹窗内容 */}
          <div className="popupBox" onClick={(e) => e.stopPropagation()}>
            <h4>Set this day as exam date?</h4>
            <p>{pendingDate?.toDateString()}</p>
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleConfirmDate}>
                {examDate && pendingDate && isSameDay(examDate, pendingDate)
                  ? 'Cancel This Exam Date'
                  : 'Confirm Exam Date'
                }
              </button>
              <button onClick={handleClosePopup} style={{ marginLeft: '1rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
