import { useEffect, useMemo, useState } from "react";
import { DEFAULT_BENEFITS } from "./constants";
import { SummaryTile, Tabs, TabsContent, TabsList, TabsTrigger } from "./components";
import {
  getCycleWindowForDate,
  loadBenefits,
  loadTransactions,
  makeDemoTransactions,
  parseCsv,
  parseLocalDate,
  saveBenefits,
  saveTransactions,
  shiftCycle,
  summarizeBenefitCycle,
  uid,
} from "./lib";
import { AdminTab, TrackerTab, TransactionsTab } from "./tabs";
import type { Benefit, BenefitStatus, TabKey, TrackerSummaryItem, Transaction, TransactionKind } from "./types";

function App() {
  const [tab, setTab] = useState<TabKey>("tracker");
  const [benefits, setBenefits] = useState<Benefit[]>(() => loadBenefits());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [csvText, setCsvText] = useState("");

  useEffect(() => {
    saveBenefits(benefits);
  }, [benefits]);

  useEffect(() => {
    saveTransactions(transactions);
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

  const trackerSummaries = useMemo<TrackerSummaryItem[]>(() => {
    const now = new Date();
    return activeBenefits.map((benefit) => {
      const currentCycle = getCycleWindowForDate(now, benefit);
      const current = summarizeBenefitCycle(benefit, transactions, currentCycle);
      const previous = summarizeBenefitCycle(benefit, transactions, shiftCycle(currentCycle, benefit, -1));
      return {
        benefit,
        current,
        previous,
        nextReset: currentCycle.endExclusive,
      };
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

  function addManualTransaction(form: { date: string; description: string; amount: number; kind: TransactionKind }) {
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
    void file.text().then((text) => {
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
    setTransactions((prev) => [...makeDemoTransactions(), ...prev]);
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Amex Platinum Benefit Tracker</p>
          <h1>Track credits by billing cycle and completion status</h1>
          <p className="hero-copy">
            Add benefits in the admin page, import or enter transactions, and the app will mark each cycle as <strong>inactive</strong>, <strong>purchased</strong>, or <strong>complete</strong>.
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

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
        <TabsList className="tabs" aria-label="Sections">
          <TabsTrigger value="tracker">Tracker</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="tracker">
          <TrackerTab trackerSummaries={trackerSummaries} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab
            csvText={csvText}
            csvWarnings={csvWarnings}
            sortedTransactions={sortedTransactions}
            setCsvText={setCsvText}
            onAddManualTransaction={addManualTransaction}
            onImportCsvText={importCsvText}
            onImportCsvFile={importCsvFile}
            onSeedDemoTransactions={seedDemoTransactions}
            onDeleteTransaction={deleteTransaction}
            onClearAllTransactions={() => setTransactions([])}
          />
        </TabsContent>

        <TabsContent value="admin">
          <AdminTab
            benefits={benefits}
            onSaveBenefit={upsertBenefit}
            onDeleteBenefit={deleteBenefit}
            onResetDefaults={() => setBenefits(DEFAULT_BENEFITS)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
