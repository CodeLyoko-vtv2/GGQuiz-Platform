import { useEffect, useState } from "react";
import { Avatar, Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import api, { getApiErrorMessage } from "../api/client";

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [role, setRole] = useState();
  const [status, setStatus] = useState();
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", {
        params: { page, pageSize, q, role, status },
      });
      setRows(data.users || []);
      setTotal(data.total || 0);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, pageSize, role, status]);

  async function patch(id, body) {
    try {
      await api.patch(`/admin/users/${id}`, body);
      message.success("Đã cập nhật người dùng");
      load();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Quản lý người dùng
      </Typography.Title>
      <Card className="page-card">
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="Tìm tên hoặc email"
            style={{ width: 280 }}
            onSearch={() => {
              setPage(1);
              load();
            }}
            onChange={(event) => setQ(event.target.value)}
          />
          <Select
            allowClear
            placeholder="Vai trò"
            style={{ width: 160 }}
            options={[
              { value: "ADMIN", label: "Admin" },
              { value: "TEACHER", label: "Giáo viên" },
              { value: "STUDENT", label: "Học sinh" },
            ]}
            onChange={(value) => {
              setPage(1);
              setRole(value);
            }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 160 }}
            options={[
              { value: "active", label: "Hoạt động" },
              { value: "banned", label: "Đã khóa" },
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
            showSizeChanger: true,
            showTotal: (count) => `${count} người dùng`,
            onChange: (next, size) => {
              setPage(next);
              setPageSize(size);
            },
          }}
          columns={[
            {
              title: "Người dùng",
              render: (_, row) => (
                <Space>
                  <Avatar src={row.avatar || undefined}>{row.name?.[0]}</Avatar>
                  <div>
                    <div>{row.name}</div>
                    <Typography.Text type="secondary">{row.email}</Typography.Text>
                  </div>
                </Space>
              ),
            },
            {
              title: "Role",
              dataIndex: "role",
              width: 180,
              render: (value, row) => (
                <Select
                  value={value}
                  style={{ width: 140 }}
                  options={[
                    { value: "ADMIN", label: "Admin" },
                    { value: "TEACHER", label: "Giáo viên" },
                    { value: "STUDENT", label: "Học sinh" },
                  ]}
                  onChange={(roleValue) => patch(row.id, { role: roleValue })}
                />
              ),
            },
            {
              title: "Ngày đăng ký",
              dataIndex: "createdAt",
              width: 160,
              render: (value) => dayjs(value).format("DD/MM/YYYY"),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 120,
              render: (value) => (
                <Tag color={value === "banned" ? "red" : "green"}>
                  {value === "banned" ? "Đã khóa" : "Hoạt động"}
                </Tag>
              ),
            },
            {
              title: "",
              width: 130,
              render: (_, row) => (
                <Button
                  danger={row.status !== "banned"}
                  onClick={() =>
                    patch(row.id, { status: row.status === "banned" ? "active" : "banned" })
                  }
                >
                  {row.status === "banned" ? "Mở khóa" : "Khóa"}
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
