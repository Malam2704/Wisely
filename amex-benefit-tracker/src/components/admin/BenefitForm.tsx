import { CADENCE_LABELS, MONTH_NAMES_LONG } from "../../constants";
import { normalizeKeywords } from "../../lib";
import type { Benefit, Cadence } from "../../types";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "../ui";

export function BenefitForm(props: {
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
        <div className="toggle">
          <Switch checked={props.benefit.active} onCheckedChange={(checked) => props.onChange({ ...props.benefit, active: checked })} />
          <span>Active</span>
        </div>
      </div>

      <div className="form-grid">
        <Label>
          Benefit name
          <Input
            type="text"
            value={props.benefit.name}
            onChange={(e) => props.onChange({ ...props.benefit, name: e.target.value })}
            placeholder="Walmart+ Membership"
            required
          />
        </Label>

        <Label>
          Credit amount
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={props.benefit.amount || ""}
            onChange={(e) => props.onChange({ ...props.benefit, amount: Number(e.target.value) || 0 })}
            placeholder="13.99"
            required
          />
        </Label>

        <Label>
          Cadence
          <Select
            value={props.benefit.cadence}
            onValueChange={(value) => props.onChange({ ...props.benefit, cadence: value as Cadence })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select cadence" />
            </SelectTrigger>
            <SelectContent>
            {(Object.keys(CADENCE_LABELS) as Cadence[]).map((cadence) => (
              <SelectItem key={cadence} value={cadence}>
                {CADENCE_LABELS[cadence]}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </Label>

        <Label>
          Anchor month
          <Select
            value={String(props.benefit.anchorMonth)}
            onValueChange={(value) => props.onChange({ ...props.benefit, anchorMonth: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
            {MONTH_NAMES_LONG.map((name, index) => (
              <SelectItem key={name} value={String(index + 1)}>
                {index + 1} - {name}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </Label>
      </div>

      <Label>
        Description (optional)
        <Input
          type="text"
          value={props.benefit.description}
          onChange={(e) => props.onChange({ ...props.benefit, description: e.target.value })}
          placeholder="Monthly reimbursement for Walmart+ subscription."
        />
      </Label>

      <div className="form-grid">
        <Label>
          Purchase keywords (comma or newline separated)
          <Textarea
            rows={4}
            value={props.benefit.purchaseKeywords.join(", ")}
            onChange={(e) => props.onChange({ ...props.benefit, purchaseKeywords: normalizeKeywords(e.target.value) })}
            placeholder="WALMART, WALMART+, WALMART PLUS"
          />
        </Label>
        <Label>
          Refund keywords (optional, fallback is purchase keywords)
          <Textarea
            rows={4}
            value={props.benefit.refundKeywords.join(", ")}
            onChange={(e) => props.onChange({ ...props.benefit, refundKeywords: normalizeKeywords(e.target.value) })}
            placeholder="AMEX, WALMART, CREDIT"
          />
        </Label>
      </div>

      <div className="card-row-actions">
        <Button type="submit">
          {props.saveLabel}
        </Button>
      </div>
    </form>
  );
}
