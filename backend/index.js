const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// 路由
const examineeRouter = require('./routes/examinee');
const judgeRouter = require('./routes/judge');
const evalManageRouter = require('./routes/evalmanage');
const questionsRouter = require('./routes/questions');
const scoringRouter = require('./routes/scoring');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

// 挂载路由
app.use('/api/examinee', examineeRouter);
app.use('/api/judge', judgeRouter);
app.use('/api/evalmanage', evalManageRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// 全局 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});