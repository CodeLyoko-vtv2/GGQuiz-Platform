import { ArrowLeftRight } from "lucide-react";
import LanguageSelectDropdown from "./LanguageSelectDropdown";

function LanguagePairBar({ termLang, defLang, onTermLangChange, onDefLangChange }) {
  const swapLanguages = () => {
    // Không swap nếu bên định nghĩa chưa chọn
    if (!defLang) return;
    const nextTerm = defLang;
    const nextDef = termLang === "auto" ? null : termLang;
    onTermLangChange?.(nextTerm || "auto");
    onDefLangChange?.(nextDef);
  };

  return (
    <section className="relative z-10 mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col items-stretch sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 border-b border-gray-100 sm:border-r sm:border-b-0">
          <p className="px-4 pt-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            Thuật ngữ
          </p>
          <LanguageSelectDropdown
            value={termLang}
            onChange={onTermLangChange}
            allowDetect
            placeholder="Phát hiện ngôn ngữ"
            align="left"
          />
        </div>

        <button
          type="button"
          onClick={swapLanguages}
          title="Đảo ngôn ngữ"
          aria-label="Đảo ngôn ngữ thuật ngữ và định nghĩa"
          className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 sm:mx-2"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 border-t border-gray-100 sm:border-t-0 sm:border-l">
          <p className="px-4 pt-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            Định nghĩa
          </p>
          <LanguageSelectDropdown
            value={defLang}
            onChange={onDefLangChange}
            allowDetect={false}
            placeholder="CHỌN NGÔN NGỮ"
            align="right"
          />
        </div>
      </div>
    </section>
  );
}

export default LanguagePairBar;
