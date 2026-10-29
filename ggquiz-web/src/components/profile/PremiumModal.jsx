import { useEffect, useState } from "react";
import { Check, Copy, Crown, Loader2, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";
import { useUserSettings } from "../../context/UserSettingsContext";

const PRICE_LABEL = "99.000đ/tháng";

const FREE_PERKS = [
  { ok: true, text: "Thẻ ghi nhớ và làm đề cơ bản" },
  { ok: true, text: "Soạn giáo án bản nháp" },
  { ok: false, text: "Trợ thủ AI giới hạn lượt hỏi" },
  { ok: false, text: "Lời giải chi tiết bị khóa" },
  { ok: false, text: "Phòng thi thật bị giới hạn" },
];

const PREMIUM_PERKS = [
  { ok: true, text: "Mở khóa Trợ thủ AI không giới hạn" },
  { ok: true, text: "Xem lời giải chi tiết đầy đủ" },
  { ok: true, text: "Tạo phòng thi thật không giới hạn" },
  { ok: true, text: "Xuất giáo án PDF và xem bản trình chiếu" },
  { ok: true, text: "Mở khóa Ngoại ngữ chuyên ngành (roadmap + AI roleplay)" },
  { ok: true, text: "Ưu tiên hỗ trợ và huy hiệu Premium" },
];

function CopyRow({ label, value }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label.toLowerCase()}`);
    } catch {
      toast.error("Không sao chép được. Hãy chọn và copy thủ công.");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="truncate font-mono text-sm font-bold text-slate-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </button>
    </div>
  );
}

function PremiumModal() {
  const { modal, closeModal, user, isPremium, upgradePending, applyUser } = useUserSettings();
  const [step, setStep] = useState("pricing");
  const [busy, setBusy] = useState(false);
  const [billing, setBilling] = useState(null);

  const pending = Boolean(upgradePending || billing?.upgradePending);
  const premium = Boolean(isPremium || billing?.plan === "premium");

  useEffect(() => {
    if (modal !== "premium") return undefined;
    let alive = true;
    api
      .get("/billing/status")
      .then(({ data }) => {
        if (!alive) return;
        setBilling(data);
        if (data.plan === "premium") setStep("done");
        else if (data.upgradePending) setStep("pending");
        else setStep("pricing");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [modal]);

  if (modal !== "premium") return null;

  const transferCode = billing?.transferCode || (user?.id ? `GGQUIZ ${user.id}` : "GGQUIZ");
  const bank = billing?.bank || {
    accountName: "NGUYEN VU HUY",
    accountNumber: "56210005445523",
    bankName: "BIDV - CN Quảng Nam",
  };

  const confirmTransfer = async () => {
    setBusy(true);
    try {
      await api.post("/billing/upgrade-request");
      const { data } = await api.get("/users/me");
      if (data.user) applyUser(data.user);
      setBilling((prev) => ({ ...prev, upgradePending: true }));
      setStep("pending");
      toast.success("Đã gửi yêu cầu. Chúng tôi sẽ kích hoạt sau khi nhận tiền.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      if (err.response?.status === 409) setStep("pending");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 px-4" onClick={closeModal}>
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 px-6 py-5 text-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1 text-xs font-black tracking-wide uppercase">
                <Crown className="h-4 w-4" />
                GGQuiz Premium
              </p>
              <h2 className="mt-1 text-2xl font-black">Học sâu hơn, dạy nhanh hơn</h2>
              <p className="mt-1 text-sm font-medium text-slate-800/80">
                Thanh toán chuyển khoản VietQR · Kích hoạt thủ công trong vài phút
              </p>
            </div>
            <button type="button" onClick={closeModal} className="rounded-full bg-white/30 p-2 hover:bg-white/50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === "pricing" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-3xl border border-slate-200 p-5">
                  <Sparkles className="h-6 w-6 text-slate-400" />
                  <h3 className="mt-3 text-lg font-extrabold text-slate-900">Free</h3>
                  <p className="text-3xl font-black text-slate-900">
                    0đ<span className="text-sm font-semibold text-slate-400"> /mãi mãi</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {FREE_PERKS.map((item) => (
                      <li key={item.text} className={`flex gap-2 ${item.ok ? "text-slate-700" : "text-slate-400"}`}>
                        {item.ok ? <Check className="mt-0.5 h-4 w-4 text-emerald-500" /> : <Lock className="mt-0.5 h-4 w-4" />}
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
                  <Crown className="h-6 w-6 text-amber-500" />
                  <h3 className="mt-3 text-lg font-extrabold text-slate-900">Premium</h3>
                  <p className="text-3xl font-black text-slate-900">
                    99.000đ<span className="text-sm font-semibold text-slate-400"> /tháng</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {PREMIUM_PERKS.map((item) => (
                      <li key={item.text} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={pending || premium}
                    onClick={() => setStep("checkout")}
                    className="mt-5 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {premium ? "Bạn đang dùng Premium" : pending ? "Đang chờ đối chiếu" : `Nâng cấp ngay - ${PRICE_LABEL}`}
                  </button>
                </article>
              </div>
            </>
          ) : null}

          {step === "checkout" ? (
            <div className="mx-auto max-w-lg">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Chuyển khoản đúng nội dung để admin đối chiếu chính xác
              </div>
              <div className="rounded-3xl border border-slate-200 bg-[#fafafa] p-5">
                <img
                  src="/vietqr.png"
                  alt="VietQR BIDV NGUYEN VU HUY"
                  className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-3 shadow-sm"
                />
                <div className="mt-4 space-y-2">
                  <CopyRow label="Chủ tài khoản" value={bank.accountName} />
                  <CopyRow label="Số tài khoản" value={bank.accountNumber} />
                  <CopyRow label="Ngân hàng" value={bank.bankName} />
                  <CopyRow label="Nội dung chuyển khoản" value={transferCode} />
                </div>
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                  Số tiền: <strong>99.000đ</strong>. Bắt buộc ghi đúng nội dung{" "}
                  <strong>{transferCode}</strong> để hệ thống nhận diện giao dịch của bạn.
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("pricing")}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmTransfer}
                  className="flex-[2] rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? "Đang gửi..." : "Tôi đã chuyển khoản"}
                </button>
              </div>
            </div>
          ) : null}

          {step === "pending" ? (
            <div className="mx-auto max-w-lg py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-900">Yêu cầu đang được xử lý</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Chúng tôi sẽ kích hoạt Premium ngay sau khi nhận được thanh toán. Nút nâng cấp đã tạm khóa để tránh gửi trùng yêu cầu.
              </p>
              <p className="mt-3 font-mono text-sm font-bold text-slate-900">Nội dung: {transferCode}</p>
              <button
                type="button"
                onClick={closeModal}
                className="mt-6 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
              >
                Đã hiểu
              </button>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="mx-auto max-w-lg py-6 text-center">
              <Crown className="mx-auto h-10 w-10 text-amber-500" />
              <h3 className="mt-3 text-xl font-black text-slate-900">Bạn đang dùng Premium</h3>
              <p className="mt-2 text-sm text-slate-600">
                Toàn bộ Trợ thủ AI, lời giải chi tiết và phòng thi thật đã được mở khóa.
              </p>
              {billing?.premiumUntil ? (
                <p className="mt-2 text-xs text-slate-400">
                  Hiệu lực đến {new Date(billing.premiumUntil).toLocaleDateString("vi-VN")}
                </p>
              ) : null}
              <button
                type="button"
                onClick={closeModal}
                className="mt-6 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
              >
                Tiếp tục học
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PremiumModal;
