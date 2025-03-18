// src/pages/EditProfileModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import './EditProfileModal.css';

export default function EditProfileModal({ user, onClose, onUpdateUser }) {
  // 确保组件加载时填充数据
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null); // 让 file input 可重置
  const token = localStorage.getItem('token');

  // 密码相关
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSignature(user.signature || '');
    }
  }, [user]);

  // 处理头像文件选择
  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
    }
  }

  // ============= A) 更新基本资料 =============
  async function handleSaveProfile() {
    if (!name.trim()) {
      alert('Nickname cannot be empty.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('signature', signature);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await fetch('http://localhost:3000/api/users/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      const { user: updatedUser } = await res.json();
      onUpdateUser(updatedUser);
      alert('Profile updated successfully.');

      // 重置文件输入框
      if (fileInputRef.current) fileInputRef.current.value = '';

      setAvatarFile(null);
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    }
  }

  // ============= B) 修改密码 =============
  async function handleChangePassword() {
    if (!oldPassword || !newPassword) {
      alert('Please fill old and new passwords');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      alert('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    }
  }

  return (
    <div className="editProfileModal modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h2>Edit Profile</h2>

        <div className="form-group">
          <label>Nickname:</label>
          <input type="text" placeholder="Enter your nickname" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Signature:</label>
          <textarea placeholder="Enter your signature" value={signature} onChange={e => setSignature(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Avatar:</label>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} />
        </div>

        <button onClick={handleSaveProfile}>Save Profile</button>

        <hr />

        <h3>Change Password</h3>
        <div className="form-group">
          <label>Old Password:</label>
          <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label>New Password:</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Confirm New Password:</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>
        <button onClick={handleChangePassword}>Change Password</button>

        <div style={{ marginTop: '1rem' }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
