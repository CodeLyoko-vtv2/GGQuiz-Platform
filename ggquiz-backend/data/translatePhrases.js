/** Cụm giao tiếp phổ biến cho autocomplete Từ điển (chuẩn Google Dịch). */

const EN = [
  { t: "where", vi: "Ở đâu", pop: 88 },
  { t: "where are you", vi: "Bạn ở đâu", pop: 94 },
  { t: "where are you from", vi: "Bạn đến từ đâu", pop: 98 },
  { t: "where is", vi: "Ở đâu là", pop: 80 },
  { t: "where is it", vi: "Nó ở đâu", pop: 86 },
  { t: "where can i", vi: "Tôi có thể ở đâu", pop: 78 },
  { t: "where do you live", vi: "Bạn sống ở đâu", pop: 90 },
  { t: "what", vi: "Cái gì", pop: 88 },
  { t: "what is", vi: "Cái gì là", pop: 82 },
  { t: "what is this", vi: "Đây là gì", pop: 90 },
  { t: "what are you doing", vi: "Bạn đang làm gì", pop: 96 },
  { t: "what time", vi: "Mấy giờ", pop: 88 },
  { t: "what time is it", vi: "Bây giờ là mấy giờ", pop: 92 },
  { t: "what's your name", vi: "Bạn tên gì", pop: 95 },
  { t: "what does it mean", vi: "Nó nghĩa là gì", pop: 90 },
  { t: "when", vi: "Khi nào", pop: 86 },
  { t: "when are you coming", vi: "Khi nào bạn đến", pop: 88 },
  { t: "when is", vi: "Khi nào là", pop: 78 },
  { t: "who", vi: "Ai", pop: 84 },
  { t: "who are you", vi: "Bạn là ai", pop: 93 },
  { t: "who is", vi: "Ai là", pop: 80 },
  { t: "why", vi: "Tại sao", pop: 86 },
  { t: "why not", vi: "Tại sao không", pop: 84 },
  { t: "why are you", vi: "Tại sao bạn", pop: 82 },
  { t: "how", vi: "Như thế nào", pop: 86 },
  { t: "how are you", vi: "Bạn khỏe không", pop: 98 },
  { t: "how much", vi: "Bao nhiêu", pop: 92 },
  { t: "how many", vi: "Bao nhiêu", pop: 88 },
  { t: "how to", vi: "Cách để", pop: 90 },
  { t: "how do you", vi: "Bạn làm thế nào", pop: 86 },
  { t: "how old are you", vi: "Bạn bao nhiêu tuổi", pop: 94 },
  { t: "hello", vi: "Xin chào", pop: 96 },
  { t: "hello how are you", vi: "Xin chào, bạn khỏe không", pop: 90 },
  { t: "hi", vi: "Chào", pop: 90 },
  { t: "hi how are you", vi: "Chào, bạn khỏe không", pop: 88 },
  { t: "thank you", vi: "Cảm ơn bạn", pop: 98 },
  { t: "thank you very much", vi: "Cảm ơn bạn rất nhiều", pop: 92 },
  { t: "thanks", vi: "Cảm ơn", pop: 90 },
  { t: "please", vi: "Làm ơn", pop: 88 },
  { t: "please help me", vi: "Làm ơn giúp tôi", pop: 90 },
  { t: "sorry", vi: "Xin lỗi", pop: 92 },
  { t: "i am sorry", vi: "Tôi xin lỗi", pop: 90 },
  { t: "excuse me", vi: "Xin lỗi", pop: 90 },
  { t: "good morning", vi: "Chào buổi sáng", pop: 94 },
  { t: "good afternoon", vi: "Chào buổi chiều", pop: 88 },
  { t: "good evening", vi: "Chào buổi tối", pop: 88 },
  { t: "good night", vi: "Chúc ngủ ngon", pop: 90 },
  { t: "goodbye", vi: "Tạm biệt", pop: 90 },
  { t: "see you", vi: "Hẹn gặp lại", pop: 88 },
  { t: "see you later", vi: "Hẹn gặp lại sau", pop: 90 },
  { t: "i love you", vi: "Anh yêu em", pop: 96 },
  { t: "i miss you", vi: "Anh nhớ em", pop: 92 },
  { t: "i don't know", vi: "Tôi không biết", pop: 94 },
  { t: "i don't understand", vi: "Tôi không hiểu", pop: 93 },
  { t: "i need help", vi: "Tôi cần giúp đỡ", pop: 90 },
  { t: "i want", vi: "Tôi muốn", pop: 86 },
  { t: "i want to", vi: "Tôi muốn", pop: 88 },
  { t: "can you", vi: "Bạn có thể", pop: 90 },
  { t: "can you help me", vi: "Bạn có thể giúp tôi không", pop: 95 },
  { t: "can i", vi: "Tôi có thể", pop: 86 },
  { t: "do you", vi: "Bạn có", pop: 84 },
  { t: "do you speak english", vi: "Bạn có nói tiếng Anh không", pop: 90 },
  { t: "nice to meet you", vi: "Rất vui được gặp bạn", pop: 94 },
  { t: "my name is", vi: "Tên tôi là", pop: 90 },
  { t: "yes", vi: "Có", pop: 80 },
  { t: "no", vi: "Không", pop: 80 },
  { t: "ok", vi: "Được", pop: 78 },
  { t: "okay", vi: "Được rồi", pop: 78 },
  { t: "help", vi: "Giúp đỡ", pop: 84 },
  { t: "help me", vi: "Giúp tôi", pop: 88 },
  { t: "wait", vi: "Đợi", pop: 80 },
  { t: "wait a minute", vi: "Đợi một chút", pop: 86 },
  { t: "come here", vi: "Đến đây", pop: 82 },
  { t: "let's go", vi: "Đi thôi", pop: 88 },
  { t: "good luck", vi: "Chúc may mắn", pop: 88 },
  { t: "have a nice day", vi: "Chúc một ngày tốt lành", pop: 90 },
];

