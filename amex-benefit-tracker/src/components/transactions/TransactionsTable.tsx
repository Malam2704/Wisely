import { formatDateLabel, toMoney } from "../../lib";
import type { Transaction } from "../../types";

export function TransactionsTable(props: { transactions: Transaction[]; onDelete: (id: string) => void }) {
  return (
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
          {props.transactions.map((tx) => (
            <tr key={tx.id}>
              <td>{formatDateLabel(tx.date)}</td>
              <td>{tx.description}</td>
              <td>
                <span className={`tag ${tx.kind === "refund" ? "tag-refund" : "tag-purchase"}`}>{tx.kind}</span>
              </td>
              <td>{toMoney(tx.amount)}</td>
              <td>{tx.source}</td>
              <td>
                <button className="text-button" type="button" onClick={() => props.onDelete(tx.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
