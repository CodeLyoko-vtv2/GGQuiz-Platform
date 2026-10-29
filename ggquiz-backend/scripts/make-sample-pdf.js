const fs = require("fs");
const path = require("path");

function makePdf(pages) {
  const objects = [];
  const add = (content) => {
    objects.push(content);
    return objects.length;
  };

  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = pages.map((text) => {
    const stream = `BT /F1 28 Tf 64 760 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    return { contentId, text };
  });

  const kids = [];
  const pageObjIds = pageIds.map((page) => {
    const id = add(
      `<< /Type /Page /Parent PAGES /MediaBox [0 0 595 842] /Contents ${page.contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    kids.push(`${id} 0 R`);
    return id;
  });

  const pagesId = add(`<< /Type /Pages /Count ${pageObjIds.length} /Kids [${kids.join(" ")}] >>`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const finalized = objects.map((item) => item.replace(/\/Parent PAGES/, `/Parent ${pagesId} 0 R`));

  let body = "%PDF-1.4\n";
  const offsets = [0];
  finalized.forEach((item, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${item}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${finalized.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${finalized.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return body;
}

const dest = path.join(__dirname, "..", "uploads", "curriculum", "pdf");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(
  path.join(dest, "sample-global-success.pdf"),
  makePdf([
    "Global Success - Tieng Anh 1",
    "Lesson 1 - Listen and repeat",
    "Lesson 2 - Point and say",
    "Lesson 3 - Let's talk",
  ])
);
console.log("sample pdf ready");
