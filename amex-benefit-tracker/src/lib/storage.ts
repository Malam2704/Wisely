import { BENEFITS_STORAGE_KEY, DEFAULT_BENEFITS, TRANSACTIONS_STORAGE_KEY } from "../constants";
import type { Benefit, Transaction, TransactionKind } from "../types";
import { todayIso } from "./date";
import { uid } from "./domainUtils";

export function loadBenefits(): Benefit[] {
  try {
    const raw = localStorage.getItem(BENEFITS_STORAGE_KEY);
    if (!raw) return DEFAULT_BENEFITS;
    const parsed = JSON.parse(raw) as Benefit[];
    if (!Array.isArray(parsed)) return DEFAULT_BENEFITS;
    return parsed.map((benefit) => ({
      ...benefit,
      purchaseKeywords: Array.isArray(benefit.purchaseKeywords) ? benefit.purchaseKeywords : [],
      refundKeywords: Array.isArray(benefit.refundKeywords) ? benefit.refundKeywords : [],
      anchorMonth: Math.min(12, Math.max(1, Number(benefit.anchorMonth) || 1)),
      active: benefit.active !== false,
    }));
  } catch {
    return DEFAULT_BENEFITS;
  }
}

export function saveBenefits(benefits: Benefit[]) {
  localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(benefits));
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Transaction[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((tx) => {
        const kind: TransactionKind = tx.kind === "refund" ? "refund" : "purchase";
        const source: Transaction["source"] = tx.source === "csv" ? "csv" : "manual";
        return {
          id: String(tx.id ?? uid()),
          date: String(tx.date ?? todayIso()),
          description: String(tx.description ?? ""),
          amount: Math.abs(Number(tx.amount ?? 0)),
          kind,
          source,
        };
      })
      .filter((tx) => tx.description && tx.amount > 0);
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
}
