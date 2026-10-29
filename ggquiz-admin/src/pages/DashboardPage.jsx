import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Typography } from "antd";
import {
  BookOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import api, { getApiErrorMessage } from "../api/client";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/stats")
      .then(({ data: payload }) => setData(payload))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: "Tổng số User", value: data?.cards?.users || 0, icon: <UserOutlined />, color: "#2563eb" },
    { title: "Tổng số Đề thi", value: data?.cards?.exams || 0, icon: <FileTextOutlined />, color: "#7c3aed" },
    { title: "Tổng số Flashcard", value: data?.cards?.flashcards || 0, icon: <BookOutlined />, color: "#0891b2" },
    { title: "Lượt thi hôm nay", value: data?.cards?.attemptsToday || 0, icon: <ThunderboltOutlined />, color: "#d97706" },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Tổng quan hệ thống
      </Typography.Title>
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {cards.map((item) => (
          <Card key={item.title} className="stat-card page-card" loading={loading}>
            <Statistic
              title={item.title}
              value={item.value}
              prefix={<span style={{ color: item.color }}>{item.icon}</span>}
            />
          </Card>
        ))}
      </div>

      <Card className="page-card" title="Lượt thi 7 ngày gần nhất" style={{ marginBottom: 16 }}>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.weeklyAttempts || []}>
              <defs>
                <linearGradient id="attempts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(value) => dayjs(value).format("DD/MM")} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(value) => dayjs(value).format("DD/MM/YYYY")} />
              <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#attempts)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Row gutter={16}>
        <Col xs={24} xl={12}>
          <Card className="page-card" title="Top đề thi được thi nhiều nhất">
            <Table
              rowKey="id"
              loading={loading}
              pagination={false}
              dataSource={data?.topExams || []}
              columns={[
                { title: "Đề thi", dataIndex: "title" },
                { title: "Khối", dataIndex: "grade", width: 110 },
                {
                  title: "Tác giả",
                  dataIndex: ["user", "name"],
                  width: 140,
                },
                {
                  title: "Lượt thi",
                  dataIndex: "attemptCount",
                  width: 100,
                  render: (value) => <Tag color="blue">{value}</Tag>,
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="page-card" title="Top người dùng tích cực nhất">
            <Table
              rowKey="id"
              loading={loading}
              pagination={false}
              dataSource={data?.topUsers || []}
              columns={[
                { title: "Người dùng", dataIndex: "name" },
                { title: "Email", dataIndex: "email" },
                {
                  title: "Điểm hoạt động",
                  dataIndex: "activity",
                  width: 140,
                  render: (value) => <Tag color="geekblue">{value}</Tag>,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
