import { useEffect, useState } from "react";
import { Button, Card, Select, Space, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import api, { getApiErrorMessage } from "../api/client";

const STATUS_COLOR = { pending: "gold", resolved: "green", dismissed: "default" };

export default function ReportsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/reports", { params: { page, pageSize, status } });
      setRows(data.reports || []);
      setTotal(data.total || 0);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, pageSize, status]);

  async function act(id, action, nextStatus) {
    try {
      await api.patch(`/admin/reports/${id}`, { action, status: nextStatus });
      message.success("Đã xử lý báo cáo");
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Báo cáo & vi phạm
      </Typography.Title>
      <Card className="page-card">
        <Select
          style={{ width: 200, marginBottom: 16 }}
          value={status}
          onChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
          options={[
            { value: "pending", label: "Chờ xử lý" },
            { value: "resolved", label: "Đã xử lý" },
            { value: "dismissed", label: "Bỏ qua" },
            { value: "", label: "Tất cả" },
          ]}
        />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (next, size) => {
              setPage(next);
              setPageSize(size);
            },
          }}
          expandable={{
            expandedRowRender: (row) => (
              <div>
                <Typography.Paragraph>
                  <strong>Chi tiết:</strong> {row.detail || "Không có mô tả thêm"}
                </Typography.Paragraph>
                {row.target ? (
                  <Typography.Paragraph>
                    Đề thi: {row.target.title} {row.target.hidden ? "(đã ẩn)" : ""}
                  </Typography.Paragraph>
                ) : null}
              </div>
            ),
          }}
          columns={[
            { title: "Người báo cáo", dataIndex: ["reporter", "name"] },
            { title: "Loại", dataIndex: "targetType", width: 110 },
            { title: "Lý do", dataIndex: "reason" },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 130,
              render: (value) => <Tag color={STATUS_COLOR[value] || "default"}>{value}</Tag>,
            },
            {
              title: "Ngày",
              dataIndex: "createdAt",
              width: 140,
              render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm"),
            },
            {
              title: "Hành động",
              width: 280,
              render: (_, row) => (
                <Space wrap>
                  <Button size="small" onClick={() => act(row.id, "hide_exam", "resolved")}>
                    Ẩn đề thi
                  </Button>
                  <Button size="small" onClick={() => act(row.id, "warn_user", "resolved")}>
                    Cảnh cáo
                  </Button>
                  <Button size="small" onClick={() => act(row.id, "", "dismissed")}>
                    Bỏ qua
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
