export const DEFAULT_PRIVACY = {
  profilePublic: true,
  showOnLeaderboard: true,
  hideEmail: true,
  allowFriendRequests: true,
};

export const DEFAULT_AVATARS = [
  { id: "jett", name: "Jett", game: "Valorant", seed: "Jett-GG" },
  { id: "phoenix", name: "Phoenix", game: "Valorant", seed: "Phoenix-GG" },
  { id: "sage", name: "Sage", game: "Valorant", seed: "Sage-GG" },
  { id: "omen", name: "Omen", game: "Valorant", seed: "Omen-GG" },
  { id: "reyna", name: "Reyna", game: "Valorant", seed: "Reyna-GG" },
  { id: "yasuo", name: "Yasuo", game: "LoL", seed: "Yasuo-GG" },
  { id: "ahri", name: "Ahri", game: "LoL", seed: "Ahri-GG" },
  { id: "jinx", name: "Jinx", game: "LoL", seed: "Jinx-GG" },
  { id: "ct", name: "CT", game: "CS2", seed: "Counter-GG" },
  { id: "ghost", name: "Ghost", game: "CS2", seed: "Ghost-GG" },
  { id: "invoker", name: "Invoker", game: "DOTA 2", seed: "Invoker-GG" },
  { id: "pudge", name: "Pudge", game: "DOTA 2", seed: "Pudge-GG" },
].map((item) => ({
  ...item,
  src: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(item.seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
}));

export const WALLPAPERS = [
  {
    id: "lofi",
    name: "Lofi Study",
    type: "youtube",
    videoId: "jfKfPfyJRdk",
    thumb: "https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg",
  },
  {
    id: "synth",
    name: "Synthwave Desk",
    type: "youtube",
    videoId: "4xDzrJKXOOY",
    thumb: "https://img.youtube.com/vi/4xDzrJKXOOY/mqdefault.jpg",
  },
  {
    id: "rain",
    name: "Rainy Cafe",
    type: "youtube",
    videoId: "lTRiuFIWV54",
    thumb: "https://img.youtube.com/vi/lTRiuFIWV54/mqdefault.jpg",
  },
  {
    id: "study-me",
    name: "Study with me",
    type: "youtube",
    videoId: "5HiwK2KwD1Q",
    thumb: "https://img.youtube.com/vi/5HiwK2KwD1Q/mqdefault.jpg",
  },
  {
    id: "library",
    name: "Thư viện 4K",
    type: "image",
    url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1920&q=80",
  },
  {
    id: "anime-night",
    name: "Anime Night",
    type: "image",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80",
  },
  {
    id: "desk",
    name: "Study Desk",
    type: "image",
    url: "https://images.unsplash.com/photo-14565130808-0b7d3e6f1ee8?auto=format&fit=crop&w=1920&q=80",
  },
  {
    id: "city",
    name: "City Night",
    type: "image",
    url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1920&q=80",
  },
];

export function youtubeId(url) {
  const value = String(url || "");
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  if (match?.[1]) return match[1];
  if (/^[\w-]{11}$/.test(value.trim())) return value.trim();
  return "";
}

export function parseBackgroundInput(raw) {
  const value = String(raw || "").trim();
  if (!value) return { type: "none" };
  const id = youtubeId(value);
  if (id) return { type: "youtube", videoId: id, url: value };
  return { type: "image", url: value };
}

export function resizeImageFile(file, max = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được ảnh"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.onerror = () => reject(new Error("Ảnh không hợp lệ"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const COPY = {
  vi: {
    settings: "Cài đặt",
    appearance: "Giao diện",
    privacy: "Quyền riêng tư",
    help: "Giúp đỡ và phản hồi",
    premium: "Nâng cấp Premium",
    logout: "Đăng xuất",
    light: "Sáng",
    dark: "Tối",
    rank: "Hạng đấu",
    achievements: "Thành tựu",
  },
  en: {
    settings: "Settings",
    appearance: "Appearance",
    privacy: "Privacy",
    help: "Help & feedback",
    premium: "Upgrade Premium",
    logout: "Log out",
    light: "Light",
    dark: "Dark",
    rank: "Rank",
    achievements: "Achievements",
  },
};
