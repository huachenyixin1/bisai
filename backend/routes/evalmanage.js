const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const iconv = require('iconv-lite');
const createLogger = require('../logger'); // 引入日志工具

const logger = createLogger('evalmanage'); // 创建 evalmanage 模块的日志实例

// 获取所有评估对象
router.get('/', (req, res) => {
  db.all('SELECT * FROM eval_object', [], (err, rows) => {
    if (err) {
      logger.error('Database error in GET /api/evalmanage:', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json(rows);
  });
});

// 新增评估对象
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: '缺少必填字段' });
  }
  db.run('INSERT INTO eval_object (name) VALUES (?)', [name], function (err) {
    if (err) {
      logger.error('Database error in POST /api/evalmanage:', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ message: '新增成功', id: this.lastID });
  });
});

// 修改评估对象
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: '缺少必填字段' });
  }
  db.run('UPDATE eval_object SET name = ? WHERE id = ?', [name, id], function (err) {
    if (err) {
      logger.error('Database error in PUT /api/evalmanage/:id:', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ message: '修改成功' });
  });
});

// 删除评估对象
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM eval_object WHERE id = ?', [id], function (err) {
    if (err) {
      logger.error('Database error in DELETE /api/evalmanage/:id:', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ message: '删除成功' });
  });
});

// 获取答案库数据
router.get('/:id/answer-files', (req, res) => {
  const { id } = req.params;
  db.all('SELECT id, eval_object_id, question_id, answers FROM answer_set WHERE eval_object_id = ?', [id], (err, rows) => {
    if (err) {
      logger.error('Database error in GET /api/evalmanage/:id/answer-files:', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ data: rows });
  });
});

// 新增答案记录
router.post('/answer-files', (req, res) => {
  const { evalObjectId, question_id, answers } = req.body;
  if (!evalObjectId || !question_id || !answers) {
    return res.status(400).json({ message: '缺少必填字段' });
  }

  db.get(
    'SELECT id FROM answer_set WHERE eval_object_id = ? AND question_id = ?',
    [evalObjectId, question_id],
    (err, row) => {
      if (err) {
        logger.error('Database error in POST /api/evalmanage/answer-files (check duplicate):', err);
        return res.status(500).json({ message: '数据库错误', error: err.message });
      }
      if (row) {
        return res.status(400).json({ error: true, message: '该评估对象ID和题目ID组合已存在' });
      }

      db.run(
        'INSERT INTO answer_set (eval_object_id, question_id, answers) VALUES (?, ?, ?)',
        [evalObjectId, question_id, answers],
        function (err) {
          if (err) {
            logger.error('Database error in POST /api/evalmanage/answer-files (insert):', err);
            return res.status(500).json({ message: '数据库错误', error: err.message });
          }
          res.json({ message: '新增答案成功', id: this.lastID });
        }
      );
    }
  );
});

// 修改答案记录
router.put('/answer-files/:id', (req, res) => {
  const { id } = req.params;
  const { question_id, answers } = req.body;
  if (!question_id || !answers) {
    return res.status(400).json({ message: '缺少必填字段' });
  }

  db.get('SELECT eval_object_id FROM answer_set WHERE id = ?', [id], (err, row) => {
    if (err) {
      logger.error('Database error in PUT /api/evalmanage/answer-files/:id (get eval_object_id):', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: '答案记录不存在' });
    }

    const evalObjectId = row.eval_object_id;

    db.get(
      'SELECT id FROM answer_set WHERE eval_object_id = ? AND question_id = ? AND id != ?',
      [evalObjectId, question_id, id],
      (err, row) => {
        if (err) {
          logger.error('Database error in PUT /api/evalmanage/answer-files/:id (check duplicate):', err);
          return res.status(500).json({ message: '数据库错误', error: err.message });
        }
        if (row) {
          return res.status(400).json({ error: true, message: '该评估对象ID和题目ID组合已存在' });
        }

        db.run(
          'UPDATE answer_set SET question_id = ?, answers = ? WHERE id = ?',
          [question_id, answers, id],
          function (err) {
            if (err) {
              logger.error('Database error in PUT /api/evalmanage/answer-files/:id (update):', err);
              return res.status(500).json({ message: '数据库错误', error: err.message });
            }
            res.json({ message: '修改答案成功' });
          }
        );
      }
    );
  });
});

// 删除答案记录
router.delete('/answer-files/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM answer_set WHERE id = ?', [id], function (err) {
    if (err) {
      logger.error('Database error in DELETE /api/evalmanage/answer-files/:id:', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ message: '答案记录删除成功' });
  });
});

