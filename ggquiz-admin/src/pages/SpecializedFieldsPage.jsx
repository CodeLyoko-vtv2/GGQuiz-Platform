import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, NodeIndexOutlined, PlusOutlined } from "@ant-design/icons";
import api, { getApiErrorMessage } from "../api/client";

export default function SpecializedFieldsPage() {
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/specialized/fields");
      setFields(data.fields || []);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    const values = await form.validateFields();
    try {
      if (modal?.record) await api.put(`/admin/specialized/fields/${modal.record.id}`, values);
      else await api.post("/admin/specialized/fields", values);
      message.success("Đã lưu lĩnh vực");
      setModal(null);
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  async function remove(id) {
    try {
      await api.delete(`/admin/specialized/fields/${id}`);
      message.success("Đã xóa lĩnh vực");
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Ngoại ngữ chuyên ngành
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Quản lý lĩnh vực và xây dựng roadmap bài học. Bật “Yêu cầu Premium” ở từng node.
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            form.setFieldsValue({ published: true, sortOrder: fields.length + 1, accent: "amber", icon: "Languages" });
            setModal({ record: null });
          }}
        >
          Thêm lĩnh vực
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={fields}
        pagination={false}
        columns={[
          { title: "Thứ tự", dataIndex: "sortOrder", width: 90 },
          { title: "Lĩnh vực", dataIndex: "name" },
          { title: "Slug", dataIndex: "slug", width: 140 },
          { title: "Bài học", dataIndex: "lessonCount", width: 110 },
          {
            title: "Trạng thái",
            dataIndex: "published",
            width: 130,
            render: (value) => <Tag color={value ? "green" : "default"}>{value ? "Hiển thị" : "Ẩn"}</Tag>,
          },
          {
            title: "",
            width: 280,
            render: (_, record) => (
              <Space>
                <Button icon={<NodeIndexOutlined />} onClick={() => navigate(`/specialized/${record.id}`)}>
                  Roadmap
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    form.setFieldsValue(record);
                    setModal({ record });
                  }}
                />
                <Popconfirm title="Xóa lĩnh vực và toàn bộ bài học?" onConfirm={() => remove(record.id)}>
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={Boolean(modal)}
        title={modal?.record ? "Sửa lĩnh vực" : "Thêm lĩnh vực"}
        onCancel={() => setModal(null)}
        onOk={submit}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input placeholder="Tiếng Anh Y khoa" />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input placeholder="medical" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ width: "100%" }} size="large">
            <Form.Item name="icon" label="Icon">
              <Input placeholder="Stethoscope" />
            </Form.Item>
            <Form.Item name="accent" label="Màu">
              <Select
                style={{ width: 140 }}
                options={["rose", "amber", "cyan", "violet", "emerald"].map((value) => ({ value, label: value }))}
              />
            </Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="published" label="Hiển thị" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
