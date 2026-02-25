export type Cadence = "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
export type TransactionKind = "purchase" | "refund";
export type BenefitStatus = "inactive" | "purchased" | "complete";
export type TabKey = "tracker" | "transactions" | "admin";
export type TransactionSource = "manual" | "csv";

export type Benefit = {
  id: string;
  name: string;
  description: string;
  amount: number;
  cadence: Cadence;
  anchorMonth: number;
  purchaseKeywords: string[];
  refundKeywords: string[];
  active: boolean;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  kind: TransactionKind;
  source: TransactionSource;
};

export type CycleWindow = {
  start: Date;
  endExclusive: Date;
};

export type BenefitCycleSummary = {
  benefitId: string;
  cycle: CycleWindow;
  purchaseTotal: number;
  refundTotal: number;
  matchedPurchases: number;
  matchedRefunds: number;
  status: BenefitStatus;
};

export type CsvImportResult = {
  transactions: Transaction[];
  warnings: string[];
};

export type TrackerSummaryItem = {
  benefit: Benefit;
  current: BenefitCycleSummary;
  previous: BenefitCycleSummary;
  nextReset: Date;
};

export type AnnualProgress = {
  possiblePeriods: number;
  completedPeriods: number;
};
