const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

router.post('/save', async (req, res) => {
  const { section, contestant_id, data } = req.body;
  if (!section || !contestant_id || !data) {
    return res.status(400).json({ message: '缺少必填字段' });
  }

  try {
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT eval_object_id FROM examinee WHERE id = ?', [contestant_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!row) {
      return res.status(404).json({ message: '参赛者不存在' });
    }

    const eval_object_id = row.eval_object_id;
    if (!eval_object_id) {
      return res.status(400).json({ message: '参赛者未绑定评估对象' });
    }

    const checkStmt = db.prepare('SELECT id FROM submission WHERE contestant_id = ? AND eval_object_id = ? AND item = ?');
    const updateStmt = db.prepare('UPDATE submission SET answer = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?');
    const insertStmt = db.prepare('INSERT INTO submission (contestant_id, eval_object_id, item, answer) VALUES (?, ?, ?, ?)');
    let errorOccurred = false;

    for (const [item, answer] of Object.entries(data)) {
      if (answer === undefined || answer === null) continue;
      const answerStr = typeof answer === 'string' ? answer : JSON.stringify(answer);

      const existing = await new Promise((resolve, reject) => {
        checkStmt.get(contestant_id, eval_object_id, item, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existing) {
        await new Promise((resolve, reject) => {
          updateStmt.run(answerStr, existing.id, (err) => {
            if (err) {
              console.error('更新 submission 失败:', err.message);
              errorOccurred = true;
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } else {
        await new Promise((resolve, reject) => {
          insertStmt.run(contestant_id, eval_object_id, item, answerStr, (err) => {
            if (err) {
              console.error('插入 submission 失败:', err.message);
              errorOccurred = true;
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }

    checkStmt.finalize();
    updateStmt.finalize();
    insertStmt.finalize((err) => {
      if (err) {
        console.error('Finalize statement failed:', err.message);
        errorOccurred = true;
      }
      if (errorOccurred) {
        return res.status(500).json({ message: '部分数据保存失败' });
      }
      res.json({ message: '保存成功' });
    });
  } catch (error) {
    console.error('保存数据时发生错误:', error.message);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/get-submission', async (req, res) => {
  const { contestant_id, section } = req.query;
  if (!contestant_id || !section) {
    return res.status(400).json({ message: '缺少必填参数' });
  }

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        'SELECT item, answer FROM submission WHERE contestant_id = ? AND item LIKE ?',
        [contestant_id, `${section.toUpperCase().replace('A', 'A.')}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const data = {};
    rows.forEach(row => {
      try {
        data[row.item] = JSON.parse(row.answer);
      } catch (e) {
        data[row.item] = row.answer;
      }
    });

    res.json({ data });
  } catch (error) {
    console.error('获取 submission 数据失败:', error.message);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.post('/submit', async (req, res) => {
  const { contestant_id, section, submission_data } = req.body;
  console.log('Received /api/submit:', { contestant_id, section });

  if (!contestant_id || !section || !submission_data) {
    console.error('Invalid parameters:', req.body);
    return res.status(400).json({ message: '参数不完整' });
  }

  try {
    const row = await new Promise((resolve, reject) => {
      db.get(
        'SELECT has_submitted FROM completion_status WHERE contestant_id = ?',
        [contestant_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (row && row.has_submitted === 1) {
      console.log('Contestant already submitted:', { contestant_id });
      return res.status(403).json({ message: '您已提交，无法再次提交' });
    }

    const evalRow = await new Promise((resolve, reject) => {
      db.get(
        'SELECT eval_object_id FROM examinee WHERE id = ?',
        [contestant_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!evalRow) {
      return res.status(404).json({ message: '参赛者不存在' });
    }

    const eval_object_id = evalRow.eval_object_id;
    if (!eval_object_id) {
      return res.status(400).json({ message: '参赛者未绑定评估对象' });
    }

    const checkStmt = db.prepare('SELECT id FROM submission WHERE contestant_id = ? AND eval_object_id = ? AND item = ?');
    const updateStmt = db.prepare('UPDATE submission SET answer = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?');
    const insertStmt = db.prepare('INSERT INTO submission (contestant_id, eval_object_id, item, answer) VALUES (?, ?, ?, ?)');
    let errorOccurred = false;

    for (const [item, answer] of Object.entries(submission_data)) {
      if (answer === undefined || answer === null) continue;
      const answerStr = typeof answer === 'string' ? answer : JSON.stringify(answer);

      const existing = await new Promise((resolve, reject) => {
        checkStmt.get(contestant_id, eval_object_id, item, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existing) {
        await new Promise((resolve, reject) => {
          updateStmt.run(answerStr, existing.id, (err) => {
            if (err) {
              console.error('更新 submission 失败:', err.message);
              errorOccurred = true;
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } else {
        await new Promise((resolve, reject) => {
          insertStmt.run(contestant_id, eval_object_id, item, answerStr, (err) => {
            if (err) {
              console.error('插入 submission 失败:', err.message);
              errorOccurred = true;
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }

    checkStmt.finalize();
    updateStmt.finalize();
    insertStmt.finalize();

    if (errorOccurred) {
      throw new Error('部分数据保存失败');
    }

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO completion_status (contestant_id, has_submitted, judge_submission_count) VALUES (?, ?, ?)',
        [contestant_id, 1, 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE examinee SET exam_status = ? WHERE id = ?',
        ['已提交', contestant_id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('Submission completed:', { contestant_id, section });
    res.json({ message: '提交成功' });
  } catch (error) {
    console.error('提交失败:', error.message);
    res.status(500).json({ message: '提交失败', error: error.message });
  }
});

router.get('/completion_status/:contestant_id', async (req, res) => {
  const { contestant_id } = req.params;
  console.log('Received /api/completion_status:', { contestant_id });

  try {
    const row = await new Promise((resolve, reject) => {
      db.get(
        'SELECT has_submitted FROM completion_status WHERE contestant_id = ?',
        [contestant_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({ has_submitted: row ? row.has_submitted : 0 });
  } catch (error) {
    console.error('查询提交状态失败:', error.message);
    res.status(500).json({ message: '查询提交状态失败', error: error.message });
  }
});

router.post('/start-exam', async (req, res) => {
  const { contestant_id } = req.body;
  if (!contestant_id) {
    return res.status(400).json({ message: '缺少参赛者 ID' });
  }

  try {
    const stmt = db.prepare('UPDATE examinee SET exam_status = ? WHERE id = ?');
    await new Promise((resolve, reject) => {
      stmt.run('比赛中', contestant_id, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    stmt.finalize();
    res.json({ message: '考试开始，状态已更新' });
  } catch (error) {
    console.error('更新考试状态失败:', error.message);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;