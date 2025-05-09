const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', (req, res) => {
  db.all('SELECT * FROM examinee', (err, rows) => {
    if (err) {
      console.error('查询选手失败:', err);
      return res.status(500).json({ error: '查询选手失败', details: err.message });
    }
    res.json(rows);
  });
});

router.get('/:id/detail', (req, res) => {
  db.get('SELECT * FROM examinee WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('查询选手详情失败:', err);
      return res.status(500).json({ error: '查询选手详情失败', details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '选手不存在' });
    }
    res.json(row);
  });
});

router.post('/', (req, res) => {
  const { name, participant_number, password, eval_object_id, exam_status } = req.body;
  db.run(
    'INSERT INTO examinee (name, participant_number, password, eval_object_id, exam_status) VALUES (?, ?, ?, ?, ?)',
    [name, participant_number, password, eval_object_id, exam_status || '未比赛'],
    function (err) {
      if (err) {
        console.error('新增选手失败:', err);
        return res.status(500).json({ error: '新增选手失败', details: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

router.put('/:id', (req, res) => {
  const { name, participant_number, password, eval_object_id, exam_status } = req.body;
  db.run(
    'UPDATE examinee SET name = ?, participant_number = ?, password = ?, eval_object_id = ?, exam_status = ? WHERE id = ?',
    [name, participant_number, password, eval_object_id, exam_status, req.params.id],
    function (err) {
      if (err) {
        console.error('更新选手失败:', err);
        return res.status(500).json({ error: '更新选手失败', details: err.message });
      }
      res.json({ success: true });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM examinee WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      console.error('删除选手失败:', err);
      return res.status(500).json({ error: '删除选手失败', details: err.message });
    }
    res.json({ success: true });
  });
});

router.post('/:id/reset-password', (req, res) => {
  db.run(
    'UPDATE examinee SET password = ? WHERE id = ?',
    ['default_password', req.params.id],
    function (err) {
      if (err) {
        console.error('重置密码失败:', err);
        return res.status(500).json({ error: '重置密码失败', details: err.message });
      }
      res.json({ success: true });
    }
  );
});

router.post('/:id/reset-exam', (req, res) => {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', err => {
      if (err) {
        console.error('Begin transaction failed:', err);
        return res.status(500).json({ error: '事务启动失败', details: err.message });
      }

      db.run(
        'UPDATE examinee SET exam_status = ? WHERE id = ?',
        ['未比赛', req.params.id],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Update exam status failed:', err);
            return res.status(500).json({ error: '更新考试状态失败', details: err.message });
          }

          db.run('DELETE FROM score WHERE contestant_id = ?', [req.params.id], err => {
            if (err) {
              db.run('ROLLBACK');
              console.error('Delete scores failed:', err);
              return res.status(500).json({ error: '删除评分记录失败', details: err.message });
            }

            db.run('DELETE FROM submission WHERE contestant_id = ?', [req.params.id], err => {
              if (err) {
                db.run('ROLLBACK');
                console.error('Delete submissions failed:', err);
                return res.status(500).json({ error: '删除提交记录失败', details: err.message });
              }

              db.run('DELETE FROM marking WHERE contestant_id = ?', [req.params.id], err => {
                if (err) {
                  db.run('ROLLBACK');
                  console.error('Delete markings failed:', err);
                  return res.status(500).json({ error: '删除标记记录失败', details: err.message });
                }

                db.run('DELETE FROM completion_status WHERE contestant_id = ?', [req.params.id], err => {
                  if (err) {
                    db.run('ROLLBACK');
                    console.error('Delete completion_status failed:', err);
                    return res.status(500).json({ error: '删除完成状态失败', details: err.message });
                  }

                  db.run('COMMIT', err => {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('Commit failed:', err);
                      return res.status(500).json({ error: '事务提交失败', details: err.message });
                    }
                    console.log('Exam reset for examinee:', { examinee_id: req.params.id });
                    res.json({ success: true, message: '考试重置成功' });
                  });
                });
              });
            });
          });
        }
      );
    });
  });
});

module.exports = router;