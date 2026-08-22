export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

function localDate(value = new Date()) {
  if (value instanceof Date) return new Date(value.getTime());
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return new Date(value);
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonday(date = new Date()) {
  const d = localDate(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return localDateString(d);
}

export function addDays(dateString, days) {
  const d = localDate(dateString);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

export function addWeeks(dateString, weeks) {
  return addDays(dateString, weeks * 7);
}

export function formatWeekRange(weekStartDate) {
  const start = localDate(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

