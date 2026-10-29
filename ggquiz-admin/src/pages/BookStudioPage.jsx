import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Form, Input, Modal, Space, Table, Typography, Upload, message } from "antd";
import { ArrowLeftOutlined, UploadOutlined } from "@ant-design/icons";
import api, { getApiErrorMessage, uploadAdminFile } from "../api/client";
import FlipbookReader from "../components/FlipbookReader";

export default function BookStudioPage() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [pending, setPending] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    try {
      const { data } = await api.get(`/admin/books/${id}`);
      setBook(data.book);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveHotspot() {
    const values = await form.validateFields();
    try {
      await api.post(`/admin/books/${id}/hotspots`, {
        page: pending.page,
        x: pending.x,
        y: pending.y,
        audioUrl: values.audioUrl,
        label: values.label,
      });
      message.success("Đã gắn icon loa");
      setPending(null);
      form.resetFields();
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  if (!book) return <Card loading className="page-card" />;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link to={`/curriculum?series=${book.seriesId || ""}&grade=${book.gradeId || ""}`}>
          <Button icon={<ArrowLeftOutlined />}>Quay lại bộ sách</Button>
        </Link>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {book.title}
        </Typography.Title>
      </Space>
      <Typography.Paragraph type="secondary">
        Bấm vào trang sách để đặt icon loa, rồi tải file MP3. Chuột phải vào loa để xóa.
      </Typography.Paragraph>
      <Card className="page-card" style={{ marginBottom: 16 }}>
        <FlipbookReader
          pdfUrl={book.pdfUrl}
          hotspots={book.hotspots || []}
          mappingMode
          onPlaceHotspot={setPending}
          onDeleteHotspot={async (item) => {
            await api.delete(`/admin/hotspots/${item.id}`);
            load();
          }}
        />
      </Card>
      <Card className="page-card" title="Bản đồ âm thanh">
        <Table
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: true }}
          dataSource={book.hotspots || []}
          columns={[
            { title: "Trang", dataIndex: "page", width: 80 },
            { title: "Nhãn", dataIndex: "label" },
            { title: "Tọa độ", render: (_, row) => `${Math.round(row.x)}%, ${Math.round(row.y)}%` },
            {
              title: "",
              width: 100,
              render: (_, row) => (
                <Button danger size="small" onClick={() => api.delete(`/admin/hotspots/${row.id}`).then(load)}>
                  Xóa
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(pending)}
        title={`Gắn loa ở trang ${pending?.page || ""}`}
        onCancel={() => setPending(null)}
        onOk={saveHotspot}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="label" label="Nhãn">
            <Input placeholder="Listen and repeat" />
          </Form.Item>
          <Form.Item name="audioUrl" label="File MP3" rules={[{ required: true, message: "Tải file audio" }]}>
            <Input />
          </Form.Item>
          <Upload
            accept="audio/mpeg,audio/mp3,audio/*"
            showUploadList={false}
            beforeUpload={async (file) => {
              const data = await uploadAdminFile("audio", file);
              form.setFieldValue("audioUrl", data.url);
              message.success("Đã tải MP3");
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>Tải file MP3</Button>
          </Upload>
        </Form>
      </Modal>
    </div>
  );
}
