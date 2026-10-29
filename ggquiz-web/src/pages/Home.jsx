import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  Layers3,
  Lightbulb,
  Lock,
  Sparkles,
} from "lucide-react";
import api, { getApiErrorMessage } from "../api/client";
import { useUserSettings } from "../context/UserSettingsContext";
import { SpecializedIcon } from "./specialized/SpecializedIcons";

const FIELD_TINT = {
  rose: "from-rose-50 to-white",
  amber: "from-amber-50 to-white",
  cyan: "from-cyan-50 to-white",
  violet: "from-violet-50 to-white",
  emerald: "from-emerald-50 to-white",
};

function fieldTint(accent) {
  return FIELD_TINT[accent] || FIELD_TINT.violet;
}

function AdSpace({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center ${className}`}
    >
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">Ad Space</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">Không gian Quảng cáo</p>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const { openModal, isPremium } = useUserSettings();
  const [recents, setRecents] = useState([]);
  const [fields, setFields] = useState([]);
  const [popularSets, setPopularSets] = useState([]);
  const [popularExams, setPopularExams] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const carouselRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [recentSetsRes, recentExamsRes, fieldsRes, allSetsRes, allExamsRes, seriesRes] =
          await Promise.all([
            api.get("/studysets/dashboard", { params: { filter: "recent" } }),
            api.get("/exams", { params: { filter: "recent" } }),
            api.get("/specialized/fields"),
            api.get("/studysets/dashboard", { params: { filter: "all" } }),
            api.get("/exams", { params: { filter: "all" } }),
            api.get("/curriculum/series"),
          ]);
        if (cancelled) return;

        const sets = (recentSetsRes.data.studySets || []).map((item) => ({
          key: `set-${item.id}`,
          kind: "set",
          title: item.title,
          meta: `${item.cardCount || 0} thuật ngữ · ${item.user?.name || "Bạn"}`,
          href: `/set/${item.id}`,
          at: new Date(item.viewedAt || item.lastAccessedAt || item.createdAt || 0).getTime(),
        }));
        const exams = (recentExamsRes.data.exams || []).map((item) => ({
          key: `exam-${item.id}`,
          kind: "exam",
          title: item.title,
          meta: `${item.durationMinutes || 45} phút · ${item.user?.name || "Bạn"}`,
          href: `/exams/${item.id}`,
          at: new Date(item.viewedAt || item.lastAccessedAt || item.createdAt || 0).getTime(),
        }));
        setRecents([...sets, ...exams].sort((a, b) => b.at - a.at).slice(0, 8));
        setFields(fieldsRes.data.fields || []);
        setPopularSets((allSetsRes.data.studySets || []).slice(0, 6));
        setPopularExams(
          [...(allExamsRes.data.exams || [])]
            .sort((a, b) => (b.attemptCount || 0) + (b.saveCount || 0) - ((a.attemptCount || 0) + (a.saveCount || 0)))
            .slice(0, 6)
        );
        setSeries((seriesRes.data.series || []).slice(0, 4));
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollCarousel = (dir) => {
    carouselRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="mx-auto flex max-w-7xl gap-10 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        <section className="min-w-0 flex-1 space-y-12">
          <article className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-amber-400 px-6 py-10 text-white sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-amber-300/30 blur-2xl" />
            <div className="relative max-w-2xl">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-[0.16em] uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Signature
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Mở khóa giới hạn bản thân với Ngoại ngữ chuyên ngành
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                Học từ vựng chuyên ngành rồi bước vào tình huống thật với Roleplay AI
                (Y khoa, IT, Kinh doanh...). Nâng cấp Premium để mở toàn bộ lộ trình.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/specialized"
                  className="inline-flex items-center rounded-full border border-white/45 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                >
                  Khám phá ngay
                </Link>
                <button
                  type="button"
                  onClick={() => openModal("premium")}
                  className="inline-flex items-center rounded-full bg-white px-6 py-2.5 text-sm font-extrabold text-violet-700 shadow-sm hover:bg-amber-50"
                >
                  Nâng cấp Premium
                </button>
              </div>
            </div>
          </article>

          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-bold text-slate-900">Học tiếp</h2>
              <Link to="/library" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
                Thư viện
              </Link>
            </div>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : recents.length === 0 ? (
              <p className="rounded-2xl bg-white px-5 py-8 text-sm text-slate-500">
                Chưa có hoạt động gần đây.{" "}
                <Link to="/create-set" className="font-semibold text-violet-600">
                  Tạo học phần
                </Link>
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recents.map((item) => (
                  <Link
                    key={item.key}
                    to={item.href}
                    className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 transition hover:bg-violet-50/80"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      {item.kind === "exam" ? (
                        <ClipboardList className="h-5 w-5" />
                      ) : (
                        <Layers3 className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{item.meta}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Lộ trình chuyên ngành đề xuất</h2>
                <p className="mt-1 text-sm text-slate-500">Y khoa, IT, Kinh doanh — 3 bài đầu miễn phí</p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollCarousel(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 hover:text-violet-700"
                  aria-label="Trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 hover:text-violet-700"
                  aria-label="Sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {fields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => navigate(`/specialized/${field.slug}`)}
                  className={`relative min-w-[240px] flex-1 rounded-3xl bg-gradient-to-br p-5 text-left transition hover:-translate-y-0.5 ${fieldTint(field.accent)}`}
                >
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-amber-700 uppercase">
                    {isPremium ? <Crown className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    Premium
                  </span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-slate-800">
                    <SpecializedIcon name={field.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{field.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{field.description}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    {field.lessonCount} bài · {field.completedCount || 0} đã xong
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-bold text-slate-900">Đề thi & học phần thịnh hành</h2>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-bold tracking-wide text-slate-400 uppercase">Học phần</p>
                <div className="space-y-2">
                  {popularSets.map((item) => (
                    <Link
                      key={item.id}
                      to={`/set/${item.id}`}
                      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 transition hover:bg-violet-50/80"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {item.cardCount || 0} thuật ngữ
                        </span>
                      </span>
                      <Layers3 className="h-4 w-4 shrink-0 text-violet-400" />
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold tracking-wide text-slate-400 uppercase">Đề thi</p>
                <div className="space-y-2">
                  {popularExams.map((item) => (
                    <Link
                      key={item.id}
                      to={`/exams/${item.id}`}
                      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 transition hover:bg-violet-50/80"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {item.attemptCount || 0} lượt làm · {item.durationMinutes || 45} phút
                        </span>
                      </span>
                      <ClipboardList className="h-4 w-4 shrink-0 text-indigo-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-bold text-slate-900">Khám phá giáo trình & lời giải</h2>
              <div className="flex gap-4 text-sm font-semibold">
                <Link to="/textbooks" className="text-violet-600 hover:text-violet-700">
                  Giáo trình
                </Link>
                <Link to="/explanations" className="text-amber-600 hover:text-amber-700">
                  Lời giải
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {series.map((item) => (
                <article key={item.id} className="rounded-3xl bg-white p-5">
                  <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {item.description || "Bộ sách giáo khoa chính quy"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">{item.bookCount || 0} cuốn sách</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/textbooks/${item.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Giáo trình
                    </Link>
                    <Link
                      to={`/explanations/${item.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      Lời giải
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="lg:hidden">
            <AdSpace className="min-h-52" />
          </div>
        </section>

        <aside className="hidden w-[280px] shrink-0 self-start lg:sticky lg:top-20 lg:block">
          <AdSpace className="min-h-[min(560px,calc(100vh-6rem))]" />
        </aside>
      </div>
    </div>
  );
}

export default Home;
