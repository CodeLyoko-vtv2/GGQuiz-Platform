import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from "docx";

const FONT = "Times New Roman";
const SIZE = 26; // 13pt
const SIZE_TITLE = 28; // 14pt
const LINE = 360; // 1.5
const CONTENT_WIDTH = convertMillimetersToTwip(160);
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

function safeFileName(title) {
  const cleaned = String(title || "de-thi")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "de-thi";
}

function run(text, extras = {}) {
  return new TextRun({
    text: text ?? "",
    font: FONT,
    size: extras.size || SIZE,
    bold: Boolean(extras.bold),
    italics: Boolean(extras.italics),
  });
}

function para(children, extras = {}) {
  return new Paragraph({
    alignment: extras.alignment,
    spacing: {
      before: extras.before ?? 0,
      after: extras.after ?? 0,
      line: extras.line ?? LINE,
    },
    children: Array.isArray(children) ? children : [run(children, extras)],
  });
}

function cell(children, width, extras = {}) {
  return new TableCell({
    borders: NO_BORDERS,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: extras.verticalAlign || VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 40, right: 80 },
    children,
  });
}

function optionLayout(options) {
  const texts = (options || []).map((opt) => String(opt.text || "").trim());
  const maxLen = texts.reduce((max, text) => Math.max(max, text.length), 0);
  if (maxLen <= 18) return "row4";
  if (maxLen <= 48) return "row2";
  return "row1";
}

function optionLabel(opt) {
  return `${opt.key}. ${opt.text || ""}`;
}

function optionsTable(options, columns) {
  const width = Math.floor(CONTENT_WIDTH / columns);
  const rows = [];
  for (let i = 0; i < options.length; i += columns) {
    const slice = options.slice(i, i + columns);
    const cells = slice.map((opt) =>
      cell([para(optionLabel(opt))], width)
    );
    while (cells.length < columns) {
      cells.push(cell([para("")], width));
    }
    rows.push(new TableRow({ children: cells }));
  }
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: Array.from({ length: columns }, () => width),
    rows,
  });
}

function buildHeader(exam) {
  const leftWidth = convertMillimetersToTwip(78);
  const rightWidth = convertMillimetersToTwip(82);
  const duration = exam?.durationMinutes || 45;

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [leftWidth, rightWidth],
    rows: [
      new TableRow({
        children: [
          cell(
            [
              para("Trường: ................................."),
              para("Lớp: ...................................."),
              para("Họ và tên: .............................."),
            ],
            leftWidth
          ),
          cell(
            [
              para("ĐỀ KIỂM TRA", {
                bold: true,
                size: SIZE_TITLE,
                alignment: AlignmentType.CENTER,
              }),
              para((exam?.title || "Đề thi").toUpperCase(), {
                bold: true,
                size: SIZE_TITLE,
                alignment: AlignmentType.CENTER,
                before: 60,
              }),
              para(
                `Môn: ..................... - Thời gian làm bài: ${duration} phút`,
                { alignment: AlignmentType.CENTER, before: 60 }
              ),
            ],
            rightWidth,
            { verticalAlign: VerticalAlign.CENTER }
          ),
        ],
      }),
    ],
  });
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionBlocks(question, index) {
  const blocks = [];
  const options = question.options || [];
  const prompt = stripHtml(question.prompt);

  if (question.passage) {
    blocks.push(
      para(question.passage, { italics: true, before: index === 0 ? 160 : 240, after: 80 })
    );
  }

  if (question.audioUrl) {
    blocks.push(
      para("(Phần nghe — học sinh nghe và chọn đáp án đúng)", {
        italics: true,
        before: question.passage ? 40 : index === 0 ? 160 : 200,
      })
    );
  }

  blocks.push(
    para(
      [
        run(`Câu ${index + 1}: `, { bold: true }),
        run(prompt || ""),
      ],
      {
        before: question.passage || question.audioUrl ? 80 : index === 0 ? 200 : 240,
        after: 60,
      }
    )
  );

  if (options.length) {
    const layout = optionLayout(options);
    if (layout === "row4") {
      blocks.push(optionsTable(options, 4));
    } else if (layout === "row2") {
      blocks.push(optionsTable(options, 2));
    } else {
      options.forEach((opt) => {
        blocks.push(para(optionLabel(opt), { after: 20 }));
      });
    }
  }

  return blocks;
}

export async function downloadExamDocx(exam) {
  const questions = exam?.questions || [];
  const children = [buildHeader(exam)];

  questions.forEach((question, index) => {
    children.push(...questionBlocks(question, index));
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE },
          paragraph: { spacing: { line: LINE } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(20),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(exam?.title)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
