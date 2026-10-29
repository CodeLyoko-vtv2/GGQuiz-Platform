import { useId } from "react";

/** Icon robot AI nhiều màu — style gần Sider */
function AiRobotIcon({ className = "h-5 w-5", size }) {
  const gid = useId().replace(/:/g, "");
  const dim = size || undefined;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={dim}
      height={dim}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill={`url(#${gid}-bg)`} />
      <rect x="12" y="16" width="24" height="20" rx="8" fill="#fff" />
      <circle cx="19" cy="25" r="3.2" fill="#6366F1" />
      <circle cx="29" cy="25" r="3.2" fill="#EC4899" />
      <circle cx="20" cy="24" r="1.1" fill="#fff" />
      <circle cx="30" cy="24" r="1.1" fill="#fff" />
      <path
        d="M20 31c1.2 1.4 2.6 2.1 4 2.1s2.8-.7 4-2.1"
        stroke="#A855F7"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="22" y="8" width="4" height="6" rx="2" fill="#22D3EE" />
      <circle cx="24" cy="7" r="2.2" fill="#FBBF24" />
      <rect x="8" y="22" width="3.5" height="8" rx="1.75" fill="#34D399" />
      <rect x="36.5" y="22" width="3.5" height="8" rx="1.75" fill="#F472B6" />
      <defs>
        <linearGradient
          id={`${gid}-bg`}
          x1="8"
          y1="6"
          x2="40"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#818CF8" />
          <stop offset="0.45" stopColor="#A855F7" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default AiRobotIcon;
