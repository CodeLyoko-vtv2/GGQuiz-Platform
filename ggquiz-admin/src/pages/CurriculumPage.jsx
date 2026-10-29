import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SoundOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import api, { getApiErrorMessage, mediaUrl, uploadAdminFile } from "../api/client";

export default function CurriculumPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const seriesId = Number(params.get("series") || 0) || null;
  const gradeId = Number(params.get("grade") || 0) || null;

  const [series, setSeries] = useState([]);
  const [grades, setGrades] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form] = Form.useForm();

  const currentSeries = series.find((item) => item.id === seriesId);

  async function load() {
    setLoading(true);
    try {
      const [seriesRes, gradeRes] = await Promise.all([
        api.get("/admin/series"),
        api.get("/admin/grades"),
      ]);
      setSeries(seriesRes.data.series || []);
      setGrades((gradeRes.data.grades || []).filter((item) => item.sortOrder <= 12));
      if (seriesId) {
        const bookRes = await api.get("/admin/books", {
          params: { seriesId, ...(gradeId ? { gradeId } : {}) },
        });
        setBooks(bookRes.data.books || []);
      } else setBooks([]);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [seriesId, gradeId]);

  function go(next) {
    const query = new URLSearchParams();
    if (next.series) query.set("series", String(next.series));
    if (next.grade) query.set("grade", String(next.grade));
    setParams(query);
  }

  async function submit() {
    const values = await form.validateFields();
    try {
      if (modal.type === "series") {
        const payload = { ...values };
        if (modal.record) await api.put(`/admin/series/${modal.record.id}`, payload);
        else await api.post("/admin/series", payload);
      } else {
        const payload = { ...values, seriesId };
        if (modal.record) await api.put(`/admin/books/${modal.record.id}`, payload);
        else await api.post("/admin/books", payload);
      }
      message.success("Đã lưu");
      setModal(null);
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
            Quản lý giáo trình
          </Typography.Title>
          <Breadcrumb
            style={{ marginTop: 8 }}
            items={[
              { title: <a onClick={() => go({})}>Bộ sách</a> },
              currentSeries ? { title: currentSeries.name } : null,
            ].filter(Boolean)}
          />
        </div>
        <Space>
          {seriesId ? (
            <>
              <Button icon={<ArrowLeftOutlined />} onClick={() => go({})}>
                Tất cả bộ sách
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields();
                  form.setFieldsValue({ gradeId: gradeId || undefined });
                  setModal({ type: "book" });
                }}
              >
                Thêm cuốn sách
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setModal({ type: "series" });
              }}
            >
              Thêm bộ sách
            </Button>
          )}
        </Space>
      </Space>

      {!seriesId ? (
        <div className="cover-grid">
          {series.map((item) => (
            <Card
              key={item.id}
              className="entity-card page-card"
              style={{ background: `linear-gradient(160deg, ${item.color}, #0f172a)` }}
              onClick={() => go({ series: item.id })}
              actions={[
                <EditOutlined
                  key="edit"
                  onClick={(event) => {
                    event.stopPropagation();
                    form.setFieldsValue(item);
                    setModal({ type: "series", record: item });
                  }}
                />,
                <Popconfirm key="del" title="Xóa bộ sách?" onConfirm={() => api.delete(`/admin/series/${item.id}`).then(load)}>
                  <DeleteOutlined onClick={(event) => event.stopPropagation()} />
                </Popconfirm>,
              ]}
            >
              <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
                {item.name}
              </Typography.Title>
              <Typography.Paragraph style={{ color: "rgba(255,255,255,0.8)", marginBottom: 0 }}>
                {item.description || "Chưa có mô tả"}
              </Typography.Paragraph>
              <Typography.Text style={{ color: "#bfdbfe" }}>{item.bookCount || 0} cuốn sách</Typography.Text>
            </Card>
          ))}
          {!series.length && !loading ? <Empty description="Chưa có bộ sách" /> : null}
        </div>
      ) : (
        <Card className="page-card" loading={loading}>
          <Space wrap style={{ marginBottom: 16 }}>
            <Button type={!gradeId ? "primary" : "default"} onClick={() => go({ series: seriesId })}>
              Tất cả lớp
            </Button>
            {grades.map((item) => (
              <Button
                key={item.id}
                type={gradeId === item.id ? "primary" : "default"}
                onClick={() => go({ series: seriesId, grade: item.id })}
              >
                {item.name}
              </Button>
            ))}
          </Space>
          {books.length ? (
            <div className="cover-grid">
              {books.map((item) => (
                <Card
                  key={item.id}
                  className="book-card page-card"
                  cover={
                    <div
                      className="book-cover"
                      style={{ background: currentSeries?.color || "#1d4ed8" }}
                      onClick={() => navigate(`/curriculum/books/${item.id}`)}
                    >
                      {item.coverUrl ? <img src={mediaUrl(item.coverUrl)} alt={item.title} /> : item.title}
                    </div>
                  }
                  actions={[
                    <SoundOutlined key="map" onClick={() => navigate(`/curriculum/books/${item.id}`)} />,
                    <EditOutlined
                      key="edit"
                      onClick={() => {
                        form.setFieldsValue(item);
                        setModal({ type: "book", record: item });
                      }}
                    />,
                    <Popconfirm key="del" title="Xóa cuốn sách?" onConfirm={() => api.delete(`/admin/books/${item.id}`).then(load)}>
                      <DeleteOutlined />
                    </Popconfirm>,
                  ]}
                >
                  <Card.Meta
                    title={item.title}
                    description={`${item.subtitle || item.grade?.name || "Chưa gán lớp"} · ${item.pdfUrl ? "Đã có PDF" : "Chưa có PDF"} · ${item.hotspotCount || 0} loa`}
                  />
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="Chưa có cuốn sách trong lớp này. Hãy thêm sách và tải PDF." />
          )}
        </Card>
      )}

      <Modal
        open={Boolean(modal)}
        title={modal?.record ? "Chỉnh sửa" : "Thêm mới"}
        onCancel={() => setModal(null)}
        onOk={submit}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          {modal?.type === "series" ? (
            <>
              <Form.Item name="name" label="Tên bộ sách" rules={[{ required: true }]}>
                <Input placeholder="Global Success" />
              </Form.Item>
              <Form.Item name="description" label="Mô tả ngắn">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item name="color" label="Màu thẻ">
                <Input type="color" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="title" label="Tên cuốn sách" rules={[{ required: true }]}>
                <Input placeholder="Tiếng Anh 1 - Sách học sinh" />
              </Form.Item>
              <Form.Item name="subtitle" label="Phụ đề">
                <Input placeholder="Sách học sinh / Sách bài tập" />
              </Form.Item>
              <Form.Item name="gradeId" label="Khối / Lớp" rules={[{ required: true, message: "Chọn lớp" }]}>
                <Select options={grades.map((item) => ({ value: item.id, label: item.name }))} />
              </Form.Item>
              <Form.Item name="publisher" label="Nhà xuất bản">
                <Input />
              </Form.Item>
              <Form.Item name="coverUrl" label="Ảnh bìa">
                <Input />
              </Form.Item>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={async (file) => {
                  const data = await uploadAdminFile("cover", file);
                  form.setFieldValue("coverUrl", data.url);
                  message.success("Đã tải ảnh bìa");
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Tải ảnh bìa</Button>
              </Upload>
              <Form.Item name="pdfUrl" label="File PDF gốc" style={{ marginTop: 16 }}>
                <Input placeholder="Tải PDF hoặc dán URL" />
              </Form.Item>
              <Upload
                accept="application/pdf"
                showUploadList={false}
                beforeUpload={async (file) => {
                  const data = await uploadAdminFile("pdf", file);
                  form.setFieldValue("pdfUrl", data.url);
                  message.success("Đã tải PDF");
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Tải PDF sách</Button>
              </Upload>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
