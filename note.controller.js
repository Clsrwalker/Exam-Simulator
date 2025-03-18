// src/controllers/note.controller.js
const Note = require('../models/note.model');

// (1) 创建新笔记
exports.createNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title && !content) {
      return res.status(400).json({ error: 'Title or content is required' });
    }

    const note = new Note({
      user: req.userId,
      title,
      content
    });

    const saved = await note.save();
    // 统一把 _id → id
    const noteObj = saved.toObject();
    noteObj.id = noteObj._id;
    delete noteObj._id;
    delete noteObj.__v;

    res.status(201).json(noteObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// (2) 获取当前用户的所有笔记
exports.getMyNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.userId }).sort({ createdAt: -1 });
    // 把数组里的每条笔记都 _id→id
    const mapped = notes.map(doc => {
      const obj = doc.toObject();
      obj.id = obj._id;
      delete obj._id;
      delete obj.__v;
      return obj;
    });
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// (3) 获取单个笔记(详情)
exports.getNoteById = async (req, res) => {
  try {
    const noteId = req.params.id;
    const note = await Note.findOne({ _id: noteId, user: req.userId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const noteObj = note.toObject();
    noteObj.id = noteObj._id;
    delete noteObj._id;
    delete noteObj.__v;

    res.json(noteObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// (4) 更新笔记
exports.updateNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const noteId = req.params.id;

    const updated = await Note.findOneAndUpdate(
      { _id: noteId, user: req.userId },
      { title, content },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Note not found or not yours' });
    }

    const noteObj = updated.toObject();
    noteObj.id = noteObj._id;
    delete noteObj._id;
    delete noteObj.__v;

    res.json(noteObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// (5) 删除笔记
exports.deleteNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    console.log('Deleting note:', noteId, 'for user:', req.userId);
    const note = await Note.findOneAndDelete({ _id: noteId, user: req.userId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found or not yours' });
    }

    // 删除成功，你可以只返回消息或把被删的笔记也返回
    // 这里只返回消息
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
