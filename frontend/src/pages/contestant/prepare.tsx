// frontend/src/pages/contestant/prepare.tsx
import React from 'react';
import { useNavigate } from 'umi';
import { message } from 'antd';
import './prepare.less';

const PreparePage: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleStart = async () => {
    if (!user?.id) {
      message.error('未登录，请重新登录');
      navigate('/login');
      return;
    }

    try {
      // 更新选手状态为“比赛中”
      const response = await fetch('/api/start-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': user.participant_number
        },
        body: JSON.stringify({ contestant_id: user.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '开始考试失败');
      }

      navigate('/contestant?section=a2'); // 确保跳转参数正确
    } catch (err) {
      message.error('开始考试失败，请稍后重试');
      console.error(err);
    }
  };

  return (
    <div className="container">
      <p className="prompt">请选手做好准备工作！</p>
      <div className="start-box">
        <button className="start-btn" onClick={handleStart}>
          开始考试
        </button>
        <p className="terms">
          <a href="#">考试规则</a> 和 <a href="#">隐私政策</a>。
        </p>
      </div>
    </div>
  );
};

export default PreparePage;