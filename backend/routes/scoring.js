const express = require('express');
const router = express.Router();
const db = require('../models/database');
const path = require('path');
const fs = require('fs');

router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ limit: '10mb', extended: true }));

router.get('/score-items', (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../../frontend/public/data/score-items.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('加载评分项失败:', error);
    res.status(500).json({ error: '加载评分项失败', details: error.message });
  }
});

router.get('/examinee/:id/scores', (req, res) => {
  db.all(
    `SELECT s.id, s.item, s.deduction, s.total_score, s.timestamp,
            e.name AS contestant_name, e.participant_number,
            j.name AS judge_name
     FROM score s
     LEFT JOIN examinee e ON s.contestant_id = e.id
     LEFT JOIN judge j ON s.judge_id = j.id
     WHERE s.contestant_id = ?
     ORDER BY s.timestamp DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error('查询评分记录失败:', err);
        return res.status(500).json({ error: '查询评分记录失败', details: err.message });
      }
      res.json(rows);
    }
  );
});

router.get('/examinee/:id/scores/summary', (req, res) => {
  const examineeId = req.params.id;
  console.log('Received /examinee/:id/scores/summary:', { examineeId });
  db.get(
    `SELECT e.participant_number, e.name, e.eval_object_id
     FROM examinee e
     WHERE e.id = ?`,
    [examineeId],
    (err, examinee) => {
      if (err) {
        console.error('查询选手信息失败:', err);
        return res.status(500).json({ error: '查询选手信息失败', details: err.message });
      }
      if (!examinee) {
        console.error('选手不存在:', { examineeId });
        return res.status(404).json({ error: '选手不存在' });
      }
      db.all(
        `SELECT j.name AS judge_name, s.total_score
         FROM score s
         LEFT JOIN judge j ON s.judge_id = j.id
         WHERE s.contestant_id = ?`,
        [examineeId],
        (err, scores) => {
          if (err) {
            console.error('查询评分汇总失败:', err);
            return res.status(500).json({ error: '查询评分汇总失败', details: err.message });
          }
          const totalScore = scores.reduce((sum, score) => sum + (score.total_score || 0), 0) / (scores.length || 1);
          console.log('Scores summary:', {
            examineeId,
            participant_number: examinee.participant_number,
            name: examinee.name,
            total_score: totalScore,
            judges: scores,
          });
          res.json({
            success: true,
            data: {
              participant_number: examinee.participant_number,
              name: examinee.name,
              eval_object_id: examinee.eval_object_id,
              total_score: totalScore.toFixed(2),
              judges: scores.map(score => ({
                judge_name: score.judge_name,
                total_score: score.total_score,
              })),
            },
          });
        }
      );
    }
  );
});

router.post('/submit-scores', (req, res) => {
  const { examinee_id, judge_id, scores, total_score } = req.body;

  console.log('Received /submit-scores:', { examinee_id, judge_id, scores, total_score });

  if (!examinee_id || !judge_id || !scores || !Array.isArray(scores) || scores.length === 0) {
    console.error('Invalid parameters:', req.body);
    return res.status(400).json({ error: '参数不完整或评分项为空' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', err => {
      if (err) {
        console.error('Begin transaction failed:', err);
        return res.status(500).json({ error: '事务启动失败', details: err.message });
      }

      db.run(
        'DELETE FROM score WHERE contestant_id = ? AND judge_id = ?',
        [examinee_id, judge_id],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Delete old scores failed:', err);
            return res.status(500).json({ error: '删除旧评分失败', details: err.message });
          }

          const stmt = db.prepare(
            'INSERT INTO score (judge_id, contestant_id, item, deduction, total_score) VALUES (?, ?, ?, ?, ?)'
          );

          try {
            scores.forEach(item => {
              if (!item.item_id || item.deduction === undefined) {
                throw new Error('评分项数据不完整');
              }
              stmt.run(judge_id, examinee_id, item.item_id, item.deduction, total_score);
            });

            stmt.finalize(err => {
              if (err) {
                db.run('ROLLBACK');
                console.error('Insert scores failed:', err);
                return res.status(500).json({ error: '保存评分失败', details: err.message });
              }

              db.get(
                'SELECT is_active FROM judge WHERE id = ?',
                [judge_id],
                (err, judge) => {
                  if (err) {
                    db.run('ROLLBACK');
                    console.error('Check judge status failed:', err);
                    return res.status(500).json({ error: '查询考官状态失败', details: err.message });
                  }
                  if (!judge || judge.is_active !== 1) {
                    console.log('Judge is not active, skipping completion status update:', { judge_id });
                    completeTransaction();
                    return;
                  }

                  db.get(
                    'SELECT judge_submission_count FROM completion_status WHERE contestant_id = ?',
                    [examinee_id],
                    (err, row) => {
                      if (err) {
                        db.run('ROLLBACK');
                        console.error('Query completion_status failed:', err);
                        return res.status(500).json({ error: '查询完成状态失败', details: err.message });
                      }

                      const currentCount = row ? row.judge_submission_count : 0;
                      const newCount = currentCount + 1;

                      if (row) {
                        db.run(
                          'UPDATE completion_status SET judge_submission_count = ? WHERE contestant_id = ?',
                          [newCount, examinee_id],
                          function (err) {
                            if (err) {
                              db.run('ROLLBACK');
                              console.error('Update completion_status failed:', err);
                              return res.status(500).json({ error: '更新完成状态失败', details: err.message });
                            }
                            console.log('Updated completion_status:', { examinee_id, judge_submission_count: newCount });
                            checkCompletion();
                          }
                        );
                      } else {
                        db.run(
                          'INSERT INTO completion_status (contestant_id, has_submitted, judge_submission_count) VALUES (?, 0, ?)',
                          [examinee_id, newCount],
                          function (err) {
                            if (err) {
                              db.run('ROLLBACK');
                              console.error('Insert completion_status failed:', err);
                              return res.status(500).json({ error: '插入完成状态失败', details: err.message });
                            }
                            console.log('Inserted completion_status:', { examinee_id, judge_submission_count: newCount });
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
                  [examinee_id],
                  (err, status) => {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('Query completion_status for completion check failed:', err);
                      return res.status(500).json({ error: '查询完成状态失败', details: err.message });
                    }
                    if (!status || status.has_submitted !== 1) {
                      console.log('Contestant has not submitted or no status, skipping exam status update:', { examinee_id });
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
                          examinee_id,
                          has_submitted: status.has_submitted,
                          judge_submission_count: status.judge_submission_count,
                          active_judge_count: judgeRow.active_judge_count,
                        });

                        if (status.judge_submission_count >= judgeRow.active_judge_count) {
                          db.run(
                            'UPDATE examinee SET exam_status = ? WHERE id = ?',
                            ['比赛完成', examinee_id],
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
                  console.log('Scores saved:', { examinee_id, judge_id, scored_items: scores.length, total_score });
                  res.json({
                    success: true,
                    message: '评分提交成功',
                    data: { examinee_id, total_score, scored_items: scores.length },
                  });
                });
              }
            });
          } catch (err) {
            stmt.finalize();
            db.run('ROLLBACK');
            console.error('Insert scores error:', err);
            res.status(500).json({ error: '保存评分失败', details: err.message });
          }
        }
      );
    });
  });
});

router.post('/save-markings', (req, res) => {
  const { examinee_id, judge_id, paths } = req.body;

  console.log('Received /save-markings:', { examinee_id, judge_id, paths });

  if (!examinee_id || !judge_id || !paths || !Array.isArray(paths) || paths.length === 0) {
    console.error('Invalid parameters:', req.body);
    return res.status(400).json({ error: '参数不完整或无有效路径' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', err => {
      if (err) {
        console.error('Begin transaction failed:', err);
        return res.status(500).json({ error: '事务启动失败', details: err.message });
      }

      db.run(
        'DELETE FROM marking WHERE contestant_id = ? AND judge_id = ?',
        [examinee_id, judge_id],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Delete old markings failed:', err);
            return res.status(500).json({ error: '删除旧标记失败', details: err.message });
          }

          db.run(
            'INSERT INTO marking (judge_id, contestant_id, item, marked_text, position) VALUES (?, ?, ?, ?, ?)',
            [judge_id, examinee_id, 'canvas_paths', 'marking_paths', JSON.stringify(paths)],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                console.error('Insert marking failed:', err);
                return res.status(500).json({ error: '插入标记失败', details: err.message });
              }

              db.run('COMMIT', err => {
                if (err) {
                  db.run('ROLLBACK');
                  console.error('Commit failed:', err);
                  return res.status(500).json({ error: '事务提交失败', details: err.message });
                }
                console.log('Marking saved:', { examinee_id, judge_id, path_count: paths.length });
                res.json({
                  success: true,
                  id: this.lastID,
                  message: '标记保存成功',
                });
              });
            }
          );
        }
      );
    });
  });
});

router.get('/markings', (req, res) => {
  const { examinee_id, judge_id } = req.query;

  console.log('Received /markings:', { examinee_id, judge_id });

  if (!examinee_id || !judge_id) {
    console.error('Invalid parameters:', { examinee_id, judge_id });
    return res.status(400).json({ error: '参数不完整' });
  }

  db.all(
    'SELECT * FROM marking WHERE contestant_id = ? AND judge_id = ?',
    [examinee_id, judge_id],
    (err, rows) => {
      if (err) {
        console.error('查询标记失败:', err);
        return res.status(500).json({ error: '查询标记失败', details: err.message });
      }
      const markings = rows.map(row => ({
        id: row.id,
        examinee_id: row.contestant_id,
        judge_id: row.judge_id,
        paths: JSON.parse(row.position),
      }));
      console.log('Markings retrieved:', { examinee_id, judge_id, count: rows.length });
      res.json({ success: true, data: markings });
    }
  );
});

module.exports = router;