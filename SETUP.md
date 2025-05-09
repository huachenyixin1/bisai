# SETUP.md

## 项目概述
老年人评估师大赛系统，技术栈：
- 前端：React + Ant Design Pro（TypeScript）
- 后端：Node.js + Express + SQLite + WebSocket
- 包管理器：pnpm（前端）、npm（后端）
项目目录：D:\E\dockerdata\dasai

## 前提条件
- Node.js：v20.18.1
- VSCode：已安装
- pnpm：已全局安装（运行 npm install -g pnpm）
- 操作系统：Windows

## 初始化步骤
1. 创建项目目录：
   cd D:\E\dockerdata\dasai
   mkdir frontend backend

2. 初始化前端（React + Ant Design Pro）：
   cd D:\E\dockerdata\dasai
   pnpm create umi
   - What's the target folder name? 输入 frontend，回车
   - Pick Umi App Template: 输入 ant-design-pro，回车
   - Pick Npm Client: 选择 pnpm
   - Pick Npm Registry: 选择 npm
   - 等待安装完成（可能有 peerDependencies 警告，可忽略）
   cd frontend
   pnpm run start
   - 访问 http://localhost:8000，确认页面正常加载
   - 注意：项目默认使用 TypeScript（.ts 文件），如需 JavaScript，可手动转换

3. 初始化后端（Node.js + Express + SQLite）：
   cd D:\E\dockerdata\dasai\backend
   npm init -y
   npm install express sqlite3 ws
   mkdir routes models
   echo. > index.js
   echo. > routes/api.js
   echo. > models/database.js

4. 添加后端代码：
   - 编辑 models/database.js：
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
     db.serialize(() => {
       db.run(`CREATE TABLE IF NOT EXISTS examinee (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         participant_number TEXT UNIQUE NOT NULL,
         password TEXT NOT NULL,
         eval_object_id INTEGER,
         exam_status TEXT DEFAULT '未比赛' CHECK(exam_status IN ('未比赛', '比赛中', '比赛完成')),
         FOREIGN KEY (eval_object_id) REFERENCES eval_object(id)
       )`);
       db.run(`CREATE TABLE IF NOT EXISTS judge (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         account TEXT UNIQUE NOT NULL,
         password TEXT NOT NULL,
         weight REAL DEFAULT 0.3 CHECK(weight >= 0 AND weight <= 1),
         is_active INTEGER DEFAULT 0 CHECK(is_active IN (0, 1)),
         year INTEGER NOT NULL
       )`);
       db.run(`CREATE TABLE IF NOT EXISTS eval_object (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL
       )`);
       db.run(`CREATE TABLE IF NOT EXISTS answer_set (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         eval_object_id INTEGER,
         answers JSONB,
         FOREIGN KEY (eval_object_id) REFERENCES eval_object(id)
       )`);
       db.run(`CREATE TABLE IF NOT EXISTS submission (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         contestant_id INTEGER,
         item TEXT NOT NULL,
         answer TEXT NOT NULL,
         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (contestant_id) REFERENCES examinee(id)
       )`);
       db.run(`CREATE TABLE IF NOT EXISTS score (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         judge_id INTEGER,
         contestant_id INTEGER,
         item TEXT NOT NULL,
         deduction REAL NOT NULL,
         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (judge_id) REFERENCES judge(id),
         FOREIGN KEY (contestant_id) REFERENCES examinee(id)
       )`);
       db.run(`CREATE TABLE IF NOT EXISTS marking (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         judge_id INTEGER,
         contestant_id INTEGER,
         item TEXT NOT NULL,
         marked_text TEXT NOT NULL,
         position JSON,
         FOREIGN KEY (judge_id) REFERENCES judge(id),
         FOREIGN KEY (contestant_id) REFERENCES examinee(id)
       )`);
     });
     module.exports = db;

   - 编辑 index.js：
     const express = require('express');
     const WebSocket = require('ws');
     const http = require('http');
     const apiRoutes = require('./routes/api');
     const app = express();
     const server = http.createServer(app);
     const wss = new WebSocket.Server({ server });
     wss.on('connection', (ws) => {
       console.log('WebSocket client connected');
       ws.on('message', (message) => {
         console.log('Received:', message.toString());
       });
       ws.on('close', () => {
         console.log('WebSocket client disconnected');
       });
     });
     app.use(express.json());
     app.use('/api', apiRoutes);
     const PORT = 3000;
     server.listen(PORT, () => {
       console.log(`Server running on http://localhost:${PORT}`);
     });

   - 编辑 routes/api.js：
     const express = require('express');
     const router = express.Router();
     const db = require('../models/database');
     router.get('/', (req, res) => {
       res.json({ message: 'API is running' });
     });
     module.exports = router;

5. 启动后端：
   cd D:\E\dockerdata\dasai\backend
   node index.js
   - 访问 http://localhost:3000/api，应返回 {"message": "API is running"}



