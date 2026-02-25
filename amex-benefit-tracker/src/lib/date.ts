import { MONTH_NAMES_SHORT } from "../constants";

export function toIsoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso() {
  return toIsoLocalDate(new Date());
}

export function parseLocalDate(value: string) {
  const [yearStr, monthStr, dayStr] = value.split("-");
  return new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function formatDateLabel(isoDate: string) {
  const date = parseLocalDate(isoDate);
  return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