const VI = [
  { t: "ở đâu", en: "where", pop: 90 },
  { t: "bạn", en: "you", pop: 86 },
  { t: "bạn ở đâu", en: "where are you", pop: 94 },
  { t: "bạn đến từ đâu", en: "where are you from", pop: 96 },
  { t: "bạn khỏe không", en: "how are you", pop: 96 },
  { t: "bạn đang làm gì", en: "what are you doing", pop: 94 },
  { t: "bạn tên gì", en: "what's your name", pop: 92 },
  { t: "xin chào", en: "hello", pop: 96 },
  { t: "xin lỗi", en: "sorry", pop: 92 },
  { t: "cảm ơn", en: "thank you", pop: 96 },
  { t: "cảm ơn bạn", en: "thank you", pop: 94 },
  { t: "tôi", en: "I", pop: 80 },
  { t: "tôi không biết", en: "I don't know", pop: 92 },
  { t: "tôi không hiểu", en: "I don't understand", pop: 92 },
  { t: "tôi muốn", en: "I want", pop: 86 },
  { t: "làm ơn", en: "please", pop: 88 },
  { t: "giúp tôi", en: "help me", pop: 90 },
  { t: "tạm biệt", en: "goodbye", pop: 90 },
  { t: "hẹn gặp lại", en: "see you", pop: 88 },
  { t: "chào buổi sáng", en: "good morning", pop: 90 },
  { t: "bây giờ là mấy giờ", en: "what time is it", pop: 90 },
  { t: "bạn bao nhiêu tuổi", en: "how old are you", pop: 90 },
];

function pickPool(lang) {
  if (lang === "vi") return VI;
  return EN;
}

function translationOf(item, targetLang) {
  if (targetLang === "vi") return item.vi || "";
  if (targetLang === "en") return item.en || item.t;
  return "";
}

function matchTranslatePhrases(query, sourceLang, targetLang) {
  const q = String(query || "").trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const looksVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(q);
  const pool = pickPool(sourceLang === "auto" ? (looksVi ? "vi" : "en") : sourceLang);

  const starts = pool.filter((item) => item.t.toLowerCase().startsWith(lower));
  starts.sort((a, b) => b.pop - a.pop || a.t.length - b.t.length);

  const result = [];
  const seen = new Set();
  const push = (text, translation, pop = 0) => {
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push({ text, translation: translation || "", pop });
  };

  for (const item of starts) {
    if (item.t.toLowerCase() === lower) continue;
    push(item.t, translationOf(item, targetLang), item.pop);
    if (result.length >= 4) break;
  }

  const exact = pool.find((item) => item.t.toLowerCase() === lower);
  const exactRow = {
    text: exact ? exact.t : q,
    translation: exact ? translationOf(exact, targetLang) : "",
    pop: exact ? exact.pop : 70,
  };

  if (result.length === 0) {
    result.push(exactRow);
  } else {
    result.splice(Math.min(1, result.length), 0, exactRow);
  }

  return result.slice(0, 5);
}

module.exports = { matchTranslatePhrases };
