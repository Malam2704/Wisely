import { formatDateLabel, toMoney } from "../../lib";
import type { Transaction } from "../../types";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from "../ui";

export function TransactionsTable(props: { transactions: Transaction[]; onDelete: (id: string) => void }) {
  return (
    <TableWrapper className="table-wrap">
      <Table className="data-table">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell></TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{formatDateLabel(tx.date)}</TableCell>
              <TableCell>{tx.description}</TableCell>
              <TableCell>
                <Badge
                  className={`tag ${tx.kind === "refund" ? "tag-refund" : "tag-purchase"}`}
                  variant={tx.kind === "refund" ? "success" : "warning"}
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
    </TableWrapper>
  );
}
