// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const config = require('../config');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => { 
  const { username, password } = req.body; 
  
  try {
    // 管理员验证 
    if (username.startsWith('admin')) {
      if (username === config.admin.username && password === config.admin.password) {
        return res.json({ success: true, username, role: 'admin' });
      }
    }
    
    // 考官验证 
    if (username.startsWith('P')) {
      const judge = await new Promise((resolve) => {
        db.get('SELECT * FROM judge WHERE account = ?', 
          [username], (err, row) => resolve(row));
      });
      if (judge && await bcrypt.compare(password, judge.password)) {
        return res.json({ success: true, username, role: 'judge', id: judge.id });
      }
    }
 
    // 选手验证 
    if (/^\d+$/.test(username)) {
      const examinee = await new Promise((resolve) => {
        db.get('SELECT * FROM examinee WHERE participant_number = ?', 
          [username], (err, row) => resolve(row));
      });
      if (examinee && await bcrypt.compare(password, examinee.password)) {
        return res.json({ 
          success: true, 
          username: examinee.name, 
          role: 'contestant', 
          id: examinee.id 
        });
      }
    }
 
    res.json({ success: false, message: '账号或密码错误' });
  } catch (error) {
    res.status(500).json({ success: false, message: '系统错误' });
  }
});

// 获取当前用户信息
router.get('/current-user', (req, res) => {
  // 假设登录信息存储在 session 或通过前端传递
  // 这里简化处理，实际应通过 token 或 session 验证
  const username = req.headers['x-username'];
  if (!username) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  if (username.startsWith('admin')) {
    return res.json({ success: true, username, role: 'admin' });
  } else if (username.startsWith('P')) {
    db.get('SELECT * FROM judge WHERE account = ?', [username], (err, row) => {
      if (err || !row) {
        return res.status(500).json({ success: false, message: '用户不存在' });
      }
      res.json({ success: true, username: row.name, role: 'judge', id: row.id });
    });
  } else if (/^\d+$/.test(username)) {
    db.get('SELECT * FROM examinee WHERE participant_number = ?', [username], (err, row) => {
      if (err || !row) {
        return res.status(500).json({ success: false, message: '用户不存在' });
      }
      res.json({ success: true, username: row.name, role: 'contestant', id: row.id });
    });
  } else {
    res.status(401).json({ success: false, message: '用户类型错误' });
  }
});

module.exports = router;