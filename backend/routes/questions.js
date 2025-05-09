const express = require('express');
const router = express.Router();
const db = require('../models/database');

// 提交答案
router.post('/submit', (req, res) => {
  const { examinee_id, answers } = req.body;
  if (!examinee_id || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ message: '缺少必填字段' });
  }

  const stmt = db.prepare('INSERT INTO answers (examinee_id, question_id, score) VALUES (?, ?, ?)');
  answers.forEach((answer) => {
    stmt.run(examinee_id, answer.question_id, answer.score);
  });
  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ message: '答案提交成功' });
  });
});

module.exports = router;