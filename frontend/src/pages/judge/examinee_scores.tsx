import { Table, Avatar, Dropdown, message } from 'antd';
import { useState, useEffect } from 'react';
import { useNavigate } from 'umi';
import { UserOutlined } from '@ant-design/icons';
import './examineeScores.less'; // Updated to match lowercase file name

interface ExamineeScore {
  id: string;
  participant_number: string;
  name: string;
  eval_object_id: string;
  exam_status: string;
  final_score: number;
  judge1_score: number;
  judge2_score: number;
  judge3_score: number;
}

const ExamineeScores: React.FC = () => {
  const [examinees, setExaminees] = useState<ExamineeScore[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const judgeName = "考官";

  const items = [
    {
      key: 'logout',
      label: <a onClick={() => handleLogout()}>退出登录</a>,
    },
  ];

  // 模拟数据
  const mockData: ExamineeScore[] = [
    {
      id: '1',
      participant_number: 'A001',
      name: '张伟',
      eval_object_id: 'OBJ001',
      exam_status: '已完成',
      final_score: 92.5,
      judge1_score: 90,
      judge2_score: 93,
      judge3_score: 94.5,
    },
    {
      id: '2',
      participant_number: 'A002',
      name: '李娜',
      eval_object_id: 'OBJ002',
      exam_status: '比赛中',
      final_score: 85.0,
      judge1_score: 84,
      judge2_score: 86,
      judge3_score: 85,
    },
    {
      id: '3',
      participant_number: 'A003',
      name: '王强',
      eval_object_id: 'OBJ003',
      exam_status: '未开始',
      final_score: 0,
      judge1_score: 0,
      judge2_score: 0,
      judge3_score: 0,
    },
    {
      id: '4',
      participant_number: 'A004',
      name: '赵丽',
      eval_object_id: 'OBJ004',
      exam_status: '已完成',
      final_score: 88.7,
      judge1_score: 89,
      judge2_score: 87,
      judge3_score: 90,
    },
    {
      id: '5',
      participant_number: 'A005',
      name: '陈明',
      eval_object_id: 'OBJ005',
      exam_status: '比赛中',
      final_score: 91.0,
      judge1_score: 90,
      judge2_score: 92,
      judge3_score: 91,
    },
  ];

  const fetchData = async () => {
    try {
      // 假设从 API 获取数据，暂时使用模拟数据
      // const data = await request('/api/examinee/scores');
      setExaminees(mockData);
      setLoading(false);
    } catch (error) {
      message.error('加载数据失败');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    message.success('已退出登录');
    navigate('/login');
  };

  useEffect(() => {
    fetchData();

    // 定时刷新，每 10 秒获取最新状态
    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    // 清理定时器
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: '参赛编号',
      dataIndex: 'participant_number',
      key: 'participant_number',
      width: '10%',
      align: 'center',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: '10%',
      align: 'center',
    },
    {
      title: '评测对象',
      dataIndex: 'eval_object_id',
      key: 'eval_object_id',
      width: '10%',
      align: 'center',
    },
    {
      title: '比赛状态',
      dataIndex: 'exam_status',
      key: 'exam_status',
      width: '10%',
      align: 'center',
    },
    {
      title: '最终成绩',
      dataIndex: 'final_score',
      key: 'final_score',
      width: '10%',
      align: 'center',
      render: (score: number) => (score > 0 ? score.toFixed(1) : '-'),
    },
    {
      title: '考官一成绩',
      dataIndex: 'judge1_score',
      key: 'judge1_score',
      width: '10%',
      align: 'center',
      render: (score: number) => (score > 0 ? score.toFixed(1) : '-'),
    },
    {
      title: '考官二成绩',
      dataIndex: 'judge2_score',
      key: 'judge2_score',
      width: '10%',
      align: 'center',
      render: (score: number) => (score > 0 ? score.toFixed(1) : '-'),
    },
    {
      title: '考官三成绩',
      dataIndex: 'judge3_score',
      key: 'judge3_score',
      width: '10%',
      align: 'center',
      render: (score: number) => (score > 0 ? score.toFixed(1) : '-'),
    },
  ];

  return (
    <div className="examinee-scores-container">
      {/* 头部用户区域 */}
      <div className="header">
        <Dropdown menu={{ items }} placement="bottomRight">
          <div className="user-info">
            <Avatar
              style={{
                backgroundColor: '#BF360C',
                cursor: 'pointer',
              }}
            >
              {judgeName.charAt(0)}
            </Avatar>
          </div>
        </Dropdown>
      </div>

      {/* 主内容区域 */}
      <div className="container">
        <h2>考生成绩</h2>

        <div className="table-container">
          <Table
            columns={columns}
            dataSource={examinees}
            rowKey="id"
            loading={loading}
            pagination={false}
            bordered
            className="scores-table"
          />
        </div>
      </div>
    </div>
  );
};

export default ExamineeScores;