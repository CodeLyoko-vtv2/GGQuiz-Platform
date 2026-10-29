import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import api, { getApiErrorMessage, uploadAdminFile } from "../api/client";
import RichEditor from "../components/RichEditor";

export default function SolutionsBookPage() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [tree, setTree] = useState(null);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [solution, setSolution] = useState(null);
  const [form] = Form.useForm();
  const [unitForm] = Form.useForm();
  const [unitModal, setUnitModal] = useState(null);

  async function loadTree() {
    const [{ data: bookRes }, { data: treeRes }] = await Promise.all([
      api.get(`/admin/books/${id}`),
      api.get(`/admin/books/${id}/tree`),
    ]);
    setBook(bookRes.book);
    setTree(treeRes.book);
    if (bookRes.book?.seriesId) {
      const { data } = await api.get("/admin/books", { params: { seriesId: bookRes.book.seriesId } });
      setSourceOptions((data.books || []).filter((item) => item.id !== Number(id)));
    }
  }

  useEffect(() => {
    loadTree().catch((error) => message.error(getApiErrorMessage(error)));
  }, [id]);

  async function openLesson(lesson) {
    setSelectedLesson(lesson);
    try {
      const { data } = await api.get("/admin/solutions", { params: { lessonId: lesson.id, pageSize: 1 } });
      const row = data.solutions?.[0];
      if (row) {
        const detail = await api.get(`/admin/solutions/${row.id}`);
        setSolution(detail.data.solution);
        form.setFieldsValue({
          title: detail.data.solution.title,
          content: detail.data.solution.content,
          audioUrl: detail.data.solution.audioUrl,
        });
      } else {
        setSolution(null);
        form.setFieldsValue({ title: `Lời giải: ${lesson.title}`, content: "", audioUrl: "" });
      }
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  async function saveSolution() {
    const values = await form.validateFields();
    try {
      const { data } = await api.post(`/admin/lessons/${selectedLesson.id}/solution`, values);
      setSolution(data.solution);
      message.success("Đã lưu lời giải");
      loadTree();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  async function saveUnit() {
    const values = await unitForm.validateFields();
    try {
      if (unitModal.type === "unit") {
        if (unitModal.record) await api.put(`/admin/chapters/${unitModal.record.id}`, values);
        else await api.post("/admin/chapters", { ...values, bookId: Number(id) });
      } else {
        if (unitModal.record) await api.put(`/admin/lessons/${unitModal.record.id}`, values);
        else await api.post("/admin/lessons", { ...values, chapterId: unitModal.chapterId });
      }
      setUnitModal(null);
      loadTree();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link to={`/solutions?series=${book?.seriesId || ""}`}>
          <Button icon={<ArrowLeftOutlined />}>Bộ lời giải</Button>
        </Link>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {book?.title || "Mục lục lời giải"}
        </Typography.Title>
      </Space>

      <Card className="page-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Typography.Text>Liên kết sách gốc (Giáo trình):</Typography.Text>
          <Select
            allowClear
            placeholder="Chọn cuốn sách PDF"
            style={{ minWidth: 280 }}
            value={book?.sourceBookId || undefined}
            options={sourceOptions.map((item) => ({ value: item.id, label: item.title }))}
            onChange={async (sourceBookId) => {
              await api.put(`/admin/books/${id}`, { sourceBookId: sourceBookId || null });
              loadTree();
            }}
          />
          {book?.sourceBookId ? (
            <Link to={`/curriculum/books/${book.sourceBookId}`}>Mở sách gốc</Link>
          ) : null}
          <Button icon={<PlusOutlined />} onClick={() => { unitForm.resetFields(); setUnitModal({ type: "unit" }); }}>
            Thêm Unit
          </Button>
        </Space>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 16 }}>
        <Card className="page-card" title="Mục lục" size="small">
          {tree?.chapters?.length ? (
            <Collapse
              accordion
              items={tree.chapters.map((unit) => ({
                key: String(unit.id),
                label: unit.title,
                extra: (
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      unitForm.resetFields();
                      setUnitModal({ type: "lesson", chapterId: unit.id });
                    }}
                  >
                    + Bài
                  </Button>
                ),
                children: (
                  <div>
                    {(unit.lessons || []).map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => openLesson(lesson)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          marginBottom: 6,
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          background: selectedLesson?.id === lesson.id ? "#eff6ff" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {lesson.title}
                        {lesson.solutionCount ? " · đã có lời giải" : ""}
                      </button>
                    ))}
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="Chưa có Unit. Hãy thêm Unit 1, Unit 2..." />
          )}
        </Card>

        <Card className="page-card" title={selectedLesson ? selectedLesson.title : "Chọn một bài học"}>
          {selectedLesson ? (
            <Form form={form} layout="vertical">
              <Form.Item name="title" label="Tiêu đề lời giải" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="content" label="Nội dung">
                <RichEditor />
              </Form.Item>
              <Form.Item name="audioUrl" label="File âm thanh kèm lời giải">
                <Input placeholder="Tải MP3 hoặc dán URL" />
              </Form.Item>
              <Upload
                accept="audio/*"
                showUploadList={false}
                beforeUpload={async (file) => {
                  const data = await uploadAdminFile("audio", file);
                  form.setFieldValue("audioUrl", data.url);
                  message.success("Đã tải audio");
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Tải lên file âm thanh</Button>
              </Upload>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={saveSolution}>
                  {solution ? "Cập nhật lời giải" : "Lưu lời giải"}
                </Button>
              </div>
            </Form>
          ) : (
            <Empty description="Bấm một bài ở mục lục bên trái để soạn, không cần tải lại trang." />
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(unitModal)}
        title={unitModal?.type === "unit" ? "Thêm Unit / Chương" : "Thêm bài học"}
        onCancel={() => setUnitModal(null)}
        onOk={saveUnit}
      >
        <Form form={unitForm} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input placeholder={unitModal?.type === "unit" ? "Unit 1: Local community" : "A Closer Look 1"} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
