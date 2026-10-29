import { useEffect, useRef } from "react";
import { Button, Typography, Upload, message } from "antd";
import { uploadAdminFile } from "../api/client";

export default function RichEditor({ value = "", onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function command(name, arg) {
    document.execCommand(name, false, arg);
    onChange?.(ref.current?.innerHTML || "");
  }

  return (
    <div>
      <div className="editor-toolbar">
        <Button onClick={() => command("bold")}>Đậm</Button>
        <Button onClick={() => command("italic")}>Nghiêng</Button>
        <Button onClick={() => command("insertUnorderedList")}>Danh sách</Button>
        <Button
          onClick={() =>
            command(
              "insertHTML",
              "<table border='1' style='width:100%;border-collapse:collapse'><tr><td>Ô 1</td><td>Ô 2</td></tr></table>"
            )
          }
        >
          Bảng
        </Button>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={async (file) => {
            const data = await uploadAdminFile("cover", file);
            command("insertImage", `http://localhost:5000${data.url}`);
            message.success("Đã chèn ảnh");
            return false;
          }}
        >
          <Button>Ảnh</Button>
        </Upload>
        <Button
          onClick={() => {
            const latex = window.prompt("Công thức LaTeX", "x^2 + y^2 = z^2");
            if (latex) command("insertHTML", ` <code class="math">$$${latex}$$</code> `);
          }}
        >
          LaTeX
        </Button>
      </div>
      <div
        ref={ref}
        className="rich-editor"
        contentEditable
        onInput={() => onChange?.(ref.current?.innerHTML || "")}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        Soạn chữ, bảng, ảnh và công thức. File âm thanh đính kèm ở phần bên dưới editor.
      </Typography.Paragraph>
    </div>
  );
}
