const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.post('/', (req, res) => {
  const { contestant_id, submission_data } = req.body;

  console.log('Received /submit:', { contestant_id, submission_data });

  if (!contestant_id || !submission_data) {
    console.error('Invalid parameters:', req.body);
    return res.status(400).json({ error: '参数不完整' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', err => {
      if (err) {
        console.error('Begin transaction failed:', err);
        return res.status(500).json({ error: '事务启动失败', details: err.message });
      }

      db.run(
        'INSERT INTO submission (contestant_id, data) VALUES (?, ?)',
        [contestant_id, JSON.stringify(submission_data)],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Insert submission failed:', err);
            return res.status(500).json({ error: '插入提交记录失败', details: err.message });
          }

          db.get(
            'SELECT id FROM completion_status WHERE contestant_id = ?',
            [contestant_id],
            (err, row) => {
              if (err) {
                db.run('ROLLBACK');
                console.error('Query completion_status failed:', err);
                return res.status(500).json({ error: '查询完成状态失败', details: err.message });
              }

              if (row) {
                db.run(
                  'UPDATE completion_status SET has_submitted = 1 WHERE contestant_id = ?',
                  [contestant_id],
                  function (err) {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('Update completion_status failed:', err);
                      return res.status(500).json({ error: '更新完成状态失败', details: err.message });
                    }
                    console.log('Updated completion_status:', { contestant_id, has_submitted: 1 });
                    checkCompletion();
                  }
                );
              } else {
                db.run(
                  'INSERT INTO completion_status (contestant_id, has_submitted, judge_submission_count) VALUES (?, 1, 0)',
                  [contestant_id],
                  function (err) {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('Insert completion_status failed:', err);
                      return res.status(500).json({ error: '插入完成状态失败', details: err.message });
                    }
                    console.log('Inserted completion_status:', { contestant_id, has_submitted: 1 });
                    checkCompletion();
                  }
                );
              }
            }
          );
        }
      );

      function checkCompletion() {
        db.get(
          'SELECT has_submitted, judge_submission_count FROM completion_status WHERE contestant_id = ?',
          [contestant_id],
          (err, status) => {
            if (err) {
              db.run('ROLLBACK');
              console.error('Query completion_status failed:', err);
              return res.status(500).json({ error: '查询完成状态失败', details: err.message });
            }
            if (!status || status.has_submitted !== 1) {
              completeTransaction();
              return;
            }

            db.get(
              'SELECT COUNT(*) as active_judge_count FROM judge WHERE is_active = 1',
              (err, judgeRow) => {
                if (err) {
                  db.run('ROLLBACK');
                  console.error('Count active judges failed:', err);
                  return res.status(500).json({ error: '查询启用考官数量失败', details: err.message });
                }

                console.log('Completion check:', {
                  contestant_id,
                  has_submitted: status.has_submitted,
                  judge_submission_count: status.judge_submission_count,
                  active_judge_count: judgeRow.active_judge_count,
                });

                if (status.judge_submission_count >= judgeRow.active_judge_count) {
                  db.run(
                    'UPDATE examinee SET exam_status = ? WHERE id = ?',
                    ['比赛完成', contestant_id],
                    function (err) {
                      if (err) {
                        db.run('ROLLBACK');
                        console.error('Update examinee status failed:', err);
                        return res.status(500).json({ error: '更新考生状态失败', details: err.message });
                      }
                      completeTransaction();
                    }
                  );
                } else {
                  completeTransaction();
                }
              }
            );
          }
        );
      }

      function completeTransaction() {
        db.run('COMMIT', err => {
          if (err) {
            db.run('ROLLBACK');
            console.error('Commit failed:', err);
            return res.status(500).json({ error: '事务提交失败', details: err.message });
          }
          console.log('Submission saved:', { contestant_id });
          res.json({
            success: true,
            message: '提交成功',
          });
        });
      }
    });
  });
});

module.exports = router;