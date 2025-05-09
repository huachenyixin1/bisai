const express = require('express');
const router = express.Router();
const db = require('../models/database');
const bcrypt = require('bcrypt');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

// 获取所有考官
router.get('/', (req, res) => {
  db.all('SELECT * FROM judge', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json(rows);
  });
});

// 新增考官
router.post('/', (req, res) => {
  const { name, account, password, weight, is_active, year } = req.body;
  if (!name || !account || !password || !year) {
    return res.status(400).json({ message: '缺少必填字段' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(
    'INSERT INTO judge (name, account, password, weight, is_active, year) VALUES (?, ?, ?, ?, ?, ?)',
    [name, account, hashedPassword, weight || 0.3, is_active || 0, year],
    function (err) {
      if (err) {
        return res.status(500).json({ message: '数据库错误', error: err.message });
      }
      res.json({ message: '新增成功', id: this.lastID });
    }
  );
});

// 修改考官
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, account, password, weight, is_active, year } = req.body;
  if (!name || !account || !year) {
    return res.status(400).json({ message: '缺少必填字段' });
  }
  const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
  const query = password
    ? 'UPDATE judge SET name = ?, account = ?, password = ?, weight = ?, is_active = ?, year = ? WHERE id = ?'
    : 'UPDATE judge SET name = ?, account = ?, weight = ?, is_active = ?, year = ? WHERE id = ?';
  const params = password
    ? [name, account, hashedPassword, weight || 0.3, is_active || 0, year, id]
    : [name, account, weight || 0.3, is_active || 0, year, id];
  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ message: '修改成功' });
  });
});

// 删除考官
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM judge WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    res.json({ message: '删除成功' });
  });
});

// 导入考官
router.post('/import', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: '没有文件上传' });
  }
  const file = req.files.file;
  const records = [];
  parse(file.data.toString(), { columns: true, trim: true })
    .on('data', (row) => {
      records.push(row);
    })
    .on('end', () => {
      const stmt = db.prepare('INSERT INTO judge (name, account, password, weight, is_active, year) VALUES (?, ?, ?, ?, ?, ?)');
      records.forEach((row) => {
        const hashedPassword = bcrypt.hashSync(row.password, 10);
        stmt.run(row.name, row.account, hashedPassword, parseFloat(row.weight) || 0.3, parseInt(row.is_active) || 0, parseInt(row.year));
      });
      stmt.finalize((err) => {
        if (err) {
          return res.status(500).json({ message: '数据库错误', error: err.message });
        }
        res.json({ message: '导入成功' });
      });
    })
    .on('error', (err) => {
      res.status(500).json({ message: '文件解析错误', error: err.message });
    });
});

// 导出考官
router.post('/export', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '请选择要导出的记录' });
  }
  db.all('SELECT name, account, weight, is_active, year FROM judge WHERE id IN (' + ids.map(() => '?').join(',') + ')', ids, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误', error: err.message });
    }
    stringify(rows, { header: true }, (err, output) => {
      if (err) {
        return res.status(500).json({ message: '生成 CSV 错误', error: err.message });
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="judges.csv"');
      res.send(output);
    });
  });
});

module.exports = router;