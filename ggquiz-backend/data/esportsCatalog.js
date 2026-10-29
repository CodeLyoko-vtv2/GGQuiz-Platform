/** Đồng bộ id với frontend src/data/esportsSets.js */
const ESPORTS_SETS = [
  {
    id: 1,
    title: "Thuật ngữ League of Legends",
    description: "Từ vựng meta dành cho game thủ LoL",
    cardCount: 5,
  },
  {
    id: 2,
    title: "Thuật ngữ Valorant",
    description: "Callout và meta Valorant cơ bản",
    cardCount: 5,
  },
  {
    id: 3,
    title: "Thuật ngữ CS:GO",
    description: "Thuật ngữ kinh điển của Counter-Strike",
    cardCount: 5,
  },
];

function getEsportsSetById(id) {
  return ESPORTS_SETS.find((set) => set.id === Number(id)) || null;
}

module.exports = { ESPORTS_SETS, getEsportsSetById };
