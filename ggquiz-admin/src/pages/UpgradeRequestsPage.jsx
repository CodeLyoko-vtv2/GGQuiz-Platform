import { useEffect, useState } from "react";
import { Button, Card, Select, Space, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import api, { getApiErrorMessage } from "../api/client";

const STATUS = {
  pending: { color: "gold", label: "Chờ duyệt" },
  approved: { color: "green", label: "Đã duyệt" },
  rejected: { color: "red", label: "Từ chối" },
};

export default function UpgradeRequestsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState();
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/upgrade-requests", {
        params: { page, pageSize, status },
      });
      setRows(data.requests || []);
      setTotal(data.total || 0);
      setPendingCount(data.pendingCount || 0);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, pageSize, status]);

  async function act(id, action) {
    setActing(`${id}-${action}`);
    try {
      await api.post(`/admin/upgrade-requests/${id}/${action}`, {});
      message.success(action === "approve" ? "Đã kích hoạt Premium" : "Đã từ chối yêu cầu");
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Quản lý Nâng cấp
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Đối chiếu nội dung chuyển khoản trên app ngân hàng với mã bên dưới, rồi phê duyệt để kích hoạt Premium.
        {pendingCount ? ` Đang có ${pendingCount} yêu cầu chờ xử lý.` : ""}
      </Typography.Paragraph>
      <Card className="page-card">
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 180 }}
            options={[
              { value: "pending", label: "Chờ duyệt" },
              { value: "approved", label: "Đã duyệt" },
              { value: "rejected", label: "Từ chối" },
            ]}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (next, size) => {
              setPage(next);
              setPageSize(size);
            },
          }}
          columns={[
            {
              title: "Người dùng",
              render: (_, row) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{row.user?.name || "—"}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{row.user?.email}</div>
                </div>
              ),
            },
            {
              title: "Nội dung CK",
              dataIndex: "transferCode",
              render: (value) => <Typography.Text copyable code>{value}</Typography.Text>,
            },
            {
              title: "Số tiền",
              dataIndex: "amount",
              render: (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`,
            },
            {
              title: "Thời gian gửi",
              dataIndex: "createdAt",
              render: (value) => dayjs(value).format("HH:mm DD/MM/YYYY"),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              render: (value) => {
                const meta = STATUS[value] || STATUS.pending;
                return <Tag color={meta.color}>{meta.label}</Tag>;
              },
            },
            {
              title: "Hành động",
              render: (_, row) =>
                row.status === "pending" ? (
                  <Space>
                    <Button
                      type="primary"
                      loading={acting === `${row.id}-approve`}
                      onClick={() => act(row.id, "approve")}
                    >
                      Phê duyệt
                    </Button>
                    <Button
                      danger
                      loading={acting === `${row.id}-reject`}
                      onClick={() => act(row.id, "reject")}
                    >
                      Từ chối
                    </Button>
                  </Space>
                ) : (
                  <Typography.Text type="secondary">Đã xử lý</Typography.Text>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
