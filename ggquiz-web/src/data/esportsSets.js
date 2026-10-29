/** Catalog Thuật ngữ Esports — id số nguyên để lưu trong FolderItem.refId */
export const ESPORTS_SETS = [
  {
    id: 1,
    slug: "lol",
    title: "Thuật ngữ League of Legends",
    game: "League of Legends",
    description: "Từ vựng meta dành cho game thủ LoL",
    accent: "from-blue-500 via-purple-500 to-fuchsia-500",
    glow: "shadow-purple-500/40",
    cards: [
      { term: "GG", definition: "Good Game — lời chào kết thúc trận đấu lịch sự." },
      { term: "FF", definition: "Forfeit — bỏ cuộc / đầu hàng sớm (thường ở phút 15)." },
      { term: "Feed", definition: "Chết nhiều lần, vô tình giúp đối thủ mạnh lên." },
      { term: "Jungle", definition: "Khu vực quái rừng giữa các lane; cũng chỉ vị trí Jungler." },
      { term: "Gank", definition: "Đột kích bất ngờ từ jungle hoặc lane khác để bắt kill." },
    ],
  },
  {
    id: 2,
    slug: "valorant",
    title: "Thuật ngữ Valorant",
    game: "Valorant",
    description: "Callout và meta Valorant cơ bản",
    accent: "from-rose-500 via-red-500 to-orange-500",
    glow: "shadow-rose-500/40",
    cards: [
      { term: "Eco", definition: "Vòng tiết kiệm tiền, mua súng/utility tối thiểu." },
      { term: "Entry", definition: "Người đi đầu tiên vào site để mở đường cho team." },
      { term: "Clutch", definition: "Tình huống 1vsX và vẫn thắng vòng." },
      { term: "Util", definition: "Utility — smoke, flash, molly và các kỹ năng hỗ trợ." },
      { term: "Plant", definition: "Đặt Spike tại site A/B." },
    ],
  },
  {
    id: 3,
    slug: "csgo",
    title: "Thuật ngữ CS:GO",
    game: "CS:GO / CS2",
    description: "Thuật ngữ kinh điển của Counter-Strike",
    accent: "from-amber-400 via-orange-500 to-yellow-300",
    glow: "shadow-amber-400/40",
    cards: [
      { term: "AWP", definition: "Sniper một phát chết người, biểu tượng của CS." },
      { term: "Eco Round", definition: "Vòng không mua nhiều, chờ force/full buy vòng sau." },
      { term: "Rush", definition: "Đội hình lao nhanh vào một site để áp đảo." },
      { term: "Peek", definition: "Ló mặt ra khỏi góc để lấy thông tin hoặc bắn." },
      { term: "Save", definition: "Giữ súng đắt tiền khi không còn cơ hội thắng vòng." },
    ],
  },
];

export function getEsportsSetById(id) {
  return ESPORTS_SETS.find((set) => set.id === Number(id)) || null;
}
