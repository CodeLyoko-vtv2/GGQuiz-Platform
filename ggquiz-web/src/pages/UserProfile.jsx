import { useEffect, useMemo, useState } from "react";
import { Crosshair, Gamepad2, Mail, Target, Trophy, User } from "lucide-react";
import api, { getApiErrorMessage, getStoredUser } from "../api/client";

function UserProfile() {
  const storedUser = useMemo(() => getStoredUser(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/users/profile/stats");
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const user = profile?.user || storedUser;
  const stats = profile?.stats;
  const initial = (user?.name || "U").trim().charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-8 py-12">
        <p className="text-center text-sm text-slate-400">Đang tải hồ sơ tuyển thủ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-8 py-12">
        <p className="text-center text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-8 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="relative overflow-hidden rounded-3xl border border-purple-500/40 bg-slate-900 p-8 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-600/20 via-cyan-500/10 to-fuchsia-500/20" />
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-[0_0_24px_rgba(139,92,246,0.6)]">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-black">{initial}</span>
              )}
              <Gamepad2 className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-slate-950 p-1.5 text-yellow-300" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold tracking-[0.25em] text-cyan-300 uppercase">
                Player Profile
              </p>
              <h1 className="mt-2 text-3xl font-black">{user?.name || "Tuyển thủ GGQuiz"}</h1>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-300">
                <Mail className="h-4 w-4 text-purple-300" />
                {user?.email || "—"}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200">
                <User className="h-3.5 w-3.5" />
                {user?.role || "STUDENT"}
              </p>
              {stats?.rank ? (
                <p className="mt-2 text-sm font-bold text-amber-300">
                  Rank {stats.rank.name} · {stats.xp} XP
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-extrabold tracking-wide text-white uppercase">
              Bảng thông số
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-purple-500/50 bg-slate-900/90 p-6 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <p className="text-xs font-bold tracking-widest text-purple-300 uppercase">
                Tổng học phần đã tạo
              </p>
              <p className="mt-3 text-4xl font-black text-white">
                {stats?.studySetCount ?? 0}
              </p>
            </article>

            <article className="rounded-2xl border border-cyan-500/50 bg-slate-900/90 p-6 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <p className="text-xs font-bold tracking-widest text-cyan-300 uppercase">
                Số trận đã tham gia
              </p>
              <p className="mt-3 text-4xl font-black text-white">
                {stats?.quizAttemptCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">Số bài luyện thi đã hoàn thành</p>
            </article>

            <article className="rounded-2xl border border-yellow-400/50 bg-slate-900/90 p-6 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
              <p className="flex items-center gap-1 text-xs font-bold tracking-widest text-yellow-300 uppercase">
                <Trophy className="h-3.5 w-3.5" />
                Độ chính xác trung bình
              </p>
              <p className="mt-3 text-4xl font-black text-white">
                {stats?.averageAccuracy ?? 0}%
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Target className="h-3 w-3" />
                Win rate · Điểm TB: {stats?.averageScore ?? 0}
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

export default UserProfile;
