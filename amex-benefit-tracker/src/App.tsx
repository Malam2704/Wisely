import { useEffect, useMemo, useState } from "react";

type Cadence = "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
type TransactionKind = "purchase" | "refund";
type BenefitStatus = "inactive" | "purchased" | "complete";
type TabKey = "tracker" | "transactions" | "admin";

type Benefit = {
  id: string;
  name: string;
  description: string;
  amount: number;
  cadence: Cadence;
  anchorMonth: number; // 1-12, start month for multi-month cycles
  purchaseKeywords: string[];
  refundKeywords: string[];
  active: boolean;
};

type Transaction = {
  id: string;
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // always positive
  kind: TransactionKind;
  source: "manual" | "csv";
};

type CycleWindow = {
  start: Date;
  endExclusive: Date;
};

type BenefitCycleSummary = {
  benefitId: string;
  cycle: CycleWindow;
  purchaseTotal: number;
  refundTotal: number;
  matchedPurchases: number;
  matchedRefunds: number;
  status: BenefitStatus;
};

type CsvImportResult = {
  transactions: Transaction[];
  warnings: string[];
};

const BENEFITS_STORAGE_KEY = "amex-benefit-tracker:benefits:v1";
const TRANSACTIONS_STORAGE_KEY = "amex-benefit-tracker:transactions:v1";

const CADENCE_LABELS: Record<Cadence, string> = {
  monthly: "Monthly",
  bimonthly: "Bimonthly (every 2 months)",
  quarterly: "Quarterly",
  semiannual: "Semiannual",
  annual: "Annual",
};

