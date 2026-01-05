import { useMemo, useState } from "react";
import { parseCsvFile } from "./lib/parseCsv";
import type { Transaction } from "./lib/parseCsv";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#4dc9f6",
  "#f67019",
  "#f53794",
  "#537bc4",
  "#acc236",
  "#166a8f",
  "#00a950",
  "#58595b",
  "#8549ba",
  "#ffb3ba",
  "#ffd6a5",
  "#caffbf",
];

type Filters = {
  includeTransfers: boolean;
  search: string;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value;
  return (
    <div style={{ background: "white", border: "1px solid #ddd", padding: 8, borderRadius: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{format(new Date(label), "MMM d, yyyy")}</div>
      <div style={{ fontWeight: 700, marginTop: 4 }}>{money(Number(value))}</div>
    </div>
  );
}

export default function App() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<Filters>({
    includeTransfers: false,
    search: "",
  });

  async function onUpload(file: File) {
    const parsed = await parseCsvFile(file);
    setTxs(parsed);
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return txs.filter((t) => {
      if (!filters.includeTransfers && t.type === "payment_transfer") return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.categoryRaw.toLowerCase().includes(q) ||
        t.tags.some((x) => x.toLowerCase().includes(q))
      );
    });
  }, [txs, filters]);

  const expenseOnly = useMemo(
    () => filtered.filter((t) => t.type === "expense"),
    [filtered]
  );

  const totalSpend = useMemo(() => sum(expenseOnly.map((t) => t.amount)), [expenseOnly]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of expenseOnly) {
      m.set(t.categoryBase, (m.get(t.categoryBase) ?? 0) + t.amount);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [expenseOnly]);

  const spendOverTime = useMemo(() => {
    // daily totals (expense only)
    const m = new Map<string, number>();
    for (const t of expenseOnly) {
      const key = format(t.date, "yyyy-MM-dd");
      m.set(key, (m.get(key) ?? 0) + t.amount);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }));
  }, [expenseOnly]);

  const topMerchants = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of expenseOnly) {
      m.set(t.name, (m.get(t.name) ?? 0) + t.amount);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [expenseOnly]);

  const [showAllTx, setShowAllTx] = useState(false);
  const [txSort, setTxSort] = useState<{ key: "date" | "name" | "category" | "amount"; dir: "asc" | "desc" }>(
    { key: "date", dir: "desc" }
  );

  const displayedTx = useMemo(() => {
    const arr = [...filtered];
    const dir = txSort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (txSort.key) {
        case "amount":
          return (a.amount - b.amount) * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "category":
          return a.categoryRaw.localeCompare(b.categoryRaw) * dir;
        case "date":
        default:
          return (+a.date - +b.date) * dir;
      }
    });
    return showAllTx ? arr : arr.slice(0, 25);
  }, [filtered, txSort, showAllTx]);

  function toggleSort(key: typeof txSort.key) {
    setTxSort((s) => {
      if (s.key === key) return { ...s, dir: s.dir === "asc" ? "desc" : "asc" };
      // default direction: newest/highest first for date/amount
      return { key, dir: key === "date" || key === "amount" ? "desc" : "asc" };
    });
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>Spending Dashboard</h1>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        Upload CSV → auto-clean → charts + drill-down (Empower-style)
      </div>

      <Uploader onFile={onUpload} />

      <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={filters.includeTransfers}
            onChange={(e) =>
              setFilters((f) => ({ ...f, includeTransfers: e.target.checked }))
            }
          />
          Include transfers/payments
        </label>

        <input
          placeholder="Search merchant, category, tag…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #ccc",
            minWidth: 280,
            flex: 1,
          }}
        />
      </div>

      {txs.length === 0 ? (
        <div style={{ marginTop: 24, opacity: 0.7 }}>
          Upload your CSV to see the dashboard.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 18 }}>
            <Card title="Total spending">{money(totalSpend)}</Card>
            <Card title="Transactions (shown)">{filtered.length}</Card>
            <Card title="Expense transactions">{expenseOnly.length}</Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 650, marginBottom: 8 }}>Top Categories</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={110}>
                      {byCategory.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                Showing top {byCategory.length} categories (expense only).
              </div>
            </div>

            <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 650, marginBottom: 8 }}>Spending Over Time</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spendOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <YAxis tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={CustomTooltip} />
                    <Line type="monotone" dataKey="value" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                Daily totals (expense only). Add date-range next for month view.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }}>
            <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 650 }}>Transactions</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Showing {showAllTx ? filtered.length : Math.min(25, filtered.length)}</div>
                  <button
                    onClick={() => setShowAllTx((s) => !s)}
                    style={{ border: "none", background: "#f3f3f3", padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}
                  >
                    {showAllTx ? "Show recent" : "Show all"}
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 420, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                      <th style={{ padding: "8px 6px", cursor: "pointer" }} onClick={() => toggleSort("date")}>Date {txSort.key === "date" ? (txSort.dir === "asc" ? "▲" : "▼") : ""}</th>
                      <th style={{ padding: "8px 6px", cursor: "pointer" }} onClick={() => toggleSort("name")}>Merchant {txSort.key === "name" ? (txSort.dir === "asc" ? "▲" : "▼") : ""}</th>
                      <th style={{ padding: "8px 6px", cursor: "pointer" }} onClick={() => toggleSort("category")}>Category {txSort.key === "category" ? (txSort.dir === "asc" ? "▲" : "▼") : ""}</th>
                      <th style={{ padding: "8px 6px", textAlign: "right", cursor: "pointer" }} onClick={() => toggleSort("amount")}>Amount {txSort.key === "amount" ? (txSort.dir === "asc" ? "▲" : "▼") : ""}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTx.map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #fafafa" }}>
                        <td style={{ padding: "8px 6px", opacity: 0.85, width: 120 }}>{format(t.date, "MM/dd/yyyy")}</td>
                        <td style={{ padding: "8px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</td>
                        <td style={{ padding: "8px 6px", width: 200, opacity: 0.75 }}>{t.categoryRaw}</td>
                        <td style={{ padding: "8px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 12 }}>
      <div style={{ opacity: 0.75, fontSize: 13 }}>{props.title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{props.children}</div>
    </div>
  );
}

function Uploader(props: { onFile: (file: File) => void }) {
  return (
    <div
      style={{
        border: "1px dashed #bbb",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontWeight: 650 }}>Upload transactions CSV</div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          Expected columns: date, name/description, amount, category (extra columns ok)
        </div>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onFile(f);
        }}
      />
    </div>
  );
}
