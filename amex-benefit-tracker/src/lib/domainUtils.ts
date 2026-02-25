import type { Benefit } from "../types";

export function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toMoney(value: number) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function normalizeKeywords(input: string) {
  return input
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function makeBlankBenefit(): Benefit {
  return {
    id: uid(),
    name: "",
    description: "",
    amount: 0,
    cadence: "monthly",
    anchorMonth: 1,
    purchaseKeywords: [],
    refundKeywords: [],
    active: true,
  };
}
