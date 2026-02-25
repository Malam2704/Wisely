import type { CsvImportResult, Transaction, TransactionKind } from "../types";
import { toIsoLocalDate } from "./date";
import { uid } from "./utils";

export function parseCsv(text: string): CsvImportResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { transactions: [], warnings: ["CSV was empty."] };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const header = rows[0].map((cell) => cell.trim().toLowerCase());

  const dateIdx = findHeaderIndex(header, ["date", "posted date", "transaction date"]);
  const descIdx = findHeaderIndex(header, ["description", "merchant", "name", "details"]);
  const amountIdx = findHeaderIndex(header, ["amount", "amt", "value"]);
  const typeIdx = findHeaderIndex(header, ["type", "kind", "transaction type"]);

  if (dateIdx < 0 || descIdx < 0 || amountIdx < 0) {
    return {
      transactions: [],
      warnings: ["Missing required CSV columns. Expected at least date, description, and amount."],
    };
  }

  const warnings: string[] = [];
  const transactions: Transaction[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rawDate = (row[dateIdx] ?? "").trim();
    const rawDescription = (row[descIdx] ?? "").trim();
    const rawAmount = (row[amountIdx] ?? "").trim();
    const rawType = typeIdx >= 0 ? (row[typeIdx] ?? "").trim() : "";

    if (!rawDate && !rawDescription && !rawAmount) continue;

    const parsedDate = normalizeDateString(rawDate);
    const parsedAmount = parseNumber(rawAmount);

    if (!parsedDate || !rawDescription || parsedAmount === null || parsedAmount === 0) {
      warnings.push(`Skipped row ${i + 1}: invalid date/description/amount.`);
      continue;
    }

    transactions.push({
      id: uid(),
      date: parsedDate,
      description: rawDescription,
      amount: Math.abs(parsedAmount),
      kind: inferKind(parsedAmount, rawType),
      source: "csv",
    });
  }

  return { transactions, warnings };
}

function parseDelimitedLine(line: string, delimiter: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  out.push(current);
  return out;
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.includes(header));
}

function normalizeDateString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoLocalDate(parsed);
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[()]/g, "");
  if (!cleaned) return null;
  const numeric = Number(cleaned.replace(/[^\d.-]/g, ""));
  if (Number.isNaN(numeric)) return null;

  if (value.includes("(") && value.includes(")")) {
    return -Math.abs(numeric);
  }
  return numeric;
}

function inferKind(amount: number, rawType: string): TransactionKind {
  const typeLower = rawType.toLowerCase();
  if (typeLower.includes("refund") || typeLower.includes("credit")) return "refund";
  if (typeLower.includes("purchase") || typeLower.includes("debit")) return "purchase";
  return amount < 0 ? "refund" : "purchase";
}
