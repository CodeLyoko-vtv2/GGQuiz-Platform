import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { ArrowLeft, Cloud, Eye, Printer } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";
import { GRADES, SUBJECTS } from "../../utils/lessonBlocks";

const CONTENT_STYLE = `
  html { background: #e8eaed; }
  body {
    background: #fff;
    width: min(794px, calc(100% - 24px));
    min-height: 1123px;
    margin: 28px auto 56px;
    padding: 72px 64px;
    box-shadow: 0 1px 3px rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15);
    font-family: "Times New Roman", Times, serif;
    font-size: 14px;
    line-height: 1.55;
    color: #111;
  }
  h1, h2, h3, h4, h5, h6 { margin: 0.7em 0 0.35em; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  td, th { border: 1px solid #222; padding: 6px 8px; vertical-align: top; }
  img { max-width: 100%; }
`;

function LessonPlanEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [plan, setPlan] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Tiếng Anh");
  const [grade, setGrade] = useState("Lớp 10");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editorHeight, setEditorHeight] = useState(() => Math.max(520, window.innerHeight - 76));

  useEffect(() => {
    const onResize = () => setEditorHeight(Math.max(520, window.innerHeight - 76));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .get(`/lesson-plans/${id}`)
      .then(({ data }) => {
        if (!alive) return;
        const item = data.lessonPlan;
        if (!item.isOwner) {
          navigate(`/lesson-plans/${id}`, { replace: true });
          return;
        }
        setPlan(item);
        setTitle(item.title || "");
        setSubject(item.subject || "Tiếng Anh");
        setGrade(item.grade || "Lớp 10");
        setHtml(item.htmlContent || "");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err));
        navigate("/lesson-plans", { replace: true });
      });
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  const currentHtml = () => editorRef.current?.getContent?.() ?? html;

  const saveDraft = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/lesson-plans/${id}`, {
        title,
        subject,
        grade,
        htmlContent: currentHtml(),
        status: "draft",
      });
      setPlan(data.lessonPlan);
      setDirty(false);
      toast.success("Đã lưu bản nháp");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const payload = {
        title,
        subject,
        grade,
        htmlContent: currentHtml(),
        status: "published",
      };
      await api.put(`/lesson-plans/${id}`, payload);
      const { data } = await api.post(`/lesson-plans/${id}/export`, payload);
      setPlan(data.lessonPlan);
      setDirty(false);
      toast.success(data.pdfError ? "Đã lưu. PDF sẽ sẵn sàng khi máy chủ xuất được file." : "Đã xuất bản PDF");
      navigate(`/lesson-plans/${id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] text-sm text-slate-500">
        Đang mở trình soạn thảo...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f8f9fa]">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => navigate("/lesson-plans")}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            className="w-full truncate border-0 bg-transparent text-base font-semibold text-slate-900 outline-none"
          />
          <p className="text-[11px] text-slate-400">{dirty ? "Chưa lưu" : "Đã đồng bộ bản nháp HTML"}</p>
        </div>
        <select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setDirty(true);
          }}
          className="hidden rounded-lg border border-slate-200 px-2 py-1 text-xs sm:block"
        >
          {SUBJECTS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setDirty(true);
          }}
          className="hidden rounded-lg border border-slate-200 px-2 py-1 text-xs sm:block"
        >
          {GRADES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => editorRef.current?.execCommand?.("mcePrint")}
          className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:inline-flex"
          title="In"
        >
          <Printer className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/lesson-plans/${id}`)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <Eye className="h-4 w-4" />
          Xem
        </button>
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Cloud className="h-4 w-4" />
          {saving ? "Đang lưu..." : "Lưu nháp"}
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={publishing}
          className="rounded-lg bg-[#1a73e8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1558b0] disabled:opacity-50"
        >
          {publishing ? "Đang xuất PDF..." : "Lưu / Xuất bản"}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@8.10.0/tinymce.min.js"
          onInit={(_evt, editor) => {
            editorRef.current = editor;
          }}
          initialValue={html}
          onEditorChange={() => setDirty(true)}
          init={{
            license_key: "gpl",
            height: editorHeight,
            menubar: false,
            branding: false,
            promotion: false,
            statusbar: true,
            resize: false,
            plugins:
              "advlist autolink lists link image charmap preview searchreplace visualblocks code fullscreen media table wordcount",
            toolbar:
              "undo redo | print | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | removeformat",
            toolbar_sticky: true,
            toolbar_mode: "scrolling",
            font_family_formats:
              "Times New Roman=times new roman,times,serif; Arial=arial,helvetica,sans-serif; Georgia=georgia,serif; Courier New=courier new,courier,monospace",
            content_style: CONTENT_STYLE,
            table_default_attributes: { border: "1" },
            table_default_styles: { "border-collapse": "collapse", width: "100%" },
            automatic_uploads: false,
            file_picker_types: "image",
            images_file_types: "jpg,jpeg,png,gif,webp",
            convert_urls: false,
          }}
        />
      </div>
    </div>
  );
}

export default LessonPlanEditor;
