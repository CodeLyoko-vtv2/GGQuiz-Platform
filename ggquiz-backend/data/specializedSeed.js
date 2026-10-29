const FIELDS = [
  {
    name: "Tiếng Anh Y khoa",
    slug: "medical",
    description: "Giao tiếp với bệnh nhân, hỏi bệnh sử và giải thích chẩn đoán bằng tiếng Anh.",
    icon: "Stethoscope",
    accent: "rose",
    sortOrder: 1,
    lessons: [
      {
        title: "At the clinic",
        section: "PART 1 · First contact",
        icon: "Home",
        sortOrder: 1,
        requiresPremium: false,
        scenarioTitle: "Bạn là bác sĩ tiếp bệnh nhân mới",
        aiSystemPrompt:
          "You are a patient visiting a clinic. Speak simple English. Wait for the learner (the doctor) to greet you and ask questions. Answer naturally. Gently nudge them to use clinic vocabulary.",
        vocab: [
          { term: "appointment", meaning: "lịch hẹn", example: "I have an appointment at 9 a.m." },
          { term: "reception", meaning: "quầy lễ tân", example: "Please check in at reception." },
          { term: "symptom", meaning: "triệu chứng", example: "What is your main symptom?" },
        ],
      },
      {
        title: "Symptoms & pain",
        section: "PART 1 · First contact",
        icon: "Activity",
        sortOrder: 2,
        requiresPremium: false,
        scenarioTitle: "Bệnh nhân đau bụng cần được hỏi triệu chứng",
        aiSystemPrompt:
          "You are a patient with stomach pain. Describe pain location, duration and severity only when asked. Encourage the learner to use medical English.",
        vocab: [
          { term: "sharp pain", meaning: "đau nhói", example: "I have a sharp pain on the right side." },
          { term: "nausea", meaning: "buồn nôn", example: "I also feel some nausea." },
          { term: "duration", meaning: "thời gian kéo dài", example: "The pain started two days ago." },
        ],
      },
      {
        title: "Taking history",
        section: "PART 1 · First contact",
        icon: "ClipboardList",
        sortOrder: 3,
        requiresPremium: false,
        scenarioTitle: "Khai thác tiền sử bệnh",
        aiSystemPrompt:
          "You are a patient. Answer history questions about allergies, medication and past conditions. Keep answers short and realistic.",
        vocab: [
          { term: "allergy", meaning: "dị ứng", example: "Do you have any drug allergies?" },
          { term: "medication", meaning: "thuốc đang dùng", example: "Are you taking any medication?" },
          { term: "medical history", meaning: "tiền sử bệnh", example: "Tell me about your medical history." },
        ],
      },
      {
        title: "Diagnosis talk",
        section: "PART 2 · Clinical talk",
        icon: "Search",
        sortOrder: 4,
        requiresPremium: true,
        scenarioTitle: "Giải thích chẩn đoán cho bệnh nhân",
        aiSystemPrompt:
          "You are a worried patient. The learner must explain a possible diagnosis in clear English. Ask follow-up questions if they are too technical.",
        vocab: [
          { term: "diagnosis", meaning: "chẩn đoán", example: "The likely diagnosis is gastritis." },
          { term: "inflammation", meaning: "viêm", example: "There is inflammation in the stomach lining." },
          { term: "recommend", meaning: "khuyến nghị", example: "I recommend an ultrasound." },
        ],
      },
      {
        title: "Prescription",
        section: "PART 2 · Clinical talk",
        icon: "Pill",
        sortOrder: 5,
        requiresPremium: true,
        scenarioTitle: "Kê đơn và dặn dò uống thuốc",
        aiSystemPrompt:
          "You are a patient receiving a prescription. Ask about dosage, side effects and when to come back.",
        vocab: [
          { term: "prescription", meaning: "đơn thuốc", example: "I will write a prescription." },
          { term: "dosage", meaning: "liều dùng", example: "The dosage is one tablet twice a day." },
          { term: "side effect", meaning: "tác dụng phụ", example: "A common side effect is drowsiness." },
        ],
      },
    ],
  },
  {
    name: "Tiếng Anh Thương mại",
    slug: "business",
    description: "Họp, email, đàm phán và thuyết trình trong môi trường công sở.",
    icon: "Briefcase",
    accent: "amber",
    sortOrder: 2,
    lessons: [
      {
        title: "Meeting openers",
        section: "PART 1 · Office English",
        icon: "Users",
        sortOrder: 1,
        requiresPremium: false,
        scenarioTitle: "Bắt đầu cuộc họp với đối tác",
        aiSystemPrompt:
          "You are a business partner joining a meeting. Greet the learner and wait for them to open the agenda in English.",
        vocab: [
          { term: "agenda", meaning: "chương trình họp", example: "Let's look at today's agenda." },
          { term: "catch up", meaning: "cập nhật tình hình", example: "Shall we catch up on last week?" },
          { term: "kick off", meaning: "bắt đầu", example: "Let's kick off the meeting." },
        ],
      },
      {
        title: "Professional emails",
        section: "PART 1 · Office English",
        icon: "Mail",
        sortOrder: 2,
        requiresPremium: false,
        scenarioTitle: "Khách hàng phản hồi email",
        aiSystemPrompt:
          "You are a client. The learner writes or says a professional email update. Reply briefly and ask for clarification.",
        vocab: [
          { term: "follow up", meaning: "theo dõi / nhắc lại", example: "I'm writing to follow up on our call." },
          { term: "as discussed", meaning: "như đã thảo luận", example: "As discussed, the deadline is Friday." },
          { term: "look forward to", meaning: "mong chờ", example: "I look forward to your reply." },
        ],
      },
      {
        title: "Small negotiation",
        section: "PART 1 · Office English",
        icon: "Handshake",
        sortOrder: 3,
        requiresPremium: false,
        scenarioTitle: "Thương lượng giá và timeline",
        aiSystemPrompt:
          "You are a supplier. Negotiate politely. Do not accept the first offer. Push the learner to use business phrases.",
        vocab: [
          { term: "quote", meaning: "báo giá", example: "Could you send a better quote?" },
          { term: "compromise", meaning: "thỏa hiệp", example: "We can compromise on the timeline." },
          { term: "deal", meaning: "thỏa thuận", example: "I think we have a deal." },
        ],
      },
      {
        title: "Contracts",
        section: "PART 2 · Closing",
        icon: "FileText",
        sortOrder: 4,
        requiresPremium: true,
        scenarioTitle: "Bàn điều khoản hợp đồng",
        aiSystemPrompt:
          "You are a legal counterpart. Discuss payment terms and liability. Ask the learner to rephrase unclear points.",
        vocab: [
          { term: "clause", meaning: "điều khoản", example: "Please review this clause." },
          { term: "liability", meaning: "trách nhiệm pháp lý", example: "Who takes liability for delays?" },
          { term: "term", meaning: "điều kiện", example: "The payment term is 30 days." },
        ],
      },
      {
        title: "Pitching",
        section: "PART 2 · Closing",
        icon: "Presentation",
        sortOrder: 5,
        requiresPremium: true,
        scenarioTitle: "Thuyết trình sản phẩm 60 giây",
        aiSystemPrompt:
          "You are an investor. Listen to the learner's pitch, then ask two tough questions.",
        vocab: [
          { term: "value proposition", meaning: "đề xuất giá trị", example: "Our value proposition is speed." },
          { term: "stakeholder", meaning: "bên liên quan", example: "Key stakeholders include sales and ops." },
          { term: "roi", meaning: "tỷ suất lợi nhuận", example: "The ROI is expected in six months." },
        ],
      },
    ],
  },
  {
    name: "Tiếng Anh IT",
    slug: "it",
    description: "Standup, báo lỗi, review code và xử lý sự cố bằng tiếng Anh.",
    icon: "Cpu",
    accent: "cyan",
    sortOrder: 3,
    lessons: [
      {
        title: "Daily standup",
        section: "PART 1 · Team English",
        icon: "MessagesSquare",
        sortOrder: 1,
        requiresPremium: false,
        scenarioTitle: "Báo cáo standup với Scrum Master",
        aiSystemPrompt:
          "You are a Scrum Master. Ask yesterday / today / blockers. Keep the learner in English.",
        vocab: [
          { term: "blocker", meaning: "rào cản", example: "My blocker is the API key." },
          { term: "ship", meaning: "xuất bản / release", example: "We can ship the fix today." },
          { term: "bandwidth", meaning: "dung lượng công việc", example: "I don't have bandwidth this week." },
        ],
      },
      {
        title: "Bug report",
        section: "PART 1 · Team English",
        icon: "Bug",
        sortOrder: 2,
        requiresPremium: false,
        scenarioTitle: "Báo cáo bug cho QA",
        aiSystemPrompt:
          "You are a QA engineer. Ask the learner to describe a bug: steps, expected vs actual result.",
        vocab: [
          { term: "reproduce", meaning: "tái hiện lỗi", example: "Can you reproduce the issue?" },
          { term: "expected result", meaning: "kết quả mong đợi", example: "The expected result is a 200 response." },
          { term: "regression", meaning: "lỗi hồi quy", example: "This looks like a regression." },
        ],
      },
      {
        title: "Code review",
        section: "PART 1 · Team English",
        icon: "GitPullRequest",
        sortOrder: 3,
        requiresPremium: false,
        scenarioTitle: "Thảo luận pull request",
        aiSystemPrompt:
          "You are a senior engineer reviewing a PR. Ask the learner to justify a change and suggest a refactor.",
        vocab: [
          { term: "pull request", meaning: "yêu cầu gộp mã", example: "I opened a pull request." },
          { term: "refactor", meaning: "tái cấu trúc", example: "We should refactor this function." },
          { term: "edge case", meaning: "trường hợp biên", example: "Did you cover the edge case?" },
        ],
      },
      {
        title: "Incident call",
        section: "PART 2 · Production",
        icon: "Siren",
        sortOrder: 4,
        requiresPremium: true,
        scenarioTitle: "Cuộc gọi sự cố production",
        aiSystemPrompt:
          "You are on-call. A service is down. Ask the learner to lead the incident in English.",
        vocab: [
          { term: "outage", meaning: "sự cố ngừng dịch vụ", example: "We have an outage on checkout." },
          { term: "rollback", meaning: "khôi phục bản trước", example: "Let's rollback the last deploy." },
          { term: "mitigate", meaning: "giảm thiểu tác động", example: "We need to mitigate user impact." },
        ],
      },
      {
        title: "Client demo",
        section: "PART 2 · Production",
        icon: "Monitor",
        sortOrder: 5,
        requiresPremium: true,
        scenarioTitle: "Demo tính năng cho khách hàng",
        aiSystemPrompt:
          "You are a non-technical client. Ask simple questions. Make the learner avoid jargon or explain it.",
        vocab: [
          { term: "walk through", meaning: "hướng dẫn từng bước", example: "Let me walk you through the flow." },
          { term: "latency", meaning: "độ trễ", example: "The latency is under 200ms." },
          { term: "scope", meaning: "phạm vi", example: "That feature is out of scope." },
        ],
      },
    ],
  },
];

module.exports = { SPECIALIZED_SEED: FIELDS };
