import { MONTHS_PER_CADENCE, MONTH_NAMES_SHORT } from "../constants";
import type { Benefit, BenefitCycleSummary, BenefitStatus, Cadence, CycleWindow, Transaction, TransactionKind } from "../types";
import { addMonths, parseLocalDate } from "./date";

const EPSILON = 0.005;

export function getMonthsForCadence(cadence: Cadence) {
  return MONTHS_PER_CADENCE[cadence];
}

export function getCycleWindowForDate(reference: Date, benefit: Benefit): CycleWindow {
  const cycleMonths = getMonthsForCadence(benefit.cadence);
  const refMonthIndex = reference.getFullYear() * 12 + reference.getMonth();
  const anchorMonthIndex = benefit.anchorMonth - 1;
  const offsetFromAnchor = refMonthIndex - anchorMonthIndex;
  const cycleIndex = Math.floor(offsetFromAnchor / cycleMonths);
  const cycleStartMonthIndex = anchorMonthIndex + cycleIndex * cycleMonths;
  const startYear = Math.floor(cycleStartMonthIndex / 12);
  const startMonth = cycleStartMonthIndex % 12;
  const start = new Date(startYear, startMonth, 1);
  const endExclusive = addMonths(start, cycleMonths);
  return { start, endExclusive };
}

export function shiftCycle(cycle: CycleWindow, benefit: Benefit, offset: number): CycleWindow {
  const cycleMonths = getMonthsForCadence(benefit.cadence);
  return {
    start: addMonths(cycle.start, cycleMonths * offset),
    endExclusive: addMonths(cycle.endExclusive, cycleMonths * offset),
  };
}

export function formatCycleLabel(cycle: CycleWindow, cadence: Cadence) {
  const startMonth = cycle.start.getMonth();
  const startYear = cycle.start.getFullYear();
  const months = getMonthsForCadence(cadence);
  if (months === 1) return `${MONTH_NAMES_SHORT[startMonth]} ${startYear}`;
  if (months === 3 && startMonth % 3 === 0) return `Q${Math.floor(startMonth / 3) + 1} ${startYear}`;

  const end = new Date(cycle.endExclusive.getFullYear(), cycle.endExclusive.getMonth() - 1, 1);
  const sameYear = end.getFullYear() === startYear;
  const endLabel = sameYear ? MONTH_NAMES_SHORT[end.getMonth()] : `${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  return `${MONTH_NAMES_SHORT[startMonth]}-${endLabel} ${sameYear ? startYear : ""}`.trim();
}

function matchesAnyKeyword(description: string, keywords: string[]) {
  if (keywords.length === 0) return false;
  const haystack = description.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function benefitMatchesTransaction(benefit: Benefit, tx: Transaction, kind: TransactionKind) {
  const keywordSet = kind === "purchase"
    ? benefit.purchaseKeywords
    : (benefit.refundKeywords.length > 0 ? benefit.refundKeywords : benefit.purchaseKeywords);
  return tx.kind === kind && matchesAnyKeyword(tx.description, keywordSet);
}

export function summarizeBenefitCycle(benefit: Benefit, txs: Transaction[], cycle: CycleWindow): BenefitCycleSummary {
  const startMs = cycle.start.getTime();
  const endMs = cycle.endExclusive.getTime();
  let purchaseTotal = 0;
  let refundTotal = 0;
  let matchedPurchases = 0;
  let matchedRefunds = 0;

  for (const tx of txs) {
    const txDateMs = parseLocalDate(tx.date).getTime();
    if (txDateMs < startMs || txDateMs >= endMs) continue;

    if (benefitMatchesTransaction(benefit, tx, "purchase")) {
      purchaseTotal += tx.amount;
      matchedPurchases += 1;
    }

    if (benefitMatchesTransaction(benefit, tx, "refund")) {
      refundTotal += tx.amount;
      matchedRefunds += 1;
    }
  }

  let status: BenefitStatus = "inactive";
  if (refundTotal + EPSILON >= benefit.amount) {
    status = "complete";
  } else if (purchaseTotal > 0) {
    status = "purchased";
  }

  return {
    benefitId: benefit.id,
    cycle,
    purchaseTotal,
    refundTotal,
    matchedPurchases,
    matchedRefunds,
    status,
  };
}
