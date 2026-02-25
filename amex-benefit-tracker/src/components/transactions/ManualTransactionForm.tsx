import { useState } from "react";
import type { TransactionKind } from "../../types";
import { todayIso } from "../../lib";
import { Button, Input, Label, Select } from "../ui";

export function ManualTransactionForm(props: {
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
      <Label>
        Date
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Label>
      <Label>
        Description
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="WALMART PLUS MONTHLY MEMBERSHIP"
          required
        />
      </Label>
      <div className="field-row">
        <Label>
          Type
          <Select value={kind} onChange={(e) => setKind(e.target.value as TransactionKind)}>
            <option value="purchase">purchase</option>
            <option value="refund">refund</option>
          </Select>
        </Label>
        <Label>
          Amount
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="13.99"
            required
          />
        </Label>
      </div>
      <Button type="submit">
        Add transaction
      </Button>
    </form>
  );
}
