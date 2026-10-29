import { useLocation } from "react-router-dom";

const titles = {
  "/library": "Thư viện",
  "/flashcards": "Thẻ ghi nhớ",
  "/textbooks": "Giáo trình",
  "/explanations": "Lời giải",
  "/dictionary": "Tra từ",
  "/ai-generator": "Trợ thủ AI",
  "/lesson-plans": "Giáo án",
  "/create-folder": "Tạo thư mục",
  "/solutions": "Lời giải bài tập",
  "/ai": "Trợ thủ AI",
  "/esports-terms": "Thuật ngữ Esports",
};

function PlaceholderPage() {
  const { pathname } = useLocation();
  const title = titles[pathname] || "GGQuiz";

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-gray-500">Nội dung đang được cập nhật.</p>
    </div>
  );
}

export default PlaceholderPage;
