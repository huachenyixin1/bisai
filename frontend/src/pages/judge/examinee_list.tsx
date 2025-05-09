// frontend/src/pages/judge/examinee_list.tsx
import { Table, Button, Avatar, Dropdown, message } from 'antd';
import { request } from '@umijs/max';
import { useState, useEffect } from 'react';
import { useNavigate } from 'umi';
import { UserOutlined } from '@ant-design/icons';
import './JudgeExamineeList.less';

interface Examinee {
  id: string;
  participant_number: string;
  name: string;
  eval_object_id: string;
  exam_status: string;
}

const JudgeExamineeList: React.FC = () => {
  const [examinees, setExaminees] = useState<Examinee[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const judgeName = "考官";

  const items = [
    {
      key: 'logout',
      label: <a href="/auth/logout">退出登录</a>,
    },
  ];

  const fetchData = async () => {
    try {
      const data = await request('/api/examinee');
      setExaminees(data);
      setLoading(false);
    } catch (error) {
      message.error('加载数据失败');
      setLoading(false);
    }
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
      width: '20%',
      align: 'center',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      align: 'center',
    },
    {
      title: '评测对象',
      dataIndex: 'eval_object_id',
      key: 'eval_object_id',
      width: '20%',
      align: 'center',
    },
    {
      title: '比赛状态',
      dataIndex: 'exam_status',
      key: 'exam_status',
      width: '20%',
      align: 'center',
    },
    {
      title: '操作',
      key: 'action',
      width: '20%',
      align: 'center',
      render: (_: any, record: Examinee) => (
        <Button
          type="primary"
          className="review-btn"
          onClick={() => navigate(`/judge/score_record?examinee_id=${record.id}`)}
          disabled={record.exam_status !== '比赛中'} // 状态为“比赛中”时启用
        >
          开始考评
        </Button>
      ),
    },
  ];

  return (
    <div className="judge-examinee-container">
      {/* 头部用户区域 */}
      <div className="header">
        <Dropdown menu={{ items }} placement="bottomRight">
          <div className="user-info">
            <Avatar
              style={{ 
                backgroundColor: '#BF360C',
                cursor: 'pointer'
              }}
            >
              {judgeName.charAt(0)}
            </Avatar>
          </div>
        </Dropdown>
      </div>

      {/* 主内容区域 */}
      <div className="container">
        <h2>选手列表</h2>
        
        <div className="table-container">
          <Table 
            columns={columns}
            dataSource={examinees}
            rowKey="id"
            loading={loading}
            pagination={false}
            bordered 
            className="examinee-table"
          />
        </div>
      </div>
    </div>
  );
};

export default JudgeExamineeList;