const MONTHS_PER_CADENCE: Record<Cadence, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_LONG = [
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

const EPSILON = 0.005;

const DEFAULT_BENEFITS: Benefit[] = [
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

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toMoney(value: number) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function todayIso() {
  const now = new Date();
  return toIsoLocalDate(now);
}

function toIsoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMonthsForCadence(cadence: Cadence) {
  return MONTHS_PER_CADENCE[cadence];
}

function getCycleWindowForDate(reference: Date, benefit: Benefit): CycleWindow {
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

function shiftCycle(cycle: CycleWindow, benefit: Benefit, offset: number): CycleWindow {
  const cycleMonths = getMonthsForCadence(benefit.cadence);
  const start = addMonths(cycle.start, cycleMonths * offset);
  const endExclusive = addMonths(cycle.endExclusive, cycleMonths * offset);
  return { start, endExclusive };
}

function formatCycleLabel(cycle: CycleWindow, cadence: Cadence) {
  const startMonth = cycle.start.getMonth();
  const startYear = cycle.start.getFullYear();
  const months = getMonthsForCadence(cadence);
  if (months === 1) {
    return `${MONTH_NAMES_SHORT[startMonth]} ${startYear}`;
  }
  if (months === 3 && startMonth % 3 === 0) {
    return `Q${Math.floor(startMonth / 3) + 1} ${startYear}`;
  }
  const end = new Date(cycle.endExclusive.getFullYear(), cycle.endExclusive.getMonth() - 1, 1);
  const sameYear = end.getFullYear() === startYear;
  const endLabel = sameYear ? MONTH_NAMES_SHORT[end.getMonth()] : `${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  return `${MONTH_NAMES_SHORT[startMonth]}-${endLabel} ${sameYear ? startYear : ""}`.trim();
}

function formatDateLabel(isoDate: string) {
  const date = parseLocalDate(isoDate);
  return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function normalizeKeywords(input: string) {
  return input
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
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
  if (!matchesAnyKeyword(tx.description, keywordSet)) return false;
  return tx.kind === kind;
}

function summarizeBenefitCycle(benefit: Benefit, txs: Transaction[], cycle: CycleWindow): BenefitCycleSummary {
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

function loadBenefits(): Benefit[] {
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

function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Transaction[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((tx) => ({
        id: String(tx.id ?? uid()),
        date: String(tx.date ?? todayIso()),
        description: String(tx.description ?? ""),
        amount: Math.abs(Number(tx.amount ?? 0)),
        kind: tx.kind === "refund" ? "refund" : "purchase",
        source: tx.source === "csv" ? "csv" : "manual",
      }))
      .filter((tx) => tx.description && tx.amount > 0);
  } catch {
    return [];
  }
}

function parseCsv(text: string): CsvImportResult {
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

  const warnings: string[] = [];
  if (dateIdx < 0 || descIdx < 0 || amountIdx < 0) {
    return {
      transactions: [],
      warnings: [
        "Missing required CSV columns. Expected at least date, description, and amount.",
      ],
    };
  }

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

    const kind = inferKind(parsedAmount, rawType);
    transactions.push({
      id: uid(),
      date: parsedDate,
      description: rawDescription,
      amount: Math.abs(parsedAmount),
      kind,
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

  const isParenNegative = value.includes("(") && value.includes(")");
  if (isParenNegative) return -Math.abs(numeric);
  return numeric;
}

function inferKind(amount: number, rawType: string): TransactionKind {
  const typeLower = rawType.toLowerCase();
  if (typeLower.includes("refund") || typeLower.includes("credit")) return "refund";
  if (typeLower.includes("purchase") || typeLower.includes("debit")) return "purchase";
  return amount < 0 ? "refund" : "purchase";
}

function makeBlankBenefit(): Benefit {
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

function App() {
  const [tab, setTab] = useState<TabKey>("tracker");
  const [benefits, setBenefits] = useState<Benefit[]>(() => loadBenefits());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [csvText, setCsvText] = useState("");

  useEffect(() => {
    localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(benefits));
  }, [benefits]);

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const dateDiff = parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id.localeCompare(a.id);
      }),
    [transactions]
  );

  const activeBenefits = useMemo(() => benefits.filter((benefit) => benefit.active), [benefits]);

  const trackerSummaries = useMemo(() => {
    const now = new Date();
    return activeBenefits.map((benefit) => {
      const currentCycle = getCycleWindowForDate(now, benefit);
      const current = summarizeBenefitCycle(benefit, transactions, currentCycle);
      const previous = summarizeBenefitCycle(benefit, transactions, shiftCycle(currentCycle, benefit, -1));
      const nextReset = currentCycle.endExclusive;
      return { benefit, current, previous, nextReset };
    });
  }, [activeBenefits, transactions]);

  const trackerCounts = useMemo(() => {
    return trackerSummaries.reduce(
      (acc, item) => {
        acc[item.current.status] += 1;
        return acc;
      },
      { inactive: 0, purchased: 0, complete: 0 } as Record<BenefitStatus, number>
    );
  }, [trackerSummaries]);

  const annualProgress = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

    let possiblePeriods = 0;
    let completedPeriods = 0;

    for (const benefit of activeBenefits) {
      let cursor = getCycleWindowForDate(yearStart, benefit);
      if (cursor.endExclusive <= yearStart) {
        cursor = shiftCycle(cursor, benefit, 1);
      }
      while (cursor.start < yearEnd) {
        possiblePeriods += 1;
        const summary = summarizeBenefitCycle(benefit, transactions, cursor);
        if (summary.status === "complete") completedPeriods += 1;
        cursor = shiftCycle(cursor, benefit, 1);
      }
    }

    return { possiblePeriods, completedPeriods };
  }, [activeBenefits, transactions]);

  function addManualTransaction(form: {
    date: string;
    description: string;
    amount: number;
    kind: TransactionKind;
  }) {
    if (!form.description.trim() || !(form.amount > 0)) return;
    setTransactions((prev) => [
      {
        id: uid(),
        date: form.date,
        description: form.description.trim(),
        amount: Math.abs(form.amount),
        kind: form.kind,
        source: "manual",
      },
      ...prev,
    ]);
  }

  function importCsvText() {
    const result = parseCsv(csvText);
    setCsvWarnings(result.warnings);
    if (result.transactions.length === 0) return;
    setTransactions((prev) => [...result.transactions, ...prev]);
    setCsvText("");
  }

  function importCsvFile(file: File) {
    file.text().then((text) => {
      const result = parseCsv(text);
      setCsvWarnings(result.warnings);
      if (result.transactions.length > 0) {
        setTransactions((prev) => [...result.transactions, ...prev]);
      }
    });
  }

  function upsertBenefit(next: Benefit) {
    setBenefits((prev) => {
      const idx = prev.findIndex((item) => item.id === next.id);
      if (idx === -1) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }

  function deleteBenefit(id: string) {
    setBenefits((prev) => prev.filter((benefit) => benefit.id !== id));
  }

  function deleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }

  function seedDemoTransactions() {
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), Math.min(5, now.getDate()));
    const quarterStart = getCycleWindowForDate(now, DEFAULT_BENEFITS[1]).start;
    const demo: Transaction[] = [
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
    setTransactions((prev) => [...demo, ...prev]);
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Amex Platinum Benefit Tracker</p>
          <h1>Track credits by billing cycle and completion status</h1>
          <p className="hero-copy">
            Add benefits in the admin page, import or enter transactions, and the app will mark each cycle as{" "}
            <strong>inactive</strong>, <strong>purchased</strong>, or <strong>complete</strong>.
          </p>
        </div>
        <div className="hero-panel">
          <div className="stat-grid">
            <SummaryTile label="Complete now" value={String(trackerCounts.complete)} tone="complete" />
            <SummaryTile label="Purchased / waiting" value={String(trackerCounts.purchased)} tone="purchased" />
            <SummaryTile label="Inactive now" value={String(trackerCounts.inactive)} tone="inactive" />
            <SummaryTile
              label="Year progress"
              value={`${annualProgress.completedPeriods}/${annualProgress.possiblePeriods || 0}`}
              tone="neutral"
            />
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        <TabButton label="Tracker" active={tab === "tracker"} onClick={() => setTab("tracker")} />
        <TabButton label="Transactions" active={tab === "transactions"} onClick={() => setTab("transactions")} />
        <TabButton label="Admin" active={tab === "admin"} onClick={() => setTab("admin")} />
      </nav>

      {tab === "tracker" ? (
        <section className="stack-lg">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Current cycle status</h2>
                <p>
                  Each benefit is matched against transactions in its current cycle window using merchant/refund keywords.
                </p>
              </div>
            </div>
            {trackerSummaries.length === 0 ? (
              <EmptyState text="No active benefits yet. Add one in the Admin tab." />
            ) : (
              <div className="benefit-grid">
                {trackerSummaries.map(({ benefit, current, previous, nextReset }) => (
                  <article key={benefit.id} className="benefit-card">
                    <div className="benefit-card-head">
                      <div>
                        <h3>{benefit.name}</h3>
                        <p>{benefit.description || `${CADENCE_LABELS[benefit.cadence]} credit`}</p>
                      </div>
                      <StatusPill status={current.status} />
                    </div>

                    <div className="benefit-meta">
                      <span>{toMoney(benefit.amount)} target</span>
                      <span>{CADENCE_LABELS[benefit.cadence]}</span>
                      <span>Current: {formatCycleLabel(current.cycle, benefit.cadence)}</span>
                    </div>

                    <div className="progress-rows">
                      <ProgressRow
                        label="Purchases"
                        value={`${toMoney(current.purchaseTotal)} (${current.matchedPurchases} tx)`}
                        ratio={Math.min(current.purchaseTotal / Math.max(benefit.amount, 0.01), 1)}
                        tone="purchase"
                      />
                      <ProgressRow
                        label="Refunds"
                        value={`${toMoney(current.refundTotal)} (${current.matchedRefunds} tx)`}
                        ratio={Math.min(current.refundTotal / Math.max(benefit.amount, 0.01), 1)}
                        tone="refund"
                      />
                    </div>

                    <div className="benefit-footer">
                      <span>Next reset: {`${MONTH_NAMES_LONG[nextReset.getMonth()]} 1, ${nextReset.getFullYear()}`}</span>
                      <span>
                        Previous: {formatCycleLabel(previous.cycle, benefit.cadence)} • {previous.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Bank account connection (next step)</h2>
                <p>
                  The app is ready to evaluate transactions, but bank sync is not wired yet. For now use manual entries or CSV imports.
                </p>
              </div>
            </div>
            <div className="integration-grid">
              <div className="integration-card">
                <h3>Current flow</h3>
                <ul>
                  <li>Add benefit rules in Admin</li>
                  <li>Import transaction CSV or enter manually</li>
                  <li>App auto-updates current cycle statuses</li>
                </ul>
              </div>
              <div className="integration-card">
                <h3>Future bank sync</h3>
                <ul>
                  <li>Plaid or MX connection</li>
                  <li>Merchant normalization rules</li>
                  <li>Scheduled refresh and notifications</li>
                </ul>
              </div>
            </div>
          </section>
        </section>
      ) : null}

      {tab === "transactions" ? (
        <section className="stack-lg">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Add transactions</h2>
                <p>
                  Manual entries work for quick testing. CSV import expects columns like <code>date</code>, <code>description</code>,{" "}
                  <code>amount</code>, optional <code>type</code>.
                </p>
              </div>
              <button className="button secondary" type="button" onClick={seedDemoTransactions}>
                Add demo transactions
              </button>
            </div>
            <div className="txn-input-grid">
              <ManualTransactionForm onSubmit={addManualTransaction} />
              <CsvImportPanel
                csvText={csvText}
                setCsvText={setCsvText}
                onImport={importCsvText}
                onFileSelect={importCsvFile}
                warnings={csvWarnings}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Transaction history</h2>
                <p>{sortedTransactions.length} transaction(s) loaded into the tracker.</p>
              </div>
              {sortedTransactions.length > 0 ? (
                <button className="button danger" type="button" onClick={() => setTransactions([])}>
                  Clear all transactions
                </button>
              ) : null}
            </div>
            {sortedTransactions.length === 0 ? (
              <EmptyState text="No transactions yet. Add one manually or import a CSV." />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Source</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDateLabel(tx.date)}</td>
                        <td>{tx.description}</td>
                        <td>
                          <span className={`tag ${tx.kind === "refund" ? "tag-refund" : "tag-purchase"}`}>{tx.kind}</span>
                        </td>
                        <td>{toMoney(tx.amount)}</td>
                        <td>{tx.source}</td>
                        <td>
                          <button className="text-button" type="button" onClick={() => deleteTransaction(tx.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      ) : null}

      {tab === "admin" ? (
        <section className="stack-lg">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Benefit configuration</h2>
                <p>
                  Define how each Amex credit is detected: cadence, amount, purchase keywords, and refund keywords.
                </p>
              </div>
            </div>
            <BenefitEditor
              benefits={benefits}
              onSave={upsertBenefit}
              onDelete={deleteBenefit}
              onResetDefaults={() => setBenefits(DEFAULT_BENEFITS)}
            />
          </section>
        </section>
      ) : null}
    </div>
  );
}

function TabButton(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`tab-button${props.active ? " active" : ""}`}
      aria-pressed={props.active}
    >
      {props.label}
    </button>
  );
}

function SummaryTile(props: { label: string; value: string; tone: "complete" | "purchased" | "inactive" | "neutral" }) {
  return (
    <div className={`summary-tile ${props.tone}`}>
      <div className="summary-value">{props.value}</div>
      <div className="summary-label">{props.label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: BenefitStatus }) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}

function ProgressRow(props: { label: string; value: string; ratio: number; tone: "purchase" | "refund" }) {
  return (
    <div className="progress-row">
      <div className="progress-head">
        <span>{props.label}</span>
        <strong>{props.value}</strong>
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill ${props.tone}`}
          style={{ width: `${Math.max(0, Math.min(1, props.ratio)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function ManualTransactionForm(props: {
  onSubmit: (form: { date: string; description: string; amount: number; kind: TransactionKind }) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<TransactionKind>("purchase");

  return (
    <form
      className="subpanel"
      onSubmit={(event) => {
        event.preventDefault();
        const amountNumber = Number(amount);
        if (!description.trim() || !(amountNumber > 0)) return;
        props.onSubmit({ date, description, amount: amountNumber, kind });
        setDescription("");
        setAmount("");
      }}
    >
      <h3>Manual entry</h3>
      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>
        Description
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="WALMART PLUS MONTHLY MEMBERSHIP"
          required
        />
      </label>
      <div className="field-row">
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as TransactionKind)}>
            <option value="purchase">purchase</option>
            <option value="refund">refund</option>
          </select>
        </label>
        <label>
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="13.99"
            required
          />
        </label>
      </div>
      <button className="button" type="submit">
        Add transaction
      </button>
    </form>
  );
}

function CsvImportPanel(props: {
  csvText: string;
  setCsvText: (value: string) => void;
  onImport: () => void;
  onFileSelect: (file: File) => void;
  warnings: string[];
}) {
  return (
    <div className="subpanel">
      <h3>CSV import</h3>
      <label>
        Upload CSV file
        <input
          type="file"
          accept=".csv,.txt,.tsv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) props.onFileSelect(file);
            e.currentTarget.value = "";
          }}
        />
      </label>
      <label>
        Or paste CSV text
        <textarea
          rows={8}
          value={props.csvText}
          onChange={(e) => props.setCsvText(e.target.value)}
          placeholder={"date,description,amount,type\n2026-02-01,WALMART PLUS MONTHLY MEMBERSHIP,13.99,purchase\n2026-02-03,AMEX WALMART+ CREDIT,13.99,refund"}
        />
      </label>
      <button className="button" type="button" onClick={props.onImport} disabled={!props.csvText.trim()}>
        Import pasted CSV
      </button>
      {props.warnings.length > 0 ? (
        <div className="warning-box">
          <strong>Import notes</strong>
          <ul>
            {props.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BenefitEditor(props: {
  benefits: Benefit[];
  onSave: (benefit: Benefit) => void;
  onDelete: (id: string) => void;
  onResetDefaults: () => void;
}) {
  const [draft, setDraft] = useState<Benefit>(() => makeBlankBenefit());

  return (
    <div className="stack-lg">
      <div className="editor-actions">
        <button className="button secondary" type="button" onClick={props.onResetDefaults}>
          Reset to example defaults
        </button>
      </div>

      <BenefitForm
        title="Add benefit"
        benefit={draft}
        saveLabel="Add benefit"
        onChange={setDraft}
        onSubmit={() => {
          if (!draft.name.trim() || !(draft.amount > 0)) return;
          props.onSave({
            ...draft,
            name: draft.name.trim(),
            description: draft.description.trim(),
          });
          setDraft(makeBlankBenefit());
        }}
      />

      <div className="stack-md">
        <h3 className="section-title">Existing benefits</h3>
        {props.benefits.length === 0 ? (
          <EmptyState text="No benefits configured yet." />
        ) : (
          props.benefits.map((benefit) => (
            <EditableBenefitCard key={benefit.id} benefit={benefit} onSave={props.onSave} onDelete={props.onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

function EditableBenefitCard(props: {
  benefit: Benefit;
  onSave: (benefit: Benefit) => void;
  onDelete: (id: string) => void;
}) {
  const [local, setLocal] = useState<Benefit>(props.benefit);

  useEffect(() => {
    setLocal(props.benefit);
  }, [props.benefit]);

  return (
    <div className="subpanel">
      <BenefitForm
        title={props.benefit.name || "Benefit"}
        benefit={local}
        saveLabel="Save changes"
        onChange={setLocal}
        onSubmit={() => {
          if (!local.name.trim() || !(local.amount > 0)) return;
          props.onSave({ ...local, name: local.name.trim(), description: local.description.trim() });
        }}
      />
      <div className="card-row-actions">
        <button className="text-button" type="button" onClick={() => setLocal(props.benefit)}>
          Revert
        </button>
        <button className="text-button danger-text" type="button" onClick={() => props.onDelete(props.benefit.id)}>
          Delete benefit
        </button>
      </div>
    </div>
  );
}

function BenefitForm(props: {
  title: string;
  benefit: Benefit;
  saveLabel: string;
  onChange: (benefit: Benefit) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="benefit-form"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <div className="benefit-form-head">
        <h3>{props.title}</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={props.benefit.active}
            onChange={(e) => props.onChange({ ...props.benefit, active: e.target.checked })}
          />
          Active
        </label>
      </div>

      <div className="form-grid">
        <label>
          Benefit name
          <input
            type="text"
            value={props.benefit.name}
            onChange={(e) => props.onChange({ ...props.benefit, name: e.target.value })}
            placeholder="Walmart+ Membership"
            required
          />
        </label>

        <label>
          Credit amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={props.benefit.amount || ""}
            onChange={(e) => props.onChange({ ...props.benefit, amount: Number(e.target.value) || 0 })}
            placeholder="13.99"
            required
          />
        </label>

        <label>
          Cadence
          <select
            value={props.benefit.cadence}
            onChange={(e) => props.onChange({ ...props.benefit, cadence: e.target.value as Cadence })}
          >
            {(Object.keys(CADENCE_LABELS) as Cadence[]).map((cadence) => (
              <option key={cadence} value={cadence}>
                {CADENCE_LABELS[cadence]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Anchor month
          <select
            value={props.benefit.anchorMonth}
            onChange={(e) => props.onChange({ ...props.benefit, anchorMonth: Number(e.target.value) })}
          >
            {MONTH_NAMES_LONG.map((name, index) => (
              <option key={name} value={index + 1}>
                {index + 1} - {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Description (optional)
        <input
          type="text"
          value={props.benefit.description}
          onChange={(e) => props.onChange({ ...props.benefit, description: e.target.value })}
          placeholder="Monthly reimbursement for Walmart+ subscription."
        />
      </label>

      <div className="form-grid">
        <label>
          Purchase keywords (comma or newline separated)
          <textarea
            rows={4}
            value={props.benefit.purchaseKeywords.join(", ")}
            onChange={(e) => props.onChange({ ...props.benefit, purchaseKeywords: normalizeKeywords(e.target.value) })}
            placeholder="WALMART, WALMART+, WALMART PLUS"
          />
        </label>
        <label>
          Refund keywords (optional, fallback is purchase keywords)
          <textarea
            rows={4}
            value={props.benefit.refundKeywords.join(", ")}
            onChange={(e) => props.onChange({ ...props.benefit, refundKeywords: normalizeKeywords(e.target.value) })}
            placeholder="AMEX, WALMART, CREDIT"
          />
        </label>
      </div>

      <div className="card-row-actions">
        <button className="button" type="submit">
          {props.saveLabel}
        </button>
      </div>
    </form>
  );
}

export default App;
