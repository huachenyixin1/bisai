import { ProTable, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Modal, Form, Input, InputNumber, Select } from 'antd';
import { request } from '@umijs/max';
import { useState, useRef } from 'react';

const Examinee: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const actionRef = useRef();

  const columns: ProColumns[] = [
    { title: '考生ID', dataIndex: 'id', key: 'id' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '参赛编号', dataIndex: 'participant_number', key: 'participant_number' },
    { title: '评测对象ID', dataIndex: 'eval_object_id', key: 'eval_object_id' },
    { title: '比赛状态', dataIndex: 'exam_status', key: 'exam_status' },
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
              setModalVisible(true);
            }}
            style={{ marginRight: 8 }}
          >
            编辑
          </a>
          <Popconfirm
            title="确定删除？"
            onConfirm={async () => {
              await request(`/api/examinee/${record.id}`, { method: 'DELETE' });
              message.success('删除成功');
              actionRef.current?.reload();
            }}
          >
            <a style={{ color: 'red', marginRight: 8 }}>删除</a>
          </Popconfirm>
          <a
            onClick={async () => {
              await request(`/api/examinee/${record.id}/reset-password`, { method: 'POST' });
              message.success('密码重置成功');
              actionRef.current?.reload();
            }}
            style={{ marginRight: 8 }}
          >
            重置密码
          </a>
          <a
            onClick={async () => {
              await request(`/api/examinee/${record.id}/reset-exam`, { method: 'POST' });
              message.success('考试重置成功');
              actionRef.current?.reload();
            }}
          >
            重置考试
          </a>
        </div>
      ),
    },
  ];

  return (
    <div>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={async () => {
          const data = await request('/api/examinee');
          return { data, success: true };
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
              setModalVisible(true);
            }}
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
              const response = await request('/api/examinee/export', {
                method: 'POST',
                data: { ids },
                responseType: 'blob',
              });
              const url = window.URL.createObjectURL(new Blob([response]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'examinees.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            导出
          </Button>,
          <Button>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              id="importFile"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                await request('/api/examinee/import', {
                  method: 'POST',
                  data: formData,
                });
                message.success('导入成功');
                actionRef.current?.reload();
              }}
            />
            <label htmlFor="importFile">导入</label>
          </Button>,
        ]}
        rowSelection={{
          onChange: (selectedRowKeys, selectedRows) => {
            actionRef.current?.setSelectedRows?.(selectedRows);
          },
        }}
      />

      <Modal
        title={modalType === 'add' ? '新增参赛者' : '编辑参赛者'}
        visible={modalVisible}
        onOk={() => {
          form.submit();
        }}
        onCancel={() => setModalVisible(false)}
      >
        <Form
          form={form}
          onFinish={async (values) => {
            if (modalType === 'add') {
              await request('/api/examinee', {
                method: 'POST',
                data: values,
              });
              message.success('新增成功');
            } else {
              await request(`/api/examinee/${currentRecord.id}`, {
                method: 'PUT',
                data: values,
              });
              message.success('修改成功');
            }
            setModalVisible(false);
            actionRef.current?.reload();
          }}
        >
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="participant_number"
            label="参赛编号"
            rules={[{ required: true, message: '请输入参赛编号' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="eval_object_id"
            label="评测对象ID"
            rules={[{ required: true, message: '请输入评测对象ID' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="exam_status" label="比赛状态" initialValue="未比赛">
            <Select>
              <Select.Option value="未比赛">未比赛</Select.Option>
              <Select.Option value="比赛中">比赛中</Select.Option>
              <Select.Option value="比赛完成">比赛完成</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Examinee;