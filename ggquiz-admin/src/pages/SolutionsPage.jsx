import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Empty, Space, Typography, message } from "antd";
import api, { getApiErrorMessage, mediaUrl } from "../api/client";

export default function SolutionsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const seriesId = Number(params.get("series") || 0) || null;
  const gradeId = Number(params.get("grade") || 0) || null;
  const [series, setSeries] = useState([]);
  const [grades, setGrades] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  const current = series.find((item) => item.id === seriesId);

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
        const { data } = await api.get("/admin/books", {
          params: { seriesId, ...(gradeId ? { gradeId } : {}) },
        });
        setBooks(data.books || []);
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

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Quản lý lời giải
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Chọn bộ sách → lớp → cuốn sách để soạn Unit, bài học và lời giải chi tiết.
      </Typography.Paragraph>

      {!seriesId ? (
        <div className="cover-grid">
          {series.map((item) => (
            <Card
              key={item.id}
              className="entity-card page-card"
              style={{ background: `linear-gradient(160deg, ${item.color}, #0f172a)` }}
              onClick={() => go({ series: item.id })}
            >
              <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
                {item.name}
              </Typography.Title>
              <Typography.Paragraph style={{ color: "rgba(255,255,255,.8)" }}>
                {item.description}
              </Typography.Paragraph>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="page-card" loading={loading} title={current?.name}>
          <Space wrap style={{ marginBottom: 16 }}>
            <Button onClick={() => go({})}>Tất cả bộ sách</Button>
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
                  hoverable
                  onClick={() => navigate(`/solutions/books/${item.id}`)}
                  cover={
                    <div className="book-cover" style={{ background: current?.color || "#1d4ed8" }}>
                      {item.coverUrl ? <img src={mediaUrl(item.coverUrl)} alt="" /> : item.title}
                    </div>
                  }
                >
                  <Card.Meta title={item.title} description={item.subtitle || item.grade?.name} />
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="Chưa có sách. Hãy tạo sách ở mục Giáo trình trước." />
          )}
        </Card>
      )}
    </div>
  );
}
