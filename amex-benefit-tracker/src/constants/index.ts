import type { Benefit, Cadence } from "../types";

export const BENEFITS_STORAGE_KEY = "amex-benefit-tracker:benefits:v1";
export const TRANSACTIONS_STORAGE_KEY = "amex-benefit-tracker:transactions:v1";

export const CADENCE_LABELS: Record<Cadence, string> = {
  monthly: "Monthly",
  bimonthly: "Bimonthly (every 2 months)",
  quarterly: "Quarterly",
  semiannual: "Semiannual",
  annual: "Annual",
};

export const MONTHS_PER_CADENCE: Record<Cadence, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const MONTH_NAMES_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DEFAULT_BENEFITS: Benefit[] = [
  {
    id: "walmart-plus",
    name: "Walmart+ Membership",
    description: "Monthly reimbursement for Walmart+ subscription.",
    amount: 13.99,
    cadence: "monthly",
    anchorMonth: 1,
    purchaseKeywords: ["WALMART", "WALMART PLUS", "WALMART+"],
    refundKeywords: ["WALMART", "AMEX", "CREDIT"],
    active: true,
  },
  {
    id: "lululemon-quarterly",
    name: "Lululemon Credit",
    description: "Quarterly Lululemon credit (example benefit).",
    amount: 75,
    cadence: "quarterly",
    anchorMonth: 1,
    purchaseKeywords: ["LULULEMON"],
    refundKeywords: ["LULULEMON", "AMEX", "CREDIT"],
    active: true,
  },
];
