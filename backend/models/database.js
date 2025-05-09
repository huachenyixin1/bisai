const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// 创建表
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS examinee (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      participant_number TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      eval_object_id INTEGER,
      exam_status TEXT DEFAULT '未比赛' CHECK(exam_status IN ('未比赛', '比赛中', '比赛完成')),
      FOREIGN KEY (eval_object_id) REFERENCES eval_object(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS judge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      account TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      weight REAL DEFAULT 0.3 CHECK(weight >= 0 AND weight <= 1),
      is_active INTEGER DEFAULT 0 CHECK(is_active IN (0, 1)),
      year INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS eval_object (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS answer_set (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eval_object_id INTEGER,
      answers JSONB,
      FOREIGN KEY (eval_object_id) REFERENCES eval_object(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS submission (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contestant_id INTEGER,
      eval_object_id,
      item TEXT NOT NULL,
      answer TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contestant_id) REFERENCES examinee(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS score (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id INTEGER,
      contestant_id INTEGER,
      item TEXT NOT NULL,
      deduction REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (judge_id) REFERENCES judge(id),
      FOREIGN KEY (contestant_id) REFERENCES examinee(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS marking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id INTEGER,
      contestant_id INTEGER,
      item TEXT NOT NULL,
     d_text TEXT NOT NULL,
      position JSO markeN,
      FOREIGN KEY (judge_id) REFERENCES judge(id),
      FOREIGN KEY (contestant_id) REFERENCES examinee(id)
    )
  `);
});

module.exports = db;