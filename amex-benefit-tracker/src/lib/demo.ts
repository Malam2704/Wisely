import { DEFAULT_BENEFITS } from "../constants";
import type { Transaction } from "../types";
import { getCycleWindowForDate } from "./benefitEngine";
import { toIsoLocalDate } from "./date";
import { uid } from "./domainUtils";

export function makeDemoTransactions(): Transaction[] {
  const now = new Date();
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), Math.min(5, now.getDate()));
  const quarterStart = getCycleWindowForDate(now, DEFAULT_BENEFITS[1]).start;

  return [
    {
      id: uid(),
      date: toIsoLocalDate(currentMonthDate),
      description: "WALMART PLUS MONTHLY MEMBERSHIP",
      amount: 13.99,
      kind: "purchase",
      source: "manual",
    },
    {
      id: uid(),
      date: toIsoLocalDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), currentMonthDate.getDate() + 2)),
      description: "AMEX WALMART+ CREDIT",
      amount: 13.99,
      kind: "refund",
      source: "manual",
    },
    {
      id: uid(),
      date: toIsoLocalDate(new Date(quarterStart.getFullYear(), quarterStart.getMonth(), 10)),
      description: "LULULEMON STORE PURCHASE",
      amount: 88.45,
      kind: "purchase",
      source: "manual",
    },
  ];
}
