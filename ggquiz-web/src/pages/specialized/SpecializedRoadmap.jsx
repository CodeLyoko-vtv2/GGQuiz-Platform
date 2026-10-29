import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronRight, Crown, Lock, Sparkles } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import { useUserSettings } from "../../context/UserSettingsContext";
import { SpecializedIcon } from "./SpecializedIcons";

function SpecializedRoadmap() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  const { openModal, isPremium } = useUserSettings();
  const [field, setField] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/specialized/fields/${fieldId}`)
      .then(({ data }) => {
        if (!alive) return;
        setField(data.field);
        setLessons(data.lessons || []);
      })
      .catch((err) => {
        if (alive) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fieldId]);

  const sections = useMemo(() => {
    const groups = [];
    lessons.forEach((lesson) => {
      const key = lesson.section || "Lộ trình";
      const last = groups[groups.length - 1];
      if (!last || last.title !== key) groups.push({ title: key, items: [lesson] });
      else last.items.push(lesson);
    });
    return groups;
  }, [lessons]);

  const openLesson = (lesson) => {
    if (lesson.state === "premium") {
      openModal("premium");
      return;
    }
    if (lesson.state === "locked") return;
    navigate(`/specialized/${fieldId}/lessons/${lesson.id}`);
  };

  return (
    <div className="spec-stars relative min-h-screen overflow-hidden text-amber-50">
      <div className="spec-stars-dust" />
      <header className="relative z-10 mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 px-4 pt-8 pb-2 text-xs font-semibold tracking-wide text-amber-100/70">
        <Link to="/specialized" className="hover:text-amber-50">
          Ngoại ngữ chuyên ngành
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="text-amber-50">{field?.name || "Lộ trình"}</span>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span>Bản đồ học tập</span>
      </header>

      <div className="relative z-10 mx-auto max-w-xl px-4 pt-6 pb-24">
        {loading ? (
          <p className="py-24 text-center text-sm text-amber-100/50">Đang mở bản đồ...</p>
        ) : error ? (
          <p className="py-24 text-center text-sm text-rose-300">{error}</p>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="mb-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-100/20" />
                <div className="text-center">
                  <p className="text-[10px] font-bold tracking-[0.28em] text-amber-100/45 uppercase">
                    {section.title.split("·")[0]?.trim()}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-amber-50/90">
                    {section.title.includes("·") ? section.title.split("·")[1].trim() : section.title}
                  </p>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-100/20" />
              </div>

              <div className="relative">
                <div className="spec-rail pointer-events-none absolute top-6 bottom-6 left-1/2 w-px -translate-x-1/2" />
                <div className="space-y-7">
                  {section.items.map((lesson, index) => {
                    const offset = index % 2 === 0 ? "-translate-x-6 sm:-translate-x-10" : "translate-x-6 sm:translate-x-10";
                    const vocabCount = Array.isArray(lesson.vocab) ? lesson.vocab.length : 0;
                    return (
                      <div key={lesson.id} className={`relative flex justify-center ${offset}`}>
                        <button
                          type="button"
                          onClick={() => openLesson(lesson)}
                          className={`spec-node spec-node--${lesson.state} group relative flex items-center gap-3 rounded-full border px-3 py-2 pr-5 text-left`}
                        >
                          <span className="spec-node-orb relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                            <SpecializedIcon name={lesson.icon} className="h-5 w-5" />
                            {lesson.state === "completed" ? (
                              <Check className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-emerald-400 p-0.5 text-emerald-950" />
                            ) : null}
                            {lesson.state === "locked" ? (
                              <Lock className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-slate-700 p-0.5 text-slate-200" />
                            ) : null}
                            {lesson.state === "premium" ? (
                              <Crown className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-amber-400 p-0.5 text-amber-950" />
                            ) : null}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">{lesson.title}</span>
                            {lesson.requiresPremium ? (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold tracking-wide text-amber-300 uppercase">
                                <Sparkles className="h-3 w-3" />
                                Premium
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {vocabCount ? (
                          <span className="absolute top-1/2 hidden -translate-y-1/2 text-[10px] font-medium text-amber-100/35 sm:block" style={{ [index % 2 === 0 ? "right" : "left"]: "calc(50% + 150px)" }}>
                            {vocabCount} từ vựng
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))
        )}

        {!isPremium && !loading ? (
          <p className="mt-8 text-center text-xs text-amber-100/40">
            3 bài đầu miễn phí. Các node vàng dành cho thành viên Premium.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default SpecializedRoadmap;
