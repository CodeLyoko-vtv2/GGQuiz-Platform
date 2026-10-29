const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "uploads", "lesson-plans");

function publicPath(filename) {
  return `/uploads/lesson-plans/${filename}`;
}

async function exportLessonPdf({ id, title, html }) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pdfName = `${id}.pdf`;
  const previewName = `${id}-preview.png`;
  const pdfPath = path.join(OUT_DIR, pdfName);
  const previewPath = path.join(OUT_DIR, previewName);

  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    throw new Error("PUPPETEER_MISSING");
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 16mm; }
            html, body { background: #fff !important; color: #111 !important; margin: 0; color-scheme: light; }
            body { font-family: "Times New Roman", Times, serif; font-size: 13px; padding: 24px 32px; }
            h1, h2, h3 { margin: 0.6em 0 0.35em; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            td, th { border: 1px solid #222; padding: 6px 8px; vertical-align: top; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${html || `<h1>${title || "Giáo án"}</h1>`}</body>
      </html>`,
      { waitUntil: "networkidle0" }
    );
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.emulateMediaType("screen");
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.screenshot({
      path: previewPath,
      type: "png",
      omitBackground: false,
    });
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  let pageCount = 1;
  try {
    const { PDFDocument } = require("pdf-lib");
    const doc = await PDFDocument.load(fs.readFileSync(pdfPath));
    pageCount = doc.getPageCount();
  } catch {
    pageCount = 1;
  }

  return {
    pdfUrl: publicPath(pdfName),
    previewUrl: publicPath(previewName),
    pageCount,
  };
}

module.exports = { exportLessonPdf };
