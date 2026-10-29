import {
  Activity,
  BookOpen,
  Briefcase,
  Bug,
  ClipboardList,
  Cpu,
  FileText,
  GitPullRequest,
  Handshake,
  Home,
  Languages,
  Mail,
  MessagesSquare,
  Monitor,
  Pill,
  Presentation,
  Search,
  Siren,
  Stethoscope,
  Users,
} from "lucide-react";

const ICONS = {
  Activity,
  BookOpen,
  Briefcase,
  Bug,
  ClipboardList,
  Cpu,
  FileText,
  GitPullRequest,
  Handshake,
  Home,
  Languages,
  Mail,
  MessagesSquare,
  Monitor,
  Pill,
  Presentation,
  Search,
  Siren,
  Stethoscope,
  Users,
};

export function SpecializedIcon({ name, className = "h-5 w-5" }) {
  const Icon = ICONS[name] || Languages;
  return <Icon className={className} strokeWidth={1.75} />;
}

export const ACCENTS = {
  rose: {
    glow: "rgba(251,113,133,0.45)",
    chip: "from-rose-400/25 to-rose-600/10 border-rose-300/25",
    text: "text-rose-200",
  },
  amber: {
    glow: "rgba(251,191,36,0.45)",
    chip: "from-amber-300/25 to-amber-700/10 border-amber-200/25",
    text: "text-amber-200",
  },
  cyan: {
    glow: "rgba(34,211,238,0.4)",
    chip: "from-cyan-300/25 to-cyan-700/10 border-cyan-200/25",
    text: "text-cyan-200",
  },
  violet: {
    glow: "rgba(167,139,250,0.45)",
    chip: "from-violet-400/25 to-violet-700/10 border-violet-300/25",
    text: "text-violet-200",
  },
  emerald: {
    glow: "rgba(52,211,153,0.4)",
    chip: "from-emerald-300/25 to-emerald-700/10 border-emerald-200/25",
    text: "text-emerald-200",
  },
};

export function accentOf(name) {
  return ACCENTS[name] || ACCENTS.amber;
}