// 批量导入答案
router.post('/answer-files/batch-import', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: '没有文件上传' });
  }
  const file = req.files.file;

  let fileContent;
  try {
    fileContent = iconv.decode(file.data, 'gbk');
  } catch (error) {
    logger.error('Error decoding file with GBK:', error);
    fileContent = iconv.decode(file.data, 'utf-8');
  }

  const records = [];
  parse(fileContent, { columns: true, trim: true, skip_empty_lines: true, bom: true })
    .on('data', (row) => {
      logger.debug('Parsed row:', row); // 使用 debug 级别日志
      const mappedRow = {
        eval_object_id: row['评估对象ID'],
        question_id: row['问题ID'],
        answers: row['答案'],
      };
      records.push(mappedRow);
    })
    .on('end', () => {
      logger.debug('All parsed records:', records); // 使用 debug 级别日志
      const errors = [];
      let processed = 0;
      let successCount = 0;

      if (records.length === 0) {
        return res.status(400).json({ message: 'CSV 文件为空或格式不正确', successCount: 0, errors: [] });
      }

      const finalizeImport = () => {
        if (errors.length > 0) {
          return res.status(400).json({ message: '部分数据导入失败', successCount, errors });
        }
        res.json({ message: '批量导入答案成功', successCount, errors: [] });
      };

      records.forEach((row, index) => {
        if (!row.eval_object_id || row.eval_object_id.trim() === '') {
          errors.push(`第 ${index + 1} 行：缺少必填字段（评估对象ID）`);
          processed++;
          if (processed === records.length) {
            finalizeImport();
          }
          return;
        }
        if (!row.question_id || row.question_id.trim() === '') {
          errors.push(`第 ${index + 1} 行：缺少必填字段（问题ID）`);
          processed++;
          if (processed === records.length) {
            finalizeImport();
          }
          return;
        }
        if (!row.answers || row.answers.trim() === '') {
          errors.push(`第 ${index + 1} 行：缺少必填字段（答案）`);
          processed++;
          if (processed === records.length) {
            finalizeImport();
          }
          return;
        }

        db.get(
          'SELECT id FROM answer_set WHERE eval_object_id = ? AND question_id = ?',
          [row.eval_object_id, row.question_id],
          (err, existingRow) => {
            if (err) {
              errors.push(`第 ${index + 1} 行：数据库错误 - ${err.message}`);
              processed++;
              if (processed === records.length) {
                finalizeImport();
              }
              return;
            }
            if (existingRow) {
              errors.push(`第 ${index + 1} 行：评估对象ID ${row.eval_object_id} 和问题ID ${row.question_id} 组合已存在`);
              processed++;
              if (processed === records.length) {
                finalizeImport();
              }
              return;
            }

            db.run(
              'INSERT INTO answer_set (eval_object_id, question_id, answers) VALUES (?, ?, ?)',
              [row.eval_object_id, row.question_id, row.answers],
              (err) => {
                if (err) {
                  errors.push(`第 ${index + 1} 行：插入失败 - ${err.message}`);
                } else {
                  successCount++;
                }
                processed++;
                if (processed === records.length) {
                  finalizeImport();
                }
              }
            );
          }
        );
      });
    })
    .on('error', (err) => {
      logger.error('CSV parse error:', err);
      res.status(500).json({ message: '文件解析错误', error: err.message, successCount: 0, errors: [] });
    });
});

// 导出答案模板
router.post('/export-template', (req, res) => {
  const templateData = [{ '评估对象ID': '2', '问题ID': 'A.2.4', '答案': '168' }];
  stringify(templateData, { header: true }, (err, csvContent) => {
    if (err) {
      logger.error('CSV stringify error in export-template:', err);
      return res.status(500).json({ message: '生成 CSV 错误', error: err.message });
    }
    const buffer = iconv.encode(csvContent, 'gbk');
    res.setHeader('Content-Type', 'text/csv; charset=gbk');
    res.setHeader('Content-Disposition', 'attachment; filename="answer_template.csv"');
    res.send(buffer);
  });
});

// 导出评估对象
router.post('/export', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '请选择要导出的记录' });
  }
  db.all('SELECT * FROM eval_object WHERE id IN (' + ids.map(() => '?').join(',') + ')', ids, (err, rows) => {
    if (err) {
      logger.error('Database error in POST /api/evalmanage/export:', err);
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    stringify(rows, { header: true }, (err, csvContent) => {
      if (err) {
        logger.error('CSV stringify error in export:', err);
        return res.status(500).json({ message: '生成 CSV 错误', error: err.message });
      }
      const buffer = iconv.encode(csvContent, 'gbk');
      res.setHeader('Content-Type', 'text/csv; charset=gbk');
      res.setHeader('Content-Disposition', 'attachment; filename="eval_objects.csv"');
      res.send(buffer);
    });
  });
});

// 导入评估对象
router.post('/import', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: '没有文件上传' });
  }
  const file = req.files.file;
  const fileContent = iconv.decode(file.data, 'utf-8');
  const records = [];
  parse(fileContent, { columns: true, trim: true })
    .on('data', (row) => {
      records.push(row);
    })
    .on('end', () => {
      const errors = [];
      let successCount = 0;
      let processed = 0;

      if (records.length === 0) {
        return res.status(400).json({ message: 'CSV 文件为空或格式不正确', successCount: 0, errors: [] });
      }

      const finalizeImport = () => {
        if (errors.length > 0) {
          return res.status(400).json({ message: '部分数据导入失败', successCount, errors });
        }
        res.json({ message: '导入成功', successCount, errors: [] });
      };

      records.forEach((row, index) => {
        if (!row.name) {
          errors.push(`第 ${index + 1} 行：缺少必填字段 name`);
          processed++;
          if (processed === records.length) {
            finalizeImport();
          }
          return;
        }

        db.run('INSERT INTO eval_object (name) VALUES (?)', [row.name], (err) => {
          if (err) {
            errors.push(`第 ${index + 1} 行：插入失败 - ${err.message}`);
          } else {
            successCount++;
          }
          processed++;
          if (processed === records.length) {
            finalizeImport();
          }
        });
      });
    })
    .on('error', (err) => {
      logger.error('CSV parse error in import:', err);
      res.status(500).json({ message: '文件解析错误', error: err.message, successCount: 0, errors: [] });
    });
});

module.exports = router;