// frontend/src/pages/Login/index.tsx
import { message } from 'antd';
import { history } from 'umi';
import { useState } from 'react';
import './index.less';

export default () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onFinish = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // 存储用户信息到 localStorage
        localStorage.setItem('user', JSON.stringify({
          id: data.id,
          username: data.username,
          role: data.role,
          participant_number: username // 存储参赛编号以便查询
        }));

        message.success('登录成功');
        if (username.startsWith('admin')) {
          history.push('/admin/examinee');
        } else if (username.startsWith('P')) {
          history.push('/judge/examinee_list');
        } else if (/^\d+$/.test(username)) {
          history.push('/contestant/prepare'); // 修改为跳转到准备页面
        }
      } else {
        setError(data.message || '登录失败');
        message.error(data.message || '登录失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
      message.error('网络错误，请重试');
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">老年评估师大赛</h1>
      <p className="login-subtitle">欢迎参加老年评估师技能大赛，请登录以继续！</p>
      <div className="login-box">
        <form onSubmit={(e) => { e.preventDefault(); onFinish(); }}>
          <input
            type="text"
            placeholder="账号"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="login-btn">
            登录
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="terms">
          通过登录，您同意大赛的
          <a href="#">参赛条款</a> 和 <a href="#">隐私政策</a>。
        </p>
      </div>
      <button className="learn-more">了解更多 ↓</button>
    </div>
  );
};