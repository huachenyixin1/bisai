import { ProTable, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Modal, Form, Input, InputNumber, Select } from 'antd';
import { request } from '@umijs/max';
import { useState, useRef } from 'react';

const Judge: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const actionRef = useRef();

  const columns: ProColumns[] = [
    { title: '考官ID', dataIndex: 'id', key: 'id' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '账号', dataIndex: 'account', key: 'account' },
    { title: '评分权重', dataIndex: 'weight', key: 'weight' },
    {
      title: '启用状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (text) => (text === 1 ? '启用' : '禁用'),
    },
    { title: '考核年度', dataIndex: 'year', key: 'year' },
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
              await request(`/api/judge/${record.id}`, { method: 'DELETE' });
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

  return (
    <div>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={async () => {
          const data = await request('/api/judge');
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
              const response = await request('/api/judge/export', {
                method: 'POST',
                data: { ids },
                responseType: 'blob',
              });
              const url = window.URL.createObjectURL(new Blob([response]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'judges.csv');
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
                await request('/api/judge/import', {
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
        title={modalType === 'add' ? '新增考官' : '编辑考官'}
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
              await request('/api/judge', {
                method: 'POST',
                data: values,
              });
              message.success('新增成功');
            } else {
              await request(`/api/judge/${currentRecord.id}`, {
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
          <Form.Item name="account" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="weight"
            label="评分权重"
            initialValue={0.3}
            rules={[{ required: true, message: '请输入评分权重' }]}
          >
            <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" initialValue={0}>
            <Select>
              <Select.Option value={0}>禁用</Select.Option>
              <Select.Option value={1}>启用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="year" label="考核年度" rules={[{ required: true, message: '请输入考核年度' }]}>
            <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Judge;