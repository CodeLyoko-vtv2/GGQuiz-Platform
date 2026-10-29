import { useId } from "react";

/**
 * Mascot AI hoạt hình — states: idle | listening | thinking | happy
 */
function AiMascot({ mood = "idle", className = "", compact = false }) {
  const gid = useId().replace(/:/g, "");

  return (
    <div
      className={`ai-mascot ai-mascot--${mood} ${compact ? "ai-mascot--compact" : ""} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 160" className="h-full w-full drop-shadow-md">
        <g className="ai-mascot__antenna">
          <rect x="76" y="18" width="8" height="22" rx="4" fill="#22D3EE" />
          <circle cx="80" cy="14" r="8" fill="#FBBF24" className="ai-mascot__orb" />
        </g>

        <g className="ai-mascot__ears">
          <rect x="18" y="58" width="18" height="36" rx="9" fill="#34D399" />
          <rect x="124" y="58" width="18" height="36" rx="9" fill="#F472B6" />
        </g>

        <rect x="36" y="40" width="88" height="78" rx="28" fill={`url(#${gid}-head)`} />
        <rect x="44" y="52" width="72" height="54" rx="22" fill="#fff" opacity="0.92" />

        <g className="ai-mascot__eyes">
          <ellipse className="ai-mascot__eye" cx="64" cy="78" rx="10" ry="11" fill="#6366F1" />
          <ellipse className="ai-mascot__eye" cx="96" cy="78" rx="10" ry="11" fill="#EC4899" />
          <circle className="ai-mascot__pupil" cx="67" cy="75" r="3.2" fill="#fff" />
          <circle className="ai-mascot__pupil" cx="99" cy="75" r="3.2" fill="#fff" />
        </g>

        <path
          className="ai-mascot__mouth"
          d="M66 98c4 7 10 10 14 10s10-3 14-10"
          stroke="#A855F7"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        <g className="ai-mascot__think">
          <circle cx="128" cy="36" r="5" fill="#C4B5FD" />
          <circle cx="140" cy="24" r="3.5" fill="#DDD6FE" />
          <circle cx="148" cy="14" r="2.5" fill="#EDE9FE" />
        </g>

        <g className="ai-mascot__hearts">
          <path
            d="M28 34c0-4 3-7 7-7 2.5 0 4 1.2 5 3 1-1.8 2.5-3 5-3 4 0 7 3 7 7 0 7-12 14-12 14S28 41 28 34z"
            fill="#FB7185"
          />
          <path
            d="M118 28c0-3.2 2.4-5.6 5.6-5.6 2 0 3.2 1 4 2.4.8-1.4 2-2.4 4-2.4 3.2 0 5.6 2.4 5.6 5.6 0 5.6-9.6 11.2-9.6 11.2S118 33.6 118 28z"
            fill="#F472B6"
          />
        </g>

        <g className="ai-mascot__hand">
          <ellipse cx="134" cy="110" rx="14" ry="11" fill="#FDE68A" />
          <path
            d="M128 108c2-4 6-6 10-5"
            stroke="#A855F7"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        <defs>
          <linearGradient id={`${gid}-head`} x1="36" y1="40" x2="124" y2="118">
            <stop stopColor="#818CF8" />
            <stop offset="0.5" stopColor="#A855F7" />
            <stop offset="1" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
      {!compact ? (
        <p className="ai-mascot__caption">
          {mood === "listening"
            ? "Mình đang lắng nghe..."
            : mood === "thinking"
              ? "Đợi mình suy nghĩ chút nhé..."
              : mood === "happy"
                ? "Xong rồi! Còn gì nữa không?"
                : "Hỏi mình bất cứ điều gì nhé!"}
        </p>
      ) : null}
    </div>
  );
}

export default AiMascot;
