import { CADENCE_LABELS, MONTH_NAMES_LONG } from "../../constants";
import { normalizeKeywords } from "../../lib";
import type { Benefit, Cadence } from "../../types";

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
