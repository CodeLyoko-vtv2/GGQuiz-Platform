import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import api, { getApiErrorMessage, mediaUrl } from "../../api/client";

export default function ExplanationDetail() {
  const { lessonId } = useParams();
  const audioRef = useRef(null);
  const [data, setData] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/curriculum/lessons/${lessonId}`)
      .then(({ data: payload }) => setData(payload))
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [lessonId]);

  const audioUrl = data?.solution?.audioUrl ? mediaUrl(data.solution.audioUrl) : "";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <Link
          to={data?.lesson?.book?.id ? `/explanations/book/${data.lesson.book.id}` : "/explanations"}
          className="text-xs font-semibold text-amber-600"
        >
          ← Mục lục
        </Link>
        <p className="mt-3 text-xs uppercase tracking-wider text-slate-400">{data?.lesson?.unit?.title}</p>
        <div className="mt-2 space-y-1">
          {(data?.lesson?.siblings || []).map((item) => (
            <Link
              key={item.id}
              to={`/explanations/lesson/${item.id}`}
              className={`block rounded-xl px-3 py-2 text-sm ${
                item.id === Number(lessonId)
                  ? "bg-amber-100 font-semibold text-amber-800"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </aside>

      <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-sm text-slate-400">
          {data?.lesson?.book?.series?.name} · {data?.lesson?.book?.title}
        </p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
          {data?.solution?.title || data?.lesson?.title || "Lời giải"}
        </h1>
        {error ? <p className="mt-3 text-rose-500">{error}</p> : null}

        {audioUrl ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full bg-amber-500 text-white"
              onClick={() => {
                const node = audioRef.current;
                if (!node) return;
                if (node.paused) {
                  node.play();
                  setPlaying(true);
                } else {
                  node.pause();
                  setPlaying(false);
                }
              }}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <div>
              <p className="font-semibold">Nghe audio bài giải</p>
              <p className="text-xs text-slate-500">File đính kèm cùng lời giải</p>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          </div>
        ) : null}

        {data?.solution?.content ? (
          <div
            className="solution-prose mt-6 text-slate-700 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: data.solution.content }}
          />
        ) : (
          <p className="mt-6 text-slate-400">Bài này chưa có lời giải chi tiết.</p>
        )}
      </article>
    </div>
  );
}
