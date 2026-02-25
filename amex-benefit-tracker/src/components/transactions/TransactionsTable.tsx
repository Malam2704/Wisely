import { formatDateLabel, toMoney } from "../../lib";
import type { Transaction } from "../../types";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui";

export function TransactionsTable(props: { transactions: Transaction[]; onDelete: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <Table className="data-table">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Source</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{formatDateLabel(tx.date)}</TableCell>
              <TableCell>{tx.description}</TableCell>
              <TableCell>
                <Badge
                  className={`tag ${tx.kind === "refund" ? "tag-refund" : "tag-purchase"}`}
                  variant="outline"
                >
                  {tx.kind}
                </Badge>
              </TableCell>
              <TableCell>{toMoney(tx.amount)}</TableCell>
              <TableCell>{tx.source}</TableCell>
              <TableCell>
                <Button className="text-button" variant="ghost" size="sm" type="button" onClick={() => props.onDelete(tx.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
