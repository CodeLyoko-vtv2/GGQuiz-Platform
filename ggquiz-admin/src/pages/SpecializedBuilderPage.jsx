import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import api, { getApiErrorMessage } from "../api/client";

const emptyVocab = [{ term: "", meaning: "", example: "" }];

export default function SpecializedBuilderPage() {
  const { id } = useParams();
  const [field, setField] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/specialized/fields/${id}`);
      setField(data.field);
      setLessons(data.lessons || []);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function openCreate() {
    form.resetFields();
    form.setFieldsValue({
      sortOrder: lessons.length + 1,
      requiresPremium: lessons.length >= 3,
      icon: "BookOpen",
      vocab: emptyVocab,
    });
    setModal({ record: null });
  }

  async function submit() {
    const values = await form.validateFields();
    const payload = {
      ...values,
      fieldId: Number(id),
      vocab: (values.vocab || []).filter((item) => item?.term),
    };
    try {
      if (modal?.record) await api.put(`/admin/specialized/lessons/${modal.record.id}`, payload);
      else await api.post("/admin/specialized/lessons", payload);
      message.success("Đã lưu bài học");
      setModal(null);
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  async function remove(lessonId) {
    try {
      await api.delete(`/admin/specialized/lessons/${lessonId}`);
      message.success("Đã xóa bài học");
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/specialized">
          <Button icon={<ArrowLeftOutlined />}>Lĩnh vực</Button>
        </Link>
      </Space>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Roadmap · {field?.name || "Lĩnh vực"}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Sắp xếp node theo thứ tự. User phải hoàn thành bài trước mới mở bài sau. Bật Premium để khóa node với user Free.
      </Typography.Paragraph>

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm bài học
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={lessons}
          pagination={false}
          columns={[
            { title: "#", dataIndex: "sortOrder", width: 70 },
            { title: "Bài học", dataIndex: "title" },
            { title: "Phần", dataIndex: "section" },
            {
              title: "Premium",
              dataIndex: "requiresPremium",
              width: 120,
              render: (value) => <Tag color={value ? "gold" : "green"}>{value ? "Yêu cầu Premium" : "Miễn phí"}</Tag>,
            },
            {
              title: "Từ vựng",
              width: 100,
              render: (_, record) => record.vocab?.length || 0,
            },
            {
              title: "",
              width: 140,
              render: (_, record) => (
                <Space>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => {
                      form.setFieldsValue({
                        ...record,
                        vocab: record.vocab?.length ? record.vocab : emptyVocab,
                      });
                      setModal({ record });
                    }}
                  />
                  <Popconfirm title="Xóa bài học này?" onConfirm={() => remove(record.id)}>
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(modal)}
        title={modal?.record ? "Sửa bài học" : "Thêm bài học"}
        onCancel={() => setModal(null)}
        onOk={submit}
        okText="Lưu"
        width={760}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="section" label="Nhóm / Part">
            <Input placeholder="PART 1 · First contact" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="icon" label="Icon">
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="requiresPremium" label="Yêu cầu Premium" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="scenarioTitle" label="Tình huống AI">
            <Input placeholder="Bạn là bác sĩ tiếp bệnh nhân mới" />
          </Form.Item>
          <Form.Item name="aiSystemPrompt" label="System prompt cho AI">
            <Input.TextArea rows={4} placeholder="You are a patient with stomach pain..." />
          </Form.Item>
          <Typography.Text strong>Từ vựng</Typography.Text>
          <Form.List name="vocab">
            {(rows, { add, remove: removeRow }) => (
              <div style={{ marginTop: 8 }}>
                {rows.map((row) => (
                  <Space key={row.key} align="start" style={{ display: "flex", marginBottom: 8 }} wrap>
                    <Form.Item {...row} name={[row.name, "term"]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Term" />
                    </Form.Item>
                    <Form.Item {...row} name={[row.name, "meaning"]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Nghĩa" />
                    </Form.Item>
                    <Form.Item {...row} name={[row.name, "example"]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Example" style={{ width: 220 }} />
                    </Form.Item>
                    <Button onClick={() => removeRow(row.name)}>Xóa</Button>
                  </Space>
                ))}
                <Button onClick={() => add(emptyVocab[0])}>Thêm từ</Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
