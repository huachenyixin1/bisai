import { ProTable, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Modal, Form, Input, List } from 'antd';
import { request } from '@umijs/max';
import { useState, useRef } from 'react';
import { DeleteOutlined } from '@ant-design/icons';

const EvalManage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [answerModalOpen, setAnswerModalOpen] = useState(false);
  const [importResultModalOpen, setImportResultModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errors: string[] }>({ successCount: 0, errors: [] });
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [answerModalType, setAnswerModalType] = useState<'add' | 'edit'>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [answerFiles, setAnswerFiles] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [answerForm] = Form.useForm();
  const actionRef = useRef();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnswerFiles = async (recordId: string) => {
    try {
      const response = await request(`/api/evalmanage/${recordId}/answer-files`, { timeout: 5000 });
      setAnswerFiles(response.data || []);
    } catch (error) {
      message.error('获取答案文件列表失败');
      console.error('Fetch answer files error:', error);
    }
  };

  const columns: ProColumns[] = [
    { title: '评估对象ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          <a
            onClick={() => {
              setModalType('edit');
              setCurrentRecord(record);
              form.setFieldsValue(record);
              setModalOpen(true);
            }}
            style={{ marginRight: 16 }} // 增加间距
          >
            编辑
          </a>
          <a
            onClick={() => {
              setCurrentRecord(record);
              fetchAnswerFiles(record.id);
              setAnswerModalOpen(true);
            }}
            style={{ marginRight: 16 }} // 增加间距
          >
            试题答案库
          </a>
          <Popconfirm
            title="确定删除？"
            onConfirm={async () => {
              await request(`/api/evalmanage/${record.id}`, { method: 'DELETE' });
              message.success('删除成功');
              actionRef.current?.reload();
            }}
          >
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const handleDeleteAnswerFile = async (fileId: string) => {
    try {
      await request(`/api/evalmanage/answer-files/${fileId}`, { method: 'DELETE' });
      message.success('答案记录删除成功');
      fetchAnswerFiles(currentRecord.id);
    } catch (error) {
      message.error('答案记录删除失败');
    }
  };

  const handleExportTemplate = async () => {
    try {
      const response = await request('/api/evalmanage/export-template', {
        method: 'POST',
        responseType: 'blob',
        timeout: 5000,
      });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'answer_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('导出模板失败');
      console.error('Export template error:', error);
    }
  };

  return (
    <div>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={async () => {
          try {
            const data = await request('/api/evalmanage', { timeout: 5000 });
            return { data, success: true };
          } catch (error) {
            message.error('加载评估对象失败，请检查后端服务');
            return { data: [], success: false };
          }
        }}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            onClick={() => {
              setModalType('add');
              setCurrentRecord(null);
              form.resetFields();
              setModalOpen(true);
            }}
            style={{ marginRight: 8 }} // 工具栏按钮间距
          >
            新增
          </Button>,
          <Button
            onClick={async () => {
              const selectedRows = actionRef.current?.getSelectedRows?.() || [];
              if (selectedRows.length === 0) {
                message.warning('请选择要导出的记录');
                return;
              }
              const ids = selectedRows.map((row: any) => row.id);
              try {
                const response = await request('/api/evalmanage/export', {
                  method: 'POST',
                  data: { ids },
                  responseType: 'blob',
                  timeout: 5000,
                });
                const url = window.URL.createObjectURL(new Blob([response]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'eval_objects.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (error) {
                message.error('导出失败');
              }
            }}
            style={{ marginRight: 8 }}
          >
            导出
          </Button>,
          <Button
            onClick={handleExportTemplate}
            style={{ marginRight: 8 }}
          >
            导出答案模板
          </Button>,
          <Button style={{ marginRight: 8 }}>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              id="importFile"
              ref={fileInputRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  message.warning('请选择一个 CSV 文件');
                  return;
                }
                const formData = new FormData();
                formData.append('file', file);
                try {
                  const response = await request('/api/evalmanage/answer-files/batch-import', {
                    method: 'POST',
                    data: formData,
                    timeout: 5000,
                  });
                  if (response.errors && response.errors.length > 0) {
                    setImportResult({
                      successCount: response.successCount || 0,
                      errors: response.errors,
                    });
                  } else {
                    setImportResult({
                      successCount: response.successCount || 0,
                      errors: [],
                    });
                  }
                  setImportResultModalOpen(true);
                } catch (error) {
                  const errorMessage = error.response?.data?.message || error.message || '未知错误';
                  const errorDetails = error.response?.data?.errors || [];
                  setImportResult({
                    successCount: error.response?.data?.successCount || 0,
                    errors: errorDetails.length > 0 ? errorDetails : [`导入失败：${errorMessage}`],
                  });
                  setImportResultModalOpen(true);
                  console.error('Import answers error:', error);
                } finally {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }
              }}
            />
            <label htmlFor="importFile">批量导入答案</label>
          </Button>,
        ]}
        rowSelection={{
          onChange: (selectedRowKeys, selectedRows) => {
            actionRef.current?.setSelectedRows?.(selectedRows);
          },
        }}
      />

      <Modal
        title={modalType === 'add' ? '新增评估对象' : '编辑评估对象'}
        open={modalOpen}
        onOk={() => {
          form.submit();
        }}
        onCancel={() => setModalOpen(false)}
      >
        <Form
          form={form}
          onFinish={async (values) => {
            try {
              if (modalType === 'add') {
                await request('/api/evalmanage', {
                  method: 'POST',
                  data: values,
                });
                message.success('新增成功');
              } else {
                await request(`/api/evalmanage/${currentRecord.id}`, {
                  method: 'PUT',
                  data: values,
                });
                message.success('修改成功');
              }
              setModalOpen(false);
              actionRef.current?.reload();
            } catch (error) {
              message.error('操作失败，请检查后端服务');
            }
          }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入结果"
        open={importResultModalOpen}
        onOk={() => {
          setImportResultModalOpen(false);
          actionRef.current?.reload();
        }}
        onCancel={() => {
          setImportResultModalOpen(false);
          actionRef.current?.reload();
        }}
        okText="确定"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <p>成功导入 {importResult.successCount} 行数据</p>
        {importResult.errors.length > 0 && (
          <>
            <p>以下行导入失败：</p>
            <ul>
              {importResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      <Modal
        title="试题答案库"
        open={answerModalOpen}
        onOk={() => setAnswerModalOpen(false)}
        onCancel={() => setAnswerModalOpen(false)}
        okText="关闭"
        width={600}
        footer={[
          <Button
            key="add"
            type="primary"
            onClick={() => {
              setAnswerModalType('add');
              setCurrentAnswer(null);
              answerForm.resetFields();
            }}
          >
            新增答案
          </Button>,
          <Button key="close" onClick={() => setAnswerModalOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        <div>
          {answerModalType === 'add' && (
            <Form
              form={answerForm}
              layout="inline"
              onFinish={async (values) => {
                try {
                  const response = await request('/api/evalmanage/answer-files', {
                    method: 'POST',
                    data: { ...values, evalObjectId: currentRecord?.id },
                  });
                  if (response.error) {
                    message.error(response.message);
                    return;
                  }
                  message.success('新增答案成功');
                  fetchAnswerFiles(currentRecord.id);
                  answerForm.resetFields();
                } catch (error) {
                  message.error('新增答案失败');
                }
              }}
              style={{ marginBottom: 16 }}
            >
              <Form.Item
                name="question_id"
                label="题目ID"
                rules={[{ required: true, message: '请输入题目ID' }]}
              >
                <Input placeholder="如 A.2.4" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item
                name="answers"
                label="答案"
                rules={[{ required: true, message: '请输入答案' }]}
              >
                <Input placeholder="如 168" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  提交
                </Button>
              </Form.Item>
            </Form>
          )}

          <Modal
            title="编辑答案"
            open={answerModalType === 'edit'}
            onOk={() => {
              answerForm.submit();
            }}
            onCancel={() => setAnswerModalType('add')}
          >
            <Form
              form={answerForm}
              onFinish={async (values) => {
                try {
                  const response = await request(`/api/evalmanage/answer-files/${currentAnswer.id}`, {
                    method: 'PUT',
                    data: values,
                  });
                  if (response.error) {
                    message.error(response.message);
                    return;
                  }
                  message.success('修改答案成功');
                  fetchAnswerFiles(currentRecord.id);
                  setAnswerModalType('add');
                } catch (error) {
                  message.error('修改答案失败');
                }
              }}
            >
              <Form.Item
                name="question_id"
                label="题目ID"
                rules={[{ required: true, message: '请输入题目ID' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="answers"
                label="答案"
                rules={[{ required: true, message: '请输入答案' }]}
              >
                <Input />
              </Form.Item>
            </Form>
          </Modal>

          <List
            style={{ marginTop: 16 }}
            bordered
            dataSource={answerFiles}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <a
                    key="edit"
                    onClick={() => {
                      setAnswerModalType('edit');
                      setCurrentAnswer(item);
                      answerForm.setFieldsValue({
                        question_id: item.question_id,
                        answers: item.answers,
                      });
                    }}
                  >
                    编辑
                  </a>,
                  <a
                    key="delete"
                    style={{ color: 'red' }}
                    onClick={() => handleDeleteAnswerFile(item.id)}
                  >
                    <DeleteOutlined /> 删除
                  </a>,
                ]}
              >
                <span>
                  <strong>题目ID:</strong> {item.question_id} | <strong>答案:</strong> {item.answers}
                </span>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
};

export default EvalManage;