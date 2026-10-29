import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, Layers3, Sparkles, Swords } from "lucide-react";

const features = [
  {
    title: "Flashcard lật 3D",
    description:
      "Học thuật ngữ với hiệu ứng lật thẻ 3D mượt mà — nhớ nhanh như luyện aim.",
    icon: Layers3,
    glow: "shadow-purple-500/30 border-purple-500/40",
  },
  {
    title: "Thuật ngữ Esports",
    description:
      "Kho thuật ngữ chuẩn meta cho LoL, Valorant, CS — leo rank tri thức cùng cộng đồng game thủ.",
    icon: Swords,
    glow: "shadow-cyan-500/30 border-cyan-500/40",
  },
  {
    title: "Trợ thủ AI",
    description:
      "Như Support trong MOBA: tóm tắt tài liệu và tạo bộ flashcard tự động để bạn tập trung carry.",
    icon: Bot,
    glow: "shadow-fuchsia-400/30 border-fuchsia-400/40",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-sm font-black shadow-[0_0_20px_rgba(147,51,234,0.6)]">
            GG
          </span>
          <span className="text-xl font-extrabold tracking-tight">GGQuiz</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-purple-400 hover:text-purple-200"
          >
            Đăng Nhập
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-[0_0_18px_rgba(147,51,234,0.55)] transition hover:bg-purple-500"
          >
            Tham Gia Ngay
          </Link>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden px-6 pb-20 pt-10 text-center sm:pt-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,51,234,0.28),transparent_55%)]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-xs font-bold tracking-[0.2em] text-purple-200 uppercase">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            Esports Knowledge Arena
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            GGQuiz - Đấu Trường Tri Thức{" "}
            <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              Esports
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
            Nâng trình kiến thức, leo rank thần tốc cùng hệ thống Flashcard phong cách
            game thủ
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/register"
              className="inline-flex min-w-[200px] items-center justify-center rounded-2xl bg-purple-600 px-8 py-4 text-base font-extrabold tracking-wide text-white uppercase shadow-[0_0_30px_rgba(147,51,234,0.7)] transition hover:bg-purple-500 hover:shadow-[0_0_40px_rgba(168,85,247,0.85)]"
            >
              Tham Gia Ngay
            </Link>
            <Link
              to="/login"
              className="inline-flex min-w-[200px] items-center justify-center rounded-2xl border-2 border-cyan-300/70 px-8 py-4 text-base font-extrabold tracking-wide text-cyan-100 uppercase shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:border-cyan-200 hover:bg-cyan-400/10"
            >
              Đăng Nhập
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="mx-auto max-w-6xl px-6 pb-24"
      >
        <h2 className="mb-8 text-center text-2xl font-extrabold sm:text-3xl">
          Tính năng cốt lõi
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 + index * 0.1 }}
                className={`rounded-2xl border bg-slate-900/80 p-6 shadow-lg ${feature.glow}`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-purple-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}

export default Landing;
