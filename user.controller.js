// src/controllers/user.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/user.model');

// 登录
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // 这里改成 { email }，别再用 { username }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 生成 JWT
    const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, { expiresIn: '2h' });
    res.status(200).json({
      message: 'Login successful',
      token,
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.register = async (req, res) => {
  try {
    // 从前端 body 中同时解构 name, email, password
    const { name, email, password } = req.body;

    // 校验
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    // name 可选：若想强制必填，也可 if (!name) return res.status(400)...

    // 检查是否已有相同 email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = new User({
      name,              // 把前端传来的 name 存进数据库
      email,
      password
    });
    await newUser.save();

    // 生成 JWT（若你也想注册后直接登录）
    const token = jwt.sign({ userId: newUser._id }, config.JWT_SECRET, { expiresIn: '2h' });

    // 返回 message + token，或随你自定义
    res.status(201).json({
      message: 'User registered successfully',
      token,  
      userId: newUser._id
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// user.controller.js
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user); // => { "_id":..., "email":"xx", "name":"xx" }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// src/controllers/user.controller.js

exports.setExamDate = async (req, res) => {
  try {
    // 从请求 body 中取出 examDate (字符串)，示例: "2025-04-01T00:00:00.000Z"
    const { examDate } = req.body;

    // 根据 token 解析到的 userId 查询用户
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 如果 examDate 为空，就清空；如果有，就转成 Date 对象
    user.examDate = examDate ? new Date(examDate) : null;
    await user.save();

    return res.json({
      message: 'Exam date updated successfully',
      examDate: user.examDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, signature } = req.body;
    if (name !== undefined) {
      user.name = name;
    }
    if (signature !== undefined) {
      user.signature = signature;
    }

    // 关键：如果前端上传了头像文件
    if (req.file) {
      // 处理可能出现的 Windows 反斜杠
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      // 让 avatarUrl 指向 /uploads/xxx.jpg
      // 前提：你在 app.js/ server.js 里配置过 app.use('/uploads', express.static(...))
      user.avatarUrl = '/' + normalizedPath;  
    }

    await user.save();

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing old or new password' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    // 重新哈希新密码并保存
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};