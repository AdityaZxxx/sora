const shortDueDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function dueLabel(item: { isOverdue: boolean; dueDate: Date | null }) {
  return item.isOverdue && item.dueDate
    ? `Overdue since ${shortDueDate(item.dueDate)}`
    : "Due today";
}

const WEEKDAY_NAMES = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

export function nextLabel(item: {
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
}) {
  if (item.frequency === "weekly") {
    return `Every ${WEEKDAY_NAMES[item.weekday ?? 0]}`;
  }
  return `Day ${item.dayOfMonth} of the month`;
}
