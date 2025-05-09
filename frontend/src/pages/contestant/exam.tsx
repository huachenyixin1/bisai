import React, { useEffect, useState } from 'react';
import { 
    Card, 
    Form, 
    Input, 
    Button, 
    Typography, 
    Layout, 
    Spin, 
    Radio,
    DatePicker,
    Checkbox,
    Select,
    Space,
    message,
    Avatar,
    Dropdown
} from 'antd';
import { useNavigate, useLocation } from 'umi';
import { UserOutlined } from '@ant-design/icons';
import './exam.less'; 

const { Title, Text } = Typography;
const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

interface Question {
    id?: string;
    title: string;
    type: 'text' | 'radio' | 'date' | 'checkbox' | 'select' | 'section' | 'array' | 'note';
    options?: { value: string | number; label: string }[];
    suffixText?: string;
    suffix?: string;
    width?: string;
    sectionTitle?: string;
    subField?: {
      id: string;
      type: string;
      title?: string;
      visibleWhen?: Record<string, string>;
    };
    subQuestions?: Question[];
}

const isInlineQuestion = (id: string, currentSection: string) => {
    if (currentSection !== 'a2') return false;
    const questionNumber = parseFloat(id.replace('A.2.', ''));
    return questionNumber >= 1 && questionNumber <= 8;
};

const shouldOptionsWrap = (options: { value: string | number; label: string }[], currentSection: string, id?: string) => {
    if (!options || !Array.isArray(options)) return false;
    const longText = options.some(opt => opt.label && opt.label.length > 15);
    const tooManyOptions = options.length > 5;

    if (currentSection === 'a2' && id && parseFloat(id.replace('A.2.', '')) >= 9) {
        return false;
    }
    if (currentSection === 'a3' && id === 'A.3.2') {
        return false;
    }
    if (currentSection === 'a4' && id === 'A.4.1') {
        return true;
    }
    if (currentSection === 'a5' && ['A.5.1', 'A.5.2', 'A.5.3', 'A.5.4'].includes(id || '')) {
        return true;
    }
    if (currentSection === 'a5' && id === 'A.5.6') {
        return true;
    }
    if (['b1', 'b2', 'b3', 'b4', 'b5'].includes(currentSection)) {
        return true;
    }
    return longText || tooManyOptions;
};

const getQuestionClassName = (id: string | undefined, currentSection: string) => {
    if (!id) return 'option-item';
    if (currentSection === 'a2' && isInlineQuestion(id, currentSection)) {
        return 'inline-item';
    }
    if (currentSection === 'a3') {
        return 'a3-item';
    }
    if (currentSection === 'a4') {
        return 'a4-item';
    }
    if (currentSection === 'a5') {
        return 'a5-item';
    }
    if (currentSection === 'b1') {
        return 'b1-item';
    }
    if (currentSection === 'b2') {
        return 'b2-item';
    }
    if (currentSection === 'b3') {
        return 'b3-item';
    }
    if (currentSection === 'b4') {
        return 'b4-item';
    }
    if (currentSection === 'b5') {
        return 'b5-item';
    }
    return 'option-item';
};

const ExamPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [sectionData, setSectionData] = useState<Question[] | null>(null);
    const [user, setUser] = useState<{ id: string; username: string; participant_number: string } | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
    const navigate = useNavigate();
    const location = useLocation();

    const query = new URLSearchParams(location.search);
    const currentSection = query.get('section') || 'a2';
    const sections = ['a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5'];
    const currentIndex = sections.indexOf(currentSection);

    console.log('location.search:', location.search);
    console.log('query.get("section"):', query.get('section'));
    console.log('currentSection:', currentSection);
    console.log('sections.includes(currentSection):', sections.includes(currentSection));

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            message.error('未登录，请重新登录');
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        const checkSubmissionStatus = async () => {
            if (!user?.id) return;
            try {
                const response = await fetch(`/api/completion_status/${user.id}`);
                if (!response.ok) throw new Error('查询提交状态失败');
                const data = await response.json();
                setHasSubmitted(data.has_submitted === 1);
            } catch (error) {
                console.error('Check submission status error:', error);
                message.error('查询提交状态失败');
            }
        };
        checkSubmissionStatus();
    }, [user]);

    useEffect(() => {
        if (!sections.includes(currentSection)) {
            navigate('/contestant?section=a2', { replace: true });
        }
    }, [currentSection, navigate]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/data/${currentSection}.json`);
                if (!response.ok) throw new Error('数据加载失败');
                const data = await response.json();
                setSectionData(data);
            } catch (err) {
                message.error('加载题目数据失败');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentSection]);

    useEffect(() => {
        const loadSubmissionData = async () => {
            if (!user?.id || !sectionData) return;

            try {
                const response = await fetch(`/api/get-submission?contestant_id=${user.id}&section=${currentSection}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Username': user.participant_number
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '加载已保存数据失败');
                }

                const { data } = await response.json();
                console.log('加载的已保存数据:', data);
                form.setFieldsValue(data);
            } catch (err) {
                console.error('加载已保存数据失败:', err.message);
                message.error('加载已保存数据失败');
            }
        };

        loadSubmissionData();
    }, [user, currentSection, sectionData, form]);

    const saveToDatabase = async (values: any) => {
        if (!user?.id) {
            message.error('未获取用户信息，无法保存');
            throw new Error('未获取用户信息');
        }

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Username': user.participant_number
                },
                body: JSON.stringify({
                    section: currentSection,
                    contestant_id: user.id,
                    data: values,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '保存失败');
            }

            message.success('数据已保存');
        } catch (err) {
            message.error('保存失败，请稍后重试');
            console.error(err);
            throw err;
        }
    };

    const handlePrev = async () => {
        if (currentIndex > 0) {
            const values = form.getFieldsValue();
            try {
                await saveToDatabase(values);
            } catch (err) {
                // 保存失败时继续导航，但已提示用户
            }
            navigate(`/contestant?section=${sections[currentIndex - 1]}`);
        }
    };

    const handleNext = async () => {
        if (currentIndex < sections.length - 1) {
            const values = form.getFieldsValue();
            try {
                await saveToDatabase(values);
            } catch (err) {
                // 保存失败时继续导航，但已提示用户
            }
            navigate(`/contestant?section=${sections[currentIndex + 1]}`);
        }
    };

    const renderInputField = (question: Question) => (
        <Space>
            <Input 
                className="underline-input"
                style={{ width: question.width || '150px' }}
                placeholder={question.suffixText}
                variant="borderless"
                type={question.id === 'B.5.1' ? 'number' : 'text'}
                disabled={hasSubmitted}
            />
            {question.suffix && <span>{question.suffix}</span>}
        </Space>
    );

    const renderRadioField = (question: Question) => {
        const wrapOptions = question.options ? shouldOptionsWrap(question.options, currentSection, question.id) : false;

        if (question.id && question.id.startsWith('A.2.') && parseFloat(question.id.replace('A.2.', '')) <= 8) {
            return (
                <Radio.Group disabled={hasSubmitted}>
                    <Space direction="horizontal" size={12}>
                        {question.options?.map(opt => (
                            <Radio 
                                key={opt.value} 
                                value={opt.value}
                            >
                                {opt.label}
                            </Radio>
                        ))}
                    </Space>
                </Radio.Group>
            );
        }

        if (wrapOptions) {
            return (
                <Radio.Group disabled={hasSubmitted}>
                    <Space direction="vertical" size={8}>
                        {question.options?.map(opt => (
                            <Radio 
                                key={opt.value} 
                                value={opt.value}
                            >
                                {opt.label}
                            </Radio>
                        ))}
                    </Space>
                </Radio.Group>
            );
        }

        return (
            <Radio.Group disabled={hasSubmitted}>
                <Space direction="horizontal" size={12} wrap>
                    {question.options?.map(opt => (
                        <Radio 
                            key={opt.value} 
                            value={opt.value}
                        >
                            {opt.label}
                        </Radio>
                    ))}
                </Space>
            </Radio.Group>
        );
    };

    const renderCheckboxField = (question: Question) => {
        const wrapOptions = question.options ? shouldOptionsWrap(question.options, currentSection, question.id) : false;

        if (wrapOptions) {
            return (
                <Checkbox.Group style={{ width: '100%' }} disabled={hasSubmitted}>
                    <Space 
                        direction={['A.5.1', 'A.5.2'].includes(question.id || '') ? 'vertical' : 'horizontal'}
                        size={12} 
                        wrap
                        style={
                            (question.id === 'A.4.1' && { display: 'flex', flexWrap: 'wrap', gap: '8px' }) ||
                            (['A.5.2', 'A.5.3', 'A.5.4'].includes(question.id || '') && { display: 'flex', flexWrap: 'wrap', gap: '8px' }) ||
                            (question.id === 'A.5.6' && { display: 'flex', flexWrap: 'wrap', gap: '8px' }) ||
                            {}
                        }
                    >
                        {question.options?.map((opt, index) => (
                            <Checkbox 
                                key={opt.value} 
                                value={opt.value}
                                style={
                                    (question.id === 'A.4.1' && { flex: '0 0 33.33%', boxSizing: 'border-box' }) ||
                                    (['A.5.2', 'A.5.3', 'A.5.4'].includes(question.id || '') && { flex: '0 0 33.33%', boxSizing: 'border-box' }) ||
                                    (question.id === 'A.5.6' && { flex: '0 0 50%', boxSizing: 'border-box' }) ||
                                    {}
                                }
                            >
                                {opt.label}
                            </Checkbox>
                        ))}
                    </Space>
                </Checkbox.Group>
            );
        }

        return (
            <Checkbox.Group style={{ width: '100%' }} disabled={hasSubmitted}>
                <Space direction="horizontal" size={12} wrap>
                    {question.options?.map(opt => (
                        <Checkbox 
                            key={opt.value} 
                            value={opt.value}
                        >
                            {opt.label}
                        </Checkbox>
                    ))}
                </Space>
            </Checkbox.Group>
        );
    };

    const renderSelectField = (question: Question) => {
        const optionsLength = question.options?.length || 0;
        const totalWidth = optionsLength * 120;

        return (
            <Select 
                className="underline-input"
                style={{ width: totalWidth > 600 ? '100%' : `${totalWidth}px` }}
                variant="borderless"
                suffixIcon={null}
                disabled={hasSubmitted}
            >
                {question.options?.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                        {opt.label}
                    </Option>
                ))}
            </Select>
        );
    };

    const renderDateField = (question: Question) => (
        <DatePicker 
            className="compact-date-picker"
            style={{ width: question.width || '150px' }}
            placeholder={question.suffixText}
            variant="borderless"
            suffixIcon={null}
            disabled={hasSubmitted}
        />
    );

    const renderArrayField = (question: Question) => (
        <TextArea
            className="underline-input"
            style={{ width: '100%', minHeight: '120px' }}
            placeholder={
                question.id === 'A.4.2' 
                    ? '请输入用药信息（示例：1. 药物名称 服药方法 用药剂量 用药频率）'
                    : '请输入用药信息，每行一条记录'
            }
            variant="borderless"
            disabled={hasSubmitted}
        />
    );

    const renderNoteField = (question: Question) => (
        <Text style={{ fontSize: 14, color: '#666' }}>
            {question.title}
        </Text>
    );

    const renderSubField = (question: Question) => {
        if (!question.subField) return null;

        return (
            <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => {
                    if (!question.subField?.visibleWhen) return false;
                    const [key, value] = Object.entries(question.subField.visibleWhen)[0];
                    return prev[key] !== curr[key];
                }}
            >
                {({ getFieldValue }) => {
                    if (!question.subField?.visibleWhen) return null;
                    const [key, value] = Object.entries(question.subField.visibleWhen)[0];
                    const isVisible = question.type === 'checkbox' 
                        ? getFieldValue(key)?.includes(value) 
                        : getFieldValue(key) === value;

                    return isVisible ? (
                        <span style={{ marginLeft: 16 }}>
                            <Input 
                                className="underline-input"
                                style={{ width: '150px' }}
                                placeholder={question.subField.title || '请输入'}
                                variant="borderless"
                                disabled={hasSubmitted}
                            />
                        </span>
                    ) : null;
                }}
            </Form.Item>
        );
    };

    const renderQuestion = (question: Question) => {
        switch (question.type) {
            case 'text': return renderInputField(question);
            case 'radio': return renderRadioField(question);
            case 'checkbox': return renderCheckboxField(question);
            case 'select': return renderSelectField(question);
            case 'date': return renderDateField(question);
            case 'array': return renderArrayField(question);
            case 'note': return renderNoteField(question);
            case 'section': return null;
            default: return renderInputField(question);
        }
    };

    const renderSection = (question: Question) => (
        <div>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                {question.id} {question.title}
            </Text>
            {question.subQuestions?.map(subQuestion => (
                <Form.Item 
                    key={subQuestion.id} 
                    label={
                        <Text style={{ fontSize: 16 }}>
                            {subQuestion.id} {subQuestion.title}
                        </Text>
                    }
                    name={subQuestion.id}
                    style={{ marginBottom: 12 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {renderQuestion(subQuestion)}
                        {renderSubField(subQuestion)}
                    </div>
                </Form.Item>
            ))}
        </div>
    );

    const onFinish = async (values: any) => {
        if (hasSubmitted) {
            message.warning('您已提交，无法再次提交');
            return;
        }
        try {
            await saveToDatabase(values);
            const submitResponse = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Username': user!.participant_number
                },
                body: JSON.stringify({
                    contestant_id: user!.id,
                    section: currentSection,
                    submission_data: values,
                }),
            });
            if (!submitResponse.ok) {
                const errorData = await submitResponse.json();
                throw new Error(errorData.message || '提交失败');
            }
            message.success('提交成功');
            setHasSubmitted(true);
        } catch (err) {
            message.error('提交失败，请稍后重试');
            console.error('Submit error:', err);
        }
    };

    const isLastSection = currentIndex === sections.length - 1;
    const isBSection = ['b1', 'b2', 'b3', 'b4', 'b5'].includes(currentSection);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const menuItems = [
        {
            key: 'logout',
            label: <span onClick={handleLogout}>退出登录</span>,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f2ee', paddingTop: '40px' }}>
            <Content style={{ margin: '0 16px', padding: '24px 0' }}>
                <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '20px', 
                    zIndex: 1000 
                }}>
                    {user && (
                        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
                            <div style={{ cursor: 'pointer' }}>
                                <Avatar 
                                    style={{ backgroundColor: '#BF360C' }}
                                    icon={<UserOutlined />}
                                />
                            </div>
                        </Dropdown>
                    )}
                </div>

                <Card 
                    className="form-card"
                    styles={{ body: { padding: 24 } }}
                >
                    <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
                        {sectionData?.find(q => q.type === 'section')?.sectionTitle || `表 ${currentSection.toUpperCase()}`}
                    </Title>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 8 }}>加载中...</div>
                        </div>
                    ) : (
                        <Form 
                            form={form}
                            onFinish={onFinish}
                            className="compact-form"
                            layout="vertical"
                            disabled={hasSubmitted}
                        >
                            <div className="inline-section">
                                {sectionData && Array.isArray(sectionData) ? (
                                    sectionData
                                        .filter(question => question.type !== 'section')
                                        .map((question, index) => (
                                            <React.Fragment key={question.id || index}>
                                                {question.type === 'section' ? (
                                                    renderSection(question)
                                                ) : (
                                                    <Form.Item 
                                                        label={
                                                            <Text strong style={{ fontSize: 16 }}>
                                                                {question.id} {question.title}
                                                                {question.suffixText && question.type !== 'text' && question.type !== 'date' && (
                                                                    <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                                                                        {question.suffixText}
                                                                    </div>
                                                                )}
                                                            </Text>
                                                        }
                                                        name={question.id}
                                                        className={getQuestionClassName(question.id, currentSection)}
                                                        style={{
                                                            marginBottom: 12,
                                                        }}
                                                    >
                                                        <div className="question-content">
                                                            {renderQuestion(question)}
                                                            {renderSubField(question)}
                                                        </div>
                                                    </Form.Item>
                                                )}
                                            </React.Fragment>
                                        ))
                                ) : (
                                    <div>数据格式错误，请检查 {currentSection}.json 文件</div>
                                )}
                            </div>

                            {isBSection && (
                                <Form.Item 
                                    label={<Text strong style={{ fontSize: 16 }}>总计得分</Text>}
                                    style={{ marginBottom: 12 }}
                                >
                                    <Input 
                                        className="underline-input"
                                        style={{ width: '150px' }}
                                        placeholder="请输入总计得分"
                                        variant="borderless"
                                        disabled={hasSubmitted}
                                    />
                                </Form.Item>
                            )}

                            <Form.Item style={{ textAlign: 'center', marginTop: 24 }}>
                                <Space>
                                    <Button 
                                        size="large" 
                                        disabled={currentIndex === 0 || hasSubmitted} 
                                        onClick={handlePrev}
                                    >
                                        上一项
                                    </Button>
                                    {isLastSection ? (
                                        <Button 
                                            type="primary" 
                                            htmlType="submit" 
                                            size="large"
                                            disabled={hasSubmitted}
                                        >
                                            {hasSubmitted ? '已提交' : '提交'}
                                        </Button>
                                    ) : (
                                        <Button 
                                            size="large" 
                                            disabled={currentIndex === sections.length - 1 || hasSubmitted} 
                                            onClick={handleNext}
                                        >
                                            下一项
                                        </Button>
                                    )}
                                </Space>
                            </Form.Item>
                            {hasSubmitted && (
                                <div style={{ textAlign: 'center', marginTop: 16, color: 'green' }}>
                                    您已提交答案，无法修改。
                                </div>
                            )}
                        </Form>
                    )}
                </Card>
            </Content>
        </Layout>
    );
};

export default ExamPage;