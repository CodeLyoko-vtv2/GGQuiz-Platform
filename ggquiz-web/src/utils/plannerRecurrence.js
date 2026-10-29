const WEEKDAY_FULL = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

export function isLastWeekdayOfMonth(date) {
  const next = new Date(date);
  next.setDate(date.getDate() + 7);
  return next.getMonth() !== date.getMonth();
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function monthDiff(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function startOfWeekMon(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function weeksBetween(from, to) {
  return Math.round((startOfWeekMon(to) - startOfWeekMon(from)) / 604800000);
}

function applyTime(day, template) {
  const next = new Date(day);
  next.setHours(template.getHours(), template.getMinutes(), template.getSeconds(), 0);
  return next;
}

function presetToRule(recurrence, start) {
  const rec = recurrence || { preset: "none" };
  if (rec.preset === "custom") {
    return {
      freq: rec.freq || "week",
      interval: Math.max(1, Number(rec.interval) || 1),
      weekdays:
        rec.freq === "week"
          ? rec.weekdays?.length
            ? rec.weekdays
            : [start.getDay()]
          : [],
    };
  }
  if (rec.preset === "daily") return { freq: "day", interval: 1, weekdays: [] };
  if (rec.preset === "weekly") return { freq: "week", interval: 1, weekdays: [start.getDay()] };
  if (rec.preset === "weekdays") return { freq: "week", interval: 1, weekdays: [1, 2, 3, 4, 5] };
  if (rec.preset === "monthly") return { freq: "month", interval: 1, weekdays: [] };
  if (rec.preset === "monthly_last_weekday") {
    return { freq: "month_last", interval: 1, weekdays: [start.getDay()] };
  }
  if (rec.preset === "yearly") return { freq: "year", interval: 1, weekdays: [] };
  return null;
}

function matchesRule(cursor, start, rule) {
  if (startOfDay(cursor) < startOfDay(start)) return false;
  if (rule.freq === "day") {
    const days = Math.round((startOfDay(cursor) - startOfDay(start)) / 86400000);
    return days >= 0 && days % rule.interval === 0;
  }
  if (rule.freq === "week") {
    if (!rule.weekdays.includes(cursor.getDay())) return false;
    return weeksBetween(start, cursor) % rule.interval === 0;
  }
  if (rule.freq === "month") {
    if (cursor.getDate() !== start.getDate()) return false;
    return monthDiff(start, cursor) % rule.interval === 0;
  }
  if (rule.freq === "month_last") {
    if (cursor.getDay() !== start.getDay() || !isLastWeekdayOfMonth(cursor)) return false;
    return monthDiff(start, cursor) % rule.interval === 0;
  }
  if (rule.freq === "year") {
    if (cursor.getDate() !== start.getDate() || cursor.getMonth() !== start.getMonth()) {
      return false;
    }
    return (cursor.getFullYear() - start.getFullYear()) % rule.interval === 0;
  }
  return false;
}

export function recurrencePresets(startIso) {
  const start = new Date(startIso || Date.now());
  const wd = WEEKDAY_FULL[start.getDay()];
  const options = [
    { id: "none", label: "Không lặp lại" },
    { id: "daily", label: "Hằng ngày" },
    { id: "weekly", label: `Hằng tuần vào ${wd.toLowerCase()}` },
    { id: "monthly", label: `Hằng tháng vào ngày ${start.getDate()}` },
  ];
  if (isLastWeekdayOfMonth(start)) {
    options.push({
      id: "monthly_last_weekday",
      label: `Hằng tháng vào ${wd.toLowerCase()} cuối cùng`,
    });
  }
  options.push(
    {
      id: "yearly",
      label: `Hằng năm vào ngày ${start.getDate()} tháng ${start.getMonth() + 1}`,
    },
    { id: "weekdays", label: "Mỗi ngày trong tuần (Thứ Hai đến Thứ Sáu)" },
    { id: "custom", label: "Tùy chỉnh..." }
  );
  return options;
}

export function recurrenceLabel(recurrence, startIso) {
  const presets = recurrencePresets(startIso);
  const rec = recurrence || { preset: "none" };
  if (rec.preset === "custom") {
    const unit =
      rec.freq === "day"
        ? "ngày"
        : rec.freq === "month"
          ? "tháng"
          : rec.freq === "year"
            ? "năm"
            : "tuần";
    return `Mỗi ${rec.interval || 1} ${unit}`;
  }
  return presets.find((item) => item.id === rec.preset)?.label || "Không lặp lại";
}

export function expandEvent(event, rangeStart, rangeEnd) {
  const start = new Date(event.start);
  const end = new Date(event.end || event.start);
  const duration = Math.max(end - start, event.allDay ? 86400000 : 60 * 60 * 1000);
  const rec = event.recurrence;
  const rule = presetToRule(rec, start);

  if (!rule) {
    if (end < rangeStart || start > rangeEnd) return [];
    return [event];
  }

  let hardEnd = rangeEnd;
  if (rec.endType === "until" && rec.until) {
    const until = new Date(`${rec.until}T23:59:59`);
    if (until < hardEnd) hardEnd = until;
  }
  const maxCount = rec.endType === "count" ? Math.max(1, Number(rec.count) || 1) : 400;
  const occurrences = [];
  let cursor = startOfDay(start);
  let count = 0;
  const walkEnd = addDays(hardEnd, 1);

  while (cursor <= walkEnd && count < maxCount) {
    if (matchesRule(cursor, start, rule)) {
      const occStart = event.allDay ? startOfDay(cursor) : applyTime(cursor, start);
      const occEnd = new Date(occStart.getTime() + duration);
      if (occEnd >= rangeStart && occStart <= rangeEnd) {
        occurrences.push({
          ...event,
          id: `${event.id}::${occStart.toISOString()}`,
          sourceId: event.id,
          start: event.allDay
            ? occStart.toISOString()
            : occStart.toISOString(),
          end: occEnd.toISOString(),
        });
      }
      count += 1;
    }
    cursor = addDays(cursor, 1);
  }
  return occurrences;
}

export function expandEvents(events, rangeStart, rangeEnd) {
  return events.flatMap((event) => expandEvent(event, rangeStart, rangeEnd));
}
