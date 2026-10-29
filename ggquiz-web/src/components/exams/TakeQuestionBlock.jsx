import { Volume2 } from "lucide-react";
import {
  getFormat,
  isChoiceFormat,
  isListeningFormat,
  isOpenFormat,
  isPassageFormat,
  sanitizeHtml,
} from "../../utils/examFormats";
import RichTextEditor from "./RichTextEditor";
import SpeakingRecorder from "./SpeakingRecorder";

function ChoiceList({ question, selected, onSelect, readOnly = false }) {
  return (
    <div className="mt-4 space-y-3">
      {question.options.map((opt) => {
        const active = selected === opt.key;
        return (
          <label
            key={opt.key}
            className={`flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition ${
              readOnly ? "cursor-default" : "cursor-pointer"
            } ${
              active
                ? "border-blue-500 bg-blue-50 text-blue-900"
                : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          >
            <input
              type="radio"
              name={`take-${question.id}`}
              checked={active}
              disabled={readOnly}
              onChange={() => {
                if (!readOnly) onSelect(opt.key);
              }}
              className="sr-only"
            />
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? "border-blue-600" : "border-gray-300"
              }`}
            >
              {active ? <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
            </span>
            <span className="text-sm font-extrabold">{opt.key}.</span>
            <span className="text-sm font-medium sm:text-base">{opt.text}</span>
          </label>
        );
      })}
    </div>
  );
}

function PromptText({ question }) {
  if (isOpenFormat(question.type)) {
    return (
      <div
        className="exam-rich-text mt-4 text-base leading-relaxed font-semibold text-gray-900 sm:text-lg"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.prompt) }}
      />
    );
  }
  return (
    <p className="mt-4 text-base font-semibold whitespace-pre-wrap text-gray-900 sm:text-lg">
      {question.prompt}
    </p>
  );
}

function QuestionBody({ question, index, selected, onSelect, onFocus, readOnly = false }) {
  const format = getFormat(question.type);

  return (
    <div
      onClick={onFocus}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-sm font-bold text-blue-700">
        Câu {index + 1}
        <span className="ml-2 text-xs font-semibold text-slate-400">
          {format.shortLabel}
        </span>
      </p>
      <PromptText question={question} />

      {isChoiceFormat(question.type) ? (
        <ChoiceList
          question={question}
          selected={selected}
          onSelect={onSelect}
          readOnly={readOnly}
        />
      ) : null}

      {question.type === "word_form" ? (
        <input
          type="text"
          value={typeof selected === "string" ? selected : ""}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="Nhập dạng đúng của từ..."
          readOnly={readOnly}
          disabled={readOnly}
          className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 disabled:text-slate-700"
        />
      ) : null}

      {question.type === "sentence_rewrite" ? (
        <div className="mt-4">
          {question.meta?.starter ? (
            <p className="mb-2 text-sm text-slate-500">
              Bắt đầu: <span className="font-semibold text-slate-700">{question.meta.starter}</span>
            </p>
          ) : null}
          <textarea
            value={typeof selected === "string" ? selected : ""}
            onChange={(e) => onSelect(e.target.value)}
            rows={3}
            placeholder="Viết câu hoàn chỉnh..."
            readOnly={readOnly}
            disabled={readOnly}
            className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 disabled:text-slate-700"
          />
        </div>
      ) : null}

      {question.type === "writing" ? (
        <div className="mt-4">
          <RichTextEditor
            value={typeof selected === "string" ? selected : ""}
            onChange={onSelect}
            placeholder="Soạn bài viết của bạn..."
            minHeight="180px"
            readOnly={readOnly}
          />
        </div>
      ) : null}

      {question.type === "speaking" ? (
        <div className="mt-4">
          <SpeakingRecorder value={selected || null} onChange={onSelect} readOnly={readOnly} />
        </div>
      ) : null}
    </div>
  );
}

function TakeQuestionBlock({
  group,
  currentIndex,
  answers,
  onSelect,
  onFocus,
  questionRefs,
  readOnly = false,
}) {
  const showSharedMedia = group.items.length >= 1;
  const stacked = isPassageFormat(group.type) && group.passage;

  const media = (
    <>
      {isListeningFormat(group.type) && group.audioUrl ? (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase">
            <Volume2 className="h-3.5 w-3.5" />
            Audio
          </p>
          <audio controls src={group.audioUrl} className="w-full">
            Trình duyệt không hỗ trợ audio.
          </audio>
        </div>
      ) : null}
      {stacked ? (
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-gray-100 bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 lg:max-h-[70vh]">
          {group.passage}
        </div>
      ) : null}
    </>
  );

  const items = group.items.map(({ question, index }) => (
    <div
      key={question.id}
      ref={(el) => {
        questionRefs.current[index] = el;
      }}
      className={index === currentIndex ? "rounded-2xl ring-2 ring-blue-100" : ""}
    >
      <QuestionBody
        question={question}
        index={index}
        selected={answers[question.id]}
        onSelect={(value) => {
          if (readOnly) return;
          onSelect(question.id, value);
          onFocus(index);
        }}
        onFocus={() => onFocus(index)}
        readOnly={readOnly}
      />
    </div>
  ));

  const heading = (
    <>
      {(group.showSectionTitle ?? Boolean(group.sectionTitle)) ? (
        <h2 className="text-lg font-extrabold text-gray-900">{group.sectionTitle}</h2>
      ) : null}
      {group.instruction && group.instruction !== group.passage ? (
        <p className="mt-1 text-sm leading-relaxed text-slate-500 whitespace-pre-wrap">
          {group.instruction}
        </p>
      ) : null}
    </>
  );

  if (stacked) {
    return (
      <section className="space-y-4">
        {heading}
        <div className="grid gap-4 lg:grid-cols-2">
          <aside className="lg:sticky lg:top-4 lg:self-start">{media}</aside>
          <div className="space-y-4">{items}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {heading}
      {showSharedMedia ? media : null}
      {items}
    </section>
  );
}

export default TakeQuestionBlock;
