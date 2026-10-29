import { useEffect, useState } from "react";

function NotificationCustomModal({ open, value, onClose, onConfirm }) {
  const [amount, setAmount] = useState(30);
  const [unit, setUnit] = useState("minutes");

  useEffect(() => {
    if (!open) return;
    setAmount(value?.amount || 30);
    setUnit(value?.unit || "minutes");
  }, [open, value]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-extrabold text-slate-900">Thông báo tùy chỉnh</h3>
        <div className="mt-4 flex items-center gap-2">
          <select
            defaultValue="notify"
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none"
          >
            <option value="notify">Thông báo</option>
          </select>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="minutes">phút</option>
            <option value="hours">giờ</option>
            <option value="days">ngày</option>
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ amount, unit })}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationCustomModal;
