import { useState } from "react";
import { Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { isSpeechSupported, speakText, stopSpeaking } from "../utils/speech";

function SpeakButton({
  text,
  lang = "auto",
  label = "Âm thanh",
  className = "",
  iconClassName = "h-4 w-4",
}) {
  const [speaking, setSpeaking] = useState(false);

  const stopCardFlip = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleClick = async (event) => {
    stopCardFlip(event);

    if (!text?.trim()) return;

    if (!isSpeechSupported()) {
      toast.error("Trình duyệt không hỗ trợ phát âm thanh.");
      return;
    }

    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    try {
      const ok = await speakText(text, { lang });
      if (!ok) {
        toast.error("Không phát được âm thanh cho từ này.");
      }
    } catch (error) {
      toast.error(error.message || "Không phát được âm thanh.");
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={stopCardFlip}
      onPointerDown={stopCardFlip}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 ${
        speaking ? "border-purple-400 bg-purple-50 text-purple-700" : ""
      } ${className}`}
    >
      <Volume2 className={iconClassName} />
    </button>
  );
}

export default SpeakButton;
