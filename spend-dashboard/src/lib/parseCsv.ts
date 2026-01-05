import Papa from "papaparse";

export type TxType = "expense" | "payment_transfer" | "uncategorized";

export type Transaction = {
    id: string;
    date: Date;
    name: string;
    amount: number; // positive = expense, negative = inflow/payment
    categoryRaw: string;
    categoryBase: string;
    tags: string[];
    type: TxType;
};

function pickKey(obj: Record<string, unknown>, keys: string[]): unknown {
    for (const k of keys) {
        if (k in obj) return obj[k];
    }
    return undefined;
}

function parseAmount(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;

    // Handles: 12.34, $12.34, (12.34), -12.34, "$1,234.56"
    const isParenNeg = /^\(.*\)$/.test(s);
    const cleaned = s
        .replace(/[,$]/g, "")
        .replace(/^\(/, "")
        .replace(/\)$/, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return null;
    return isParenNeg ? -n : n;
}

function parseDate(v: unknown): Date | null {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;

    // Accepts MM/DD/YYYY (your file), YYYY-MM-DD, etc.
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return null;
    return d;
}

function parseCategory(raw: string): { base: string; tags: string[] } {
    const s = raw.trim();
    if (!s) return { base: "Uncategorized", tags: [] };

    const base = s.split("(")[0].trim() || "Uncategorized";
    const tags = Array.from(s.matchAll(/\(([^)]+)\)/g)).map((m) => m[1].trim());
    return { base, tags };
}

function classifyTx(amount: number, name: string, categoryRaw: string): TxType {
    const n = name.toLowerCase();
    if (amount < 0) return "payment_transfer";
    if (n.includes("payment") && n.includes("thank you")) return "payment_transfer";
    if (!categoryRaw || categoryRaw.trim() === "") return "uncategorized";
    return "expense";
}

export async function parseCsvFile(file: File): Promise<Transaction[]> {
    const text = await file.text();

    const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
        // You can surface this in UI if you want.
        console.warn(parsed.errors);
    }

    const rows = (parsed.data ?? []).filter(Boolean);

    const dateKeys = ["date", "Date", "Transaction Date"];
    const nameKeys = ["name", "Name", "description", "Description", "merchant", "Merchant"];
    const amountKeys = ["amount", "Amount"];
    const categoryKeys = ["category", "Category"];

    const txs: Transaction[] = [];

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        const dateVal = pickKey(r, dateKeys);
        const nameVal = pickKey(r, nameKeys);
        const amountVal = pickKey(r, amountKeys);
        const categoryVal = pickKey(r, categoryKeys);

        const date = parseDate(dateVal);
        const name = (nameVal ?? "").toString().trim();
        const amount = parseAmount(amountVal);
        const categoryRaw = (categoryVal ?? "").toString().trim();

        // Skip blank / malformed rows
        if (!date || !name || amount === null) continue;

        const { base, tags } = parseCategory(categoryRaw);
        const type = classifyTx(amount, name, categoryRaw);

        txs.push({
            id: `${date.toISOString()}_${i}_${name}`,
            date,
            name,
            amount,
            categoryRaw: categoryRaw || "Uncategorized",
            categoryBase: base,
            tags,
            type,
        });
    }

    // Sort newest first
    txs.sort((a, b) => b.date.getTime() - a.date.getTime());
    return txs;
}
