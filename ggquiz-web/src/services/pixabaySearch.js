const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
const CACHE_PREFIX = "ggquiz_img_cache_v1:";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút — giảm gọi lại khi Pixabay rate-limit

const memoryCache = new Map();

function toHttps(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http://")) return `https://${s.slice(7)}`;
  return s;
}

function mapHits(hits, q) {
  return (Array.isArray(hits) ? hits : [])
    .map((item) => {
      const url = toHttps(item.webformatURL || item.largeImageURL || item.previewURL);
      const thumb = toHttps(item.previewURL || item.webformatURL || url);
      if (!url) return null;
      return {
        id: `pixabay-${item.id}`,
        thumb,
        url,
        alt: item.tags || q,
      };
    })
    .filter(Boolean);
}

function cacheKey(query, page, perPage) {
  return `${CACHE_PREFIX}${query.toLowerCase()}|${page}|${perPage}`;
}

function readCache(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    memoryCache.set(key, parsed.images);
    return parsed.images;
  } catch {
    return null;
  }
}

function writeCache(key, images) {
  memoryCache.set(key, images);
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ expiresAt: Date.now() + CACHE_TTL_MS, images })
    );
  } catch {
    // sessionStorage đầy — bỏ qua
  }
}

/** Fallback miễn phí khi Pixabay 429 / lỗi */
async function searchOpenverseImages(query, { page = 1, perPage = 12 } = {}) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(Math.min(perPage, 20)));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Openverse lỗi ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .map((item) => {
      const urlValue = toHttps(item.url || item.thumbnail);
      const thumb = toHttps(item.thumbnail || item.url);
      if (!urlValue) return null;
      return {
        id: `openverse-${item.id}`,
        thumb,
        url: urlValue,
        alt: item.title || query,
      };
    })
    .filter(Boolean);
}

/**
 * Gọi Pixabay qua Vite proxy; cache + fallback Openverse khi 429.
 */
export async function searchPixabayImages(query, { page = 1, perPage = 12 } = {}) {
  const q = String(query || "").trim();
  if (!q) return [];

  const key = cacheKey(q, page, perPage);
  const cached = readCache(key);
  if (cached?.length) return cached;

  if (!PIXABAY_API_KEY) {
    // Không có key → dùng Openverse luôn
    const fallback = await searchOpenverseImages(q, { page, perPage });
    if (fallback.length) writeCache(key, fallback);
    return fallback;
  }

  const url = new URL("/pixabay-api/", window.location.origin);
  url.searchParams.set("key", PIXABAY_API_KEY);
  url.searchParams.set("q", q);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));

  let response;
  try {
    response = await fetch(url.toString());
  } catch {
    try {
      const fallback = await searchOpenverseImages(q, { page, perPage });
      if (fallback.length) writeCache(key, fallback);
      return fallback;
    } catch {
      throw new Error(
        "Không kết nối được kho ảnh. Hãy restart frontend (npm run dev) hoặc thử lại sau."
      );
    }
  }

  if (response.status === 429) {
    try {
      const fallback = await searchOpenverseImages(q, { page, perPage });
      if (fallback.length) {
        writeCache(key, fallback);
        return fallback;
      }
    } catch {
      // fall through
    }
    throw new Error(
      "Pixabay đang giới hạn số lần gọi (429). Đã thử nguồn dự phòng nhưng chưa có ảnh. Đợi vài phút hoặc dùng nút Tải lên."
    );
  }

  if (!response.ok) {
    try {
      const fallback = await searchOpenverseImages(q, { page, perPage });
      if (fallback.length) {
        writeCache(key, fallback);
        return fallback;
      }
    } catch {
      // fall through
    }
    throw new Error(`Kho ảnh lỗi ${response.status}. Thử lại hoặc dùng Tải lên.`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Pixabay trả về dữ liệu không hợp lệ. Hãy restart Vite (npm run dev)."
    );
  }

  const data = await response.json();
  const images = mapHits(data.hits, q);
  if (images.length) writeCache(key, images);
  return images;
}
