const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function searchPixabay(query, page = 1) {
  if (!PIXABAY_API_KEY) return null;

  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", PIXABAY_API_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", String(page));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pixabay error: ${response.status}`);
  }

  const data = await response.json();
  const hits = Array.isArray(data.hits) ? data.hits : [];

  return hits.map((item) => ({
    id: `pixabay-${item.id}`,
    thumb: item.previewURL || item.webformatURL,
    url: item.webformatURL || item.largeImageURL,
    alt: item.tags || query,
    source: "pixabay",
  }));
}

async function searchPexels(query, page = 1) {
  if (!PEXELS_API_KEY) return null;

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY },
  });
  if (!response.ok) {
    throw new Error(`Pexels error: ${response.status}`);
  }

  const data = await response.json();
  const photos = Array.isArray(data.photos) ? data.photos : [];

  return photos.map((item) => ({
    id: `pexels-${item.id}`,
    thumb: item.src?.medium || item.src?.small,
    url: item.src?.large || item.src?.original,
    alt: item.alt || query,
    source: "pexels",
  }));
}

async function searchUnsplash(query, page = 1) {
  if (!UNSPLASH_ACCESS_KEY) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });
  if (!response.ok) {
    throw new Error(`Unsplash error: ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((item) => ({
    id: `unsplash-${item.id}`,
    thumb: item.urls?.small || item.urls?.thumb,
    url: item.urls?.regular || item.urls?.full,
    alt: item.alt_description || query,
    source: "unsplash",
  }));
}

exports.searchImages = async (req, res) => {
  try {
    const query = String(req.query.q || req.body?.q || "").trim();
    const page = Math.max(1, Number(req.query.page || 1) || 1);

    if (!query) {
      return res.status(200).json({ images: [], query: "" });
    }

    if (!PIXABAY_API_KEY && !PEXELS_API_KEY && !UNSPLASH_ACCESS_KEY) {
      return res.status(500).json({
        message:
          "Chưa cấu hình API ảnh. Thêm PIXABAY_API_KEY, PEXELS_API_KEY hoặc UNSPLASH_ACCESS_KEY vào .env",
      });
    }

    let images = null;
    let provider = null;
    const errors = [];

    // Ưu tiên Pixabay (đã có key trong dự án), rồi Pexels, Unsplash
    try {
      images = await searchPixabay(query, page);
      if (images) provider = "pixabay";
    } catch (error) {
      errors.push(`Pixabay: ${error.message}`);
      console.warn("Pixabay search failed:", error.message);
    }

    if (!images) {
      try {
        images = await searchPexels(query, page);
        if (images) provider = "pexels";
      } catch (error) {
        errors.push(`Pexels: ${error.message}`);
        console.warn("Pexels search failed:", error.message);
      }
    }

    if (!images) {
      try {
        images = await searchUnsplash(query, page);
        if (images) provider = "unsplash";
      } catch (error) {
        errors.push(`Unsplash: ${error.message}`);
        console.warn("Unsplash search failed:", error.message);
      }
    }

    if (!images && errors.length > 0) {
      return res.status(502).json({
        message:
          "Không gọi được kho ảnh. Thử thêm PEXELS_API_KEY hoặc UNSPLASH_ACCESS_KEY vào .env, hoặc kiểm tra lại PIXABAY_API_KEY.",
        errors,
      });
    }

    return res.status(200).json({
      images: images || [],
      query,
      page,
      provider,
    });
  } catch (error) {
    console.error("Image search error:", error);
    return res.status(500).json({ message: "Không tìm được ảnh gợi ý" });
  }
};
