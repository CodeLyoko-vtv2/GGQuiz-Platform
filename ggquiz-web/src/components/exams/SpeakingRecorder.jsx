import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

function formatClock(total) {
  const safe = Math.max(0, total);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SpeakingRecorder({ value, onChange, readOnly = false }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState(() => Array(16).fill(8));
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    return () => stopInternal(false);
  }, []);

  const stopInternal = (keepBlob) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
    analyserRef.current = null;
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") {
      if (!keepBlob) recorder.ondataavailable = null;
      recorder.stop();
    }
    mediaRef.current = null;
    setRecording(false);
  };

  const tickWave = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const next = Array.from({ length: 16 }, (_, i) => {
      const slice = data.slice(i * 4, i * 4 + 4);
      const avg = slice.reduce((sum, n) => sum + n, 0) / (slice.length || 1);
      return 6 + (avg / 255) * 28;
    });
    setLevels(next);
    rafRef.current = requestAnimationFrame(tickWave);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        context.close();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.readAsDataURL(blob);
        });
        onChange?.({ dataUrl, duration: secondsRef.current });
      };
      mediaRef.current = recorder;
      recorder.start();
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
      tickWave();
    } catch {
      onChange?.(null);
    }
  };

  const stopRecording = () => {
    stopInternal(true);
  };

  return (
    <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        {readOnly ? (
          <p className="text-sm font-bold text-purple-700">Bài ghi âm đã nộp</p>
        ) : (
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${
            recording ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {recording ? "Dừng ghi" : "Thu âm"}
        </button>
        )}
        <p className="text-lg font-black tabular-nums text-purple-800">
          {formatClock(recording ? seconds : value?.duration || 0)}
        </p>
      </div>
      <div className="mt-4 flex h-10 items-end justify-center gap-1">
        {levels.map((height, index) => (
          <span
            key={index}
            className={`w-1.5 rounded-full ${recording ? "bg-purple-600" : "bg-purple-200"}`}
            style={{ height: `${recording ? height : 8}px` }}
          />
        ))}
      </div>
      {value?.dataUrl ? (
        <audio controls src={value.dataUrl} className="mt-4 w-full">
          Trình duyệt không hỗ trợ audio.
        </audio>
      ) : (
        <p className="mt-3 text-center text-xs text-purple-500">
          Bấm Thu âm để ghi câu trả lời trực tiếp trên web.
        </p>
      )}
    </div>
  );
}

export default SpeakingRecorder;
