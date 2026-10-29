import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import ColorPicker from "../components/planner/ColorPicker";
import {
  CALENDAR_COLORS,
  defaultCalendarName,
  loadPlannerState,
  updatePlannerState,
} from "../utils/plannerStore";

function CalendarSettings() {
  const [state, setState] = useState(() => loadPlannerState());
  const [mode, setMode] = useState("edit");
  const [selectedId, setSelectedId] = useState(
    () => loadPlannerState().calendars.find((c) => c.isDefault)?.id || ""
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(CALENDAR_COLORS[0]);

  const selected = useMemo(
    () => state.calendars.find((item) => item.id === selectedId) || null,
    [state.calendars, selectedId]
  );

  useEffect(() => {
    const sync = () => setState(loadPlannerState());
    window.addEventListener("ggquiz:planner-changed", sync);
    return () => window.removeEventListener("ggquiz:planner-changed", sync);
  }, []);

  useEffect(() => {
    if (mode === "create") {
      setName("");
      setDescription("");
      setColor(CALENDAR_COLORS[state.calendars.length % CALENDAR_COLORS.length]);
      return;
    }
    if (selected) {
      setName(selected.name);
      setDescription(selected.description || "");
      setColor(selected.color);
    }
  }, [mode, selected, state.calendars.length]);

  const startCreate = () => {
    setMode("create");
    setSelectedId("");
    setName("");
    setDescription("");
    setColor(CALENDAR_COLORS[state.calendars.length % CALENDAR_COLORS.length]);
  };

  const openCalendar = (id) => {
    setMode("edit");
    setSelectedId(id);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên lịch.");
      return;
    }
    if (mode === "create") {
      const id = `cal-${Date.now()}`;
      updatePlannerState((prev) => ({
        ...prev,
        calendars: [
          ...prev.calendars,
          {
            id,
            name: name.trim(),
            description: description.trim(),
            color,
            isDefault: false,
          },
        ],
      }));
      toast.success("Đã tạo lịch.");
      setMode("edit");
      setSelectedId(id);
      return;
    }
    updatePlannerState((prev) => ({
      ...prev,
      calendars: prev.calendars.map((item) =>
        item.id === selectedId
          ? { ...item, name: name.trim(), description: description.trim(), color }
          : item
      ),
      events: prev.events.map((item) =>
        item.calendarId === selectedId ? { ...item, color } : item
      ),
    }));
    toast.success("Đã lưu lịch.");
  };

  const handleDelete = () => {
    if (!selected || selected.isDefault) return;
    const ok = window.confirm("Xóa lịch này? Sự kiện thuộc lịch sẽ chuyển về lịch mặc định.");
    if (!ok) return;
    const fallback =
      state.calendars.find((item) => item.isDefault)?.id || state.calendars[0]?.id;
    updatePlannerState((prev) => ({
      ...prev,
      calendars: prev.calendars.filter((item) => item.id !== selected.id),
      events: prev.events.map((item) =>
        item.calendarId === selected.id ? { ...item, calendarId: fallback } : item
      ),
    }));
    toast.success("Đã xóa lịch.");
    setSelectedId(fallback);
    setMode("edit");
  };

  const defaultCal = state.calendars.find((item) => item.isDefault);
  const customCals = state.calendars.filter((item) => !item.isDefault);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
        <Link
          to="/schedule"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay về
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-slate-900">Cài đặt lịch</h1>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-200 p-4 lg:w-72 lg:border-r lg:border-b-0">
          <button
            type="button"
            onClick={startCreate}
            className={`inline-flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${
              mode === "create"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Plus className="h-4 w-4" />
            Tạo lịch mới
          </button>

          <p className="mt-5 mb-2 px-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
            Lịch mặc định
          </p>
          {defaultCal ? (
            <button
              type="button"
              onClick={() => openCalendar(defaultCal.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                mode === "edit" && selectedId === defaultCal.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-sm"
                style={{ backgroundColor: defaultCal.color }}
              />
              {defaultCal.name || defaultCalendarName()}
            </button>
          ) : null}

          <p className="mt-5 mb-2 px-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
            Lịch tùy chỉnh
          </p>
          <ul className="space-y-1">
            {customCals.map((cal) => (
              <li key={cal.id}>
                <button
                  type="button"
                  onClick={() => openCalendar(cal.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium ${
                    mode === "edit" && selectedId === cal.id
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-sm"
                    style={{ backgroundColor: cal.color }}
                  />
                  {cal.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mx-auto max-w-xl">
            <div className="flex items-start gap-4">
              <ColorPicker value={color} onChange={setColor} />
              <div className="min-w-0 flex-1">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tên lịch
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={mode === "create" ? "Lịch mới" : "Tên lịch"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Mô tả
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Mô tả ngắn cho lịch này"
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {mode === "edit" && selected && !selected.isDefault ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
              ) : (
                <span className="text-xs text-slate-400">
                  {mode === "edit" && selected?.isDefault
                    ? "Lịch mặc định không thể xóa."
                    : ""}
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                {mode === "create" ? "Tạo lịch" : "Lưu"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CalendarSettings;
