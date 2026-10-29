import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Check,
  ClipboardList,
  Gamepad2,
  Layers3,
  NotebookPen,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import api, { getApiErrorMessage } from "../api/client";
import LibraryFilterDropdown from "../components/LibraryFilterDropdown";

const MATERIAL_TABS = [
  { key: "sets", label: "Thẻ ghi nhớ", itemType: "STUDY_SET" },
  { key: "exams", label: "Đề", itemType: "EXAM" },
  { key: "plans", label: "Giáo án", itemType: "LESSON_PLAN" },
];

function typeLabel(itemType) {
  if (itemType === "EXAM") return "Đề";
  if (itemType === "LESSON_PLAN") return "Giáo án";
  if (itemType === "ESPORTS_SET") return "Thuật ngữ Esports";
  return "Thẻ ghi nhớ";
}

function TypeIcon({ itemType, className = "h-5 w-5" }) {
  if (itemType === "EXAM") return <ClipboardList className={className} />;
  if (itemType === "LESSON_PLAN") return <NotebookPen className={className} />;
  if (itemType === "ESPORTS_SET") return <Gamepad2 className={className} />;
  return <Layers3 className={className} />;
}

function applyLocalFilter(items, filter) {
  if (filter === "recent") {
    return [...items]
      .filter((item) => item.lastAccessedAt)
      .sort(
        (a, b) =>
          new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
      );
  }
  if (filter === "saved") {
    return items.filter((item) => item.isSaved);
  }
  if (filter === "created") {
    return items;
  }
  return items;
}

function FolderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [materialTab, setMaterialTab] = useState("sets");
  const [filter, setFilter] = useState("all");
  const [studySets, setStudySets] = useState([]);
  const [exams, setExams] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const loadFolder = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/folders/${id}`);
      setFolder(data.folder);
      const keys = new Set(
        (data.folder.items || []).map((item) => `${item.itemType}:${item.refId}`)
      );
      setSelectedKeys(keys);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      navigate("/library");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadFolder();
  }, [loadFolder]);

  useEffect(() => {
    if (!addOpen) return undefined;
    let cancelled = false;

    const loadMaterials = async () => {
      setMaterialsLoading(true);
      try {
        if (materialTab === "sets") {
          const { data } = await api.get("/studysets/dashboard", {
            params: { filter },
          });
          if (!cancelled) setStudySets(data.studySets || []);
        } else if (materialTab === "exams" || materialTab === "plans") {
          const [examsRes, plansRes] = await Promise.all([
            api.get("/folders/exams/me"),
            api.get("/folders/lesson-plans/me"),
          ]);
          if (cancelled) return;
          setExams(examsRes.data.exams || []);
          setLessonPlans(plansRes.data.lessonPlans || []);
        }
      } catch (err) {
        if (!cancelled) toast.error(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    };

    loadMaterials();
    return () => {
      cancelled = true;
    };
  }, [addOpen, materialTab, filter]);

  const currentMaterials = useMemo(() => {
    if (materialTab === "exams") return applyLocalFilter(exams, filter);
    if (materialTab === "plans") return applyLocalFilter(lessonPlans, filter);
    return studySets;
  }, [materialTab, exams, lessonPlans, studySets, filter]);

  const currentItemType =
    MATERIAL_TABS.find((tab) => tab.key === materialTab)?.itemType || "STUDY_SET";

  const toggleSelect = async (refId) => {
    const key = `${currentItemType}:${refId}`;
    const next = new Set(selectedKeys);
    const isSelected = next.has(key);

    try {
      if (isSelected) {
        await api.delete(`/folders/${id}/items`, {
          data: { itemType: currentItemType, refId },
        });
        next.delete(key);
      } else {
        await api.post(`/folders/${id}/items`, {
          itemType: currentItemType,
          refId,
        });
        next.add(key);
      }
      setSelectedKeys(next);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await loadFolder();
      setAddOpen(false);
      toast.success("Đã cập nhật tài liệu trong thư mục");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    try {
      await api.delete(`/folders/${id}/items/${item.id}`);
      setFolder((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((entry) => entry.id !== item.id),
              itemCount: Math.max(0, (prev.itemCount || 1) - 1),
            }
          : prev
      );
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.delete(`${item.itemType}:${item.refId}`);
        return next;
      });
      toast.success("Đã xóa tài liệu khỏi thư mục");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">Đang tải thư mục...</p>
      </div>
    );
  }

  if (!folder) return null;

  const hasItems = Array.isArray(folder.items) && folder.items.length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">
              Thư mục
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">{folder.name}</h1>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Thêm tài liệu
          </button>
        </div>

        {!hasItems ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
            <h2 className="text-xl font-extrabold text-gray-900">
              Bắt đầu xây dựng thư mục của bạn
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Thêm thẻ ghi nhớ, đề hoặc giáo án để học tập hiệu quả hơn.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Layers3 className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold">Thẻ ghi nhớ</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold">Đề</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <NotebookPen className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold">Giáo án</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-bold text-purple-700 transition hover:bg-purple-100"
            >
              <Plus className="h-4 w-4" />
              Thêm tài liệu
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {folder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    item.itemType === "ESPORTS_SET"
                      ? "bg-purple-50 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <TypeIcon itemType={item.itemType} />
                </div>
                <Link to={item.href} className="min-w-0 flex-1 transition hover:opacity-80">
                  <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">
                    {typeLabel(item.itemType)}
                  </p>
                  <h3 className="mt-1 truncate text-lg font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.itemType === "STUDY_SET" || item.itemType === "ESPORTS_SET"
                      ? `${item.cardCount || 0} thuật ngữ · ${item.user?.name || "Bạn"}`
                      : item.user?.name || "Bạn"}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Xóa khỏi thư mục"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gray-900">Thêm tài liệu</h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-gray-100 px-6 pt-4">
              <div className="flex flex-wrap gap-2">
                {MATERIAL_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setMaterialTab(tab.key);
                      setFilter("all");
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      materialTab === tab.key
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 mb-4">
                <LibraryFilterDropdown value={filter} onChange={setFilter} />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {materialsLoading ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Đang tải tài liệu...
                </p>
              ) : currentMaterials.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Chưa có tài liệu trong mục này.
                </p>
              ) : (
                <div className="space-y-3">
                  {currentMaterials.map((item) => {
                    const key = `${currentItemType}:${item.id}`;
                    const selected = selectedKeys.has(key);
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            currentItemType === "ESPORTS_SET"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-white text-gray-500"
                          }`}
                        >
                          <TypeIcon itemType={currentItemType} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            {currentItemType === "STUDY_SET" ||
                            currentItemType === "ESPORTS_SET"
                              ? `${item.cardCount || 0} thuật ngữ`
                              : item.user?.name || "Bạn"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSelect(item.id)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                            selected
                              ? "border-purple-600 bg-purple-600 text-white"
                              : "border-gray-300 bg-white text-gray-600 hover:border-purple-400 hover:text-purple-700"
                          }`}
                          aria-label={selected ? "Bỏ chọn" : "Thêm vào thư mục"}
                        >
                          {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={handleComplete}
                className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-70"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FolderDetail;
