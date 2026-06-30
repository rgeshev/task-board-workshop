export function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function truncate(text, maxLength = 80) {
  if (!text) return '';
  const value = String(text).trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function toDateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDueDate(dateStr) {
  const normalized = toDateOnly(dateStr);
  if (!normalized) return '';

  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getDueDateStatus(dueDate, done = false) {
  const normalized = toDateOnly(dueDate);
  if (!normalized) return 'none';

  const today = todayDateString();
  if (normalized < today && !done) return 'overdue';
  if (normalized === today) return 'today';

  const [year, month, day] = normalized.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const weekEnd = new Date(todayDate);
  weekEnd.setDate(weekEnd.getDate() + 7);

  if (due <= weekEnd) return 'soon';
  return 'later';
}

const DEADLINE_GROUPS = [
  { key: 'overdue', label: 'Overdue', icon: 'bi-exclamation-circle' },
  { key: 'today', label: 'Due today', icon: 'bi-calendar-check' },
  { key: 'soon', label: 'This week', icon: 'bi-calendar-week' },
  { key: 'later', label: 'Later', icon: 'bi-calendar-event' },
  { key: 'none', label: 'No deadline', icon: 'bi-calendar-x' },
];

export function groupTasksByDeadline(tasks) {
  const buckets = Object.fromEntries(DEADLINE_GROUPS.map((group) => [group.key, []]));

  tasks.forEach((task) => {
    const status = getDueDateStatus(task.due_date, task.done);
    buckets[status].push(task);
  });

  return DEADLINE_GROUPS.map((group) => ({
    ...group,
    tasks: buckets[group.key],
  })).filter((group) => group.tasks.length > 0);
}

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const formatted = value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[exponent]}`;
}
