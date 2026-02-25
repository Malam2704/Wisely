import { CsvImportPanel, EmptyState, ManualTransactionForm, TransactionsTable } from "../components";
import type { Transaction, TransactionKind } from "../types";

export function TransactionsTab(props: {
  csvText: string;
  csvWarnings: string[];
  sortedTransactions: Transaction[];
  setCsvText: (value: string) => void;
  onAddManualTransaction: (form: { date: string; description: string; amount: number; kind: TransactionKind }) => void;
  onImportCsvText: () => void;
  onImportCsvFile: (file: File) => void;
  onSeedDemoTransactions: () => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions: () => void;
}) {
  return (
    <section className="stack-lg">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Add transactions</h2>
            <p>
              Manual entries work for quick testing. CSV import expects columns like <code>date</code>, <code>description</code>, <code>amount</code>, optional <code>type</code>.
            </p>
          </div>
          <button className="button secondary" type="button" onClick={props.onSeedDemoTransactions}>
            Add demo transactions
          </button>
        </div>
        <div className="txn-input-grid">
          <ManualTransactionForm onSubmit={props.onAddManualTransaction} />
          <CsvImportPanel
            csvText={props.csvText}
            setCsvText={props.setCsvText}
            onImport={props.onImportCsvText}
            onFileSelect={props.onImportCsvFile}
            warnings={props.csvWarnings}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Transaction history</h2>
            <p>{props.sortedTransactions.length} transaction(s) loaded into the tracker.</p>
          </div>
          {props.sortedTransactions.length > 0 ? (
            <button className="button danger" type="button" onClick={props.onClearAllTransactions}>
              Clear all transactions
            </button>
          ) : null}
        </div>
        {props.sortedTransactions.length === 0 ? (
          <EmptyState text="No transactions yet. Add one manually or import a CSV." />
        ) : (
          <TransactionsTable transactions={props.sortedTransactions} onDelete={props.onDeleteTransaction} />
        )}
      </section>
    </section>
  );
}
