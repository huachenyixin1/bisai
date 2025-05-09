import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'umi';
import { request } from '@umijs/max';
import { Button, Input, message, Typography, Avatar, Dropdown } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import './ScoreRecord.less';

const { Title, Text } = Typography;

interface ExamineeInfo {
  id: string;
  participant_number: string;
  name: string;
  eval_object_id: string;
  exam_status: string;
}

interface ScoreItem {
  id: string;
  module: string;
  maxScore: number;
  content: string;
  deduction: number;
  [key: string]: any; // 添加索引签名解决类型错误
}

interface MarkingPath {
  id: string;
  examinee_id: string;
  judge_id: string;
  paths: { x: number; y: number }[][];
}

interface JudgeInfo {
  id: string;
  name: string;
}

const ScoreRecord: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const examineeId = searchParams.get('examinee_id');
  const [examineeInfo, setExamineeInfo] = useState<ExamineeInfo | null>(null);
  const [judgeInfo, setJudgeInfo] = useState<JudgeInfo | null>(null);
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [totalDeduction, setTotalDeduction] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(100);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isMarkingMode, setIsMarkingMode] = useState<boolean>(false);
  const [eraseMode, setEraseMode] = useState<boolean>(false);
  const [markingPaths, setMarkingPaths] = useState<{ x: number; y: number }[][]>([]);
  const [savedMarkings, setSavedMarkings] = useState<MarkingPath[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const isErasingRef = useRef<boolean>(false);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const items = [
    {
      key: 'logout',
      label: <a onClick={() => handleLogout()}>退出登录</a>,
    },
  ];

  const loadExamineeInfo = async () => {
    if (!examineeId) {
      message.error('选手 ID 不存在');
      navigate('/judge/examinee_list');
      return;
    }
    try {
      const data = await request(`/api/examinee/${examineeId}/detail`);
      setExamineeInfo(data);
    } catch (error) {
      message.error('加载选手信息失败');
      console.error('Error loading examinee info:', error);
    }
  };

  const loadJudgeInfo = async () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      message.error('未获取用户信息，请重新登录');
      navigate('/login');
      return;
    }
    try {
      const user = JSON.parse(storedUser);
      if (user.role !== 'judge' && !user.username.startsWith('P')) {
        message.error('当前用户不是评委，请使用评委账号登录');
        navigate('/login');
        return;
      }
      try {
        const judges = await request('/api/judge');
        const currentJudge = judges.find((judge: any) => judge.id === user.id);
        if (currentJudge && currentJudge.name) {
          setJudgeInfo({
            id: user.id,
            name: currentJudge.name,
          });
          return;
        }
      } catch (apiError) {
        console.error('Failed to load judges from API:', apiError);
        message.warning('无法从服务器获取评委信息，使用本地用户信息');
      }
      let displayName = user.username;

      if (user.username.includes('_')) {
        const nameParts = user.username.split('_');
        displayName = nameParts.length > 1 ? nameParts[1] : user.username;
      } else if (user.username.startsWith('P')) {
        displayName = user.username.replace(/^P\d+/, '');
      }
      setJudgeInfo({
        id: user.id,
        name: displayName,
      });
    } catch (error) {
      console.error('Error parsing user info:', error);
      message.error('解析用户信息失败，请重新登录');
      navigate('/login');
    }
  };

  const loadScoreItems = async () => {
    try {
      const response = await fetch('/data/score-items.json');
      if (!response.ok) throw new Error('加载评分项失败');
      const data = await response.json();
      setScoreItems(
        data.map((item: any) => ({
          id: item.id,
          module: item.module,
          maxScore: item.maxScore,
          content: item.content,
          deduction: 0,
        }))
      );
    } catch (error) {
      message.error('加载评分项失败');
      console.error(error);
    }
  };

  const loadMarkings = async () => {
    if (!examineeId || !judgeInfo) return;
    try {
      const response = await request(`/api/scoring/markings?examinee_id=${examineeId}&judge_id=${judgeInfo.id}`);
      if (response.success) {
        setSavedMarkings(response.data);
        const paths = response.data.flatMap((marking: MarkingPath) => marking.paths);
        setMarkingPaths(paths);
      }
    } catch (error) {
      message.error('加载标记失败');
      console.error('Load markings error:', error);
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      drawMarkings();
    };

    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(container);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }

    return () => observer.disconnect();
  };

  const drawMarkings = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    markingPaths.forEach(path => {
      if (!path || path.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = 'red';
      ctx.moveTo(path[0].x * canvas.width / window.devicePixelRatio, path[0].y * canvas.height / window.devicePixelRatio);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * canvas.width / window.devicePixelRatio, path[i].y * canvas.height / window.devicePixelRatio);
      }
      ctx.stroke();
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (isMarkingMode && !eraseMode) {
      isDrawingRef.current = true;
      currentPathRef.current = [{ x, y }];
      setMarkingPaths(prev => [...prev, currentPathRef.current]);
    } else if (eraseMode) {
      isErasingRef.current = true;
      handleEraseMarking(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (isDrawingRef.current && isMarkingMode && !eraseMode) {
      currentPathRef.current.push({ x, y });
      setMarkingPaths(prev => {
        const newPaths = [...prev];
        newPaths[newPaths.length - 1] = [...currentPathRef.current];
        return newPaths;
      });
      drawMarkings();
    } else if (isErasingRef.current && eraseMode) {
      handleEraseMarking(x, y);
    }
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (currentPathRef.current.length >= 2) {
        const newPath = [...currentPathRef.current];
        setMarkingPaths(prev => {
          const newPaths = [...prev.slice(0, -1), newPath];
          return newPaths;
        });
      } else {
        setMarkingPaths(prev => prev.slice(0, -1));
      }
      currentPathRef.current = [];
      drawMarkings();
    }
    if (isErasingRef.current) {
      isErasingRef.current = false;
      drawMarkings();
    }
  };

  const handleEraseMarking = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const eraseSize = 20 / Math.min(rect.width, rect.height);
    const newPaths = markingPaths.filter(path => {
      return !path.some(point => {
        const dx = point.x - x;
        const dy = point.y - y;
        return Math.abs(dx) < eraseSize / 2 && Math.abs(dy) < eraseSize / 2;
      });
    });
    setMarkingPaths(newPaths);
    drawMarkings();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.rect(
        (x * rect.width) - 10,
        (y * rect.height) - 10,
        20,
        20
      );
      ctx.strokeStyle = 'blue';
      ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
      ctx.stroke();
      ctx.fill();
      setTimeout(() => drawMarkings(), 200);
    }
  };

  const toggleEraseMode = () => {
    setEraseMode(prev => !prev);
    setIsMarkingMode(false);
    message.info(eraseMode ? '退出擦除模式' : '进入擦除模式');
  };

  const calculateTotal = () => {
    const deduction = scoreItems.reduce((sum, item) => sum + (item.deduction || 0), 0);
    setTotalDeduction(deduction);
    setTotalScore(100 - deduction);
  };

  const handleDeductionChange = (id: string, value: string) => {
    const newValue = parseFloat(value) || 0;
    const maxScore = scoreItems.find(item => item.id === id)!.maxScore;
    if (newValue < 0 || newValue > maxScore) {
      message.warning(`扣分值必须在 0 到 ${maxScore} 之间`);
      return;
    }
    setScoreItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, deduction: newValue } : item
      )
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    message.success('已退出登录');
    navigate('/login');
  };

  const handleSubmit = async () => {
    if (isMarkingMode || eraseMode) {
      message.error('请先保存或取消标记/擦除后再完成评审');
      return;
    }
    if (!examineeId || !judgeInfo) {
      message.error('选手或评委信息缺失');
      return;
    }
    setSubmitting(true);
    try {
      const scoreResult = await request('/api/scoring/submit-scores', {
        method: 'POST',
        data: {
          examinee_id: examineeId,
          judge_id: judgeInfo.id,
          scores: scoreItems.map(item => ({
            item_id: item.id,
            deduction: item.deduction || 0,
          })),
          total_score: totalScore,
        },
      });
      if (!scoreResult.success) {
        throw new Error(scoreResult.error || '评分提交失败');
      }
      message.success('评审完成');
      navigate(`/judge/examinee_scores?examinee_id=${examineeId}`);
    } catch (error: any) {
      message.error(error.message || '提交失败，请重试');
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartMarking = () => {
    setIsMarkingMode(true);
    setEraseMode(false);
    setIsDropdownOpen(true);
    message.info('进入标记模式，请在页面上画线');
  };

  const compressPaths = (paths: { x: number; y: number }[][]) => {
    return paths.filter(path => path && path.length >= 2);
  };

  const handleSaveMarking = async () => {
    if (!examineeId || !judgeInfo) {
      message.error('选手或评委信息缺失');
      return;
    }
    const compressedPaths = compressPaths(markingPaths);
    if (compressedPaths.length === 0) {
      message.error('没有有效的标记数据');
      return;
    }
    try {
      const response = await request('/api/scoring/save-markings', {
        method: 'POST',
        data: {
          examinee_id: examineeId,
          judge_id: judgeInfo.id,
          paths: compressedPaths,
        },
      });
      if (response.success) {
        message.success('标记已保存');
        setSavedMarkings(prev => [
          ...prev,
          { id: response.id, examinee_id: examineeId, judge_id: judgeInfo.id, paths: compressedPaths },
        ]);
        setIsMarkingMode(false);
        setEraseMode(false);
        setIsDropdownOpen(false);
      } else {
        throw new Error('保存标记失败');
      }
    } catch (error: any) {
      message.error('保存标记失败');
      console.error('Save marking error:', error);
    }
  };

  const handleCancelMarking = () => {
    setIsMarkingMode(false);
    setEraseMode(false);
    setMarkingPaths(savedMarkings.flatMap(marking => marking.paths));
    drawMarkings();
    setIsDropdownOpen(false);
    message.info('已退出标记模式');
  };

  useEffect(() => {
    loadJudgeInfo();
    loadExamineeInfo();
    loadScoreItems();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (judgeInfo && examineeId) {
      loadMarkings();
    }
  }, [judgeInfo, examineeId]);

  useEffect(() => {
    initCanvas();
    drawMarkings();
  }, [markingPaths, eraseMode]);

  useEffect(() => {
    calculateTotal();
  }, [scoreItems]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff' }}>加载中...</div>;
  }

  if (!examineeInfo || !judgeInfo) {
    return <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff' }}>无法加载选手或评委信息，请返回重试</div>;
  }

  const groupedItems = scoreItems.reduce((acc: { [key: string]: ScoreItem[] }, item) => {
    if (!acc[item.module]) {
      acc[item.module] = [];
    }
    acc[item.module].push(item);
    return acc;
  }, {});

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      align: 'center',
      render: (text: string, record: any) => (record.id ? text : ''),
    },
    {
      title: '具体要求',
      dataIndex: 'content',
      key: 'content',
      render: (text: string) => (
        <div style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
          {text.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
        </div>
      ),
    },
    {
      title: '分值',
      dataIndex: 'maxScore',
      key: 'maxScore',
      align: 'center',
      render: (text: number, record: any) => (record.maxScore !== undefined ? text : ''),
    },
    {
      title: '扣分',
      key: 'deduction',
      align: 'center',
      render: (_: any, record: ScoreItem) => (
        <div className="deduction-input">
          <span className="deduction-prefix">-</span>
          <Input
            type="number"
            step="0.1"
            value={record.deduction}
            onChange={(e) => handleDeductionChange(record.id, e.target.value)}
            style={{ width: '60px', textAlign: 'center' }}
            disabled={isMarkingMode || eraseMode}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="content">
      <div className="sidebar" /> {/* Left sidebar */}
      <div className="main-content" ref={containerRef}>
        <div className="logout-container">
          <Dropdown menu={{ items }} placement="bottomRight">
            <div style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#BF360C' }} icon={<UserOutlined />} />
            </div>
          </Dropdown>
        </div>

        <Title level={2} id="tableName">
          操作技能评分
        </Title>

        <div className="header">
          <Button className="back-btn" onClick={() => navigate('/judge/examinee_list')}>
            返回
          </Button>
        </div>

        <div className="examinee-info">
          <div className="examinee-details">
            <Text strong>选手信息：</Text>
            <span>{examineeInfo.participant_number} - {examineeInfo.name}</span>
          </div>
          <div className="judge-details">
            <Text strong>评委：</Text>
            <span>{judgeInfo.name}</span>
          </div>
        </div>

        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              pointerEvents: isMarkingMode || eraseMode ? 'auto' : 'none',
              cursor: isMarkingMode ? 'url(/images/pen.png), auto' : eraseMode ? 'url(/images/eraser.png), auto' : 'default',
            }}
          />
        </div>

        <div className="table-container">
          {Object.entries(groupedItems).map(([module, items]) => (
            <div key={module} className="module-section">
              <Title level={4} className="module-title">
                {module}
              </Title>
              <div className="module-content">
                <table id="scoreTable">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col.key}>{col.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        {columns.map(col => (
                          <td key={col.key}>{col.render?.(item[col.dataIndex as keyof ScoreItem], item)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="final-score">
          <Text strong>分值：100</Text>
          <Text strong style={{ marginLeft: '20px' }}>
            扣分：{totalDeduction}
          </Text>
          <Text strong style={{ marginLeft: '20px' }}>
            最终得分：{totalScore}
          </Text>
        </div>

        <div className="navigation">
          <Button
            className="submit-btn"
            type="primary"
            onClick={handleSubmit}
            disabled={isMarkingMode || eraseMode || submitting}
            loading={submitting}
          >
            完成评审
          </Button>
        </div>

        <div className="floating-btn-container">
          <div className="floating-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="edit-icon" />
          </div>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={handleStartMarking}>
                <div className="mark-icon" />
                <span>标记</span>
              </div>
              <div className="dropdown-item" onClick={handleSaveMarking}>
                <div className="save-icon" />
                <span>保存</span>
              </div>
              <div className="dropdown-item" onClick={toggleEraseMode}>
                <div className="erase-icon" />
                <span>{eraseMode ? '退出擦除' : '擦除'}</span>
              </div>
              <div className="dropdown-item" onClick={handleCancelMarking}>
                <div className="cancel-icon" />
                <span>取消</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="sidebar" /> {/* Right sidebar */}
    </div>
  );
};

export default ScoreRecord;