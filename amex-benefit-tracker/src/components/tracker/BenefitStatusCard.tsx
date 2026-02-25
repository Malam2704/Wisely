import { CADENCE_LABELS, MONTH_NAMES_LONG } from "../../constants";
import { formatCycleLabel, toMoney } from "../../lib";
import type { TrackerSummaryItem } from "../../types";
import { Card } from "../ui";
import { ProgressRow, StatusPill } from "../common";

export function BenefitStatusCard(props: { item: TrackerSummaryItem }) {
  const { benefit, current, previous, nextReset } = props.item;

  return (
    <Card className="benefit-card">
      <div className="benefit-card-head">
        <div>
          <h3>{benefit.name}</h3>
          <p>{benefit.description || `${CADENCE_LABELS[benefit.cadence]} credit`}</p>
        </div>
        <StatusPill status={current.status} />
      </div>

      <div className="benefit-meta">
        <span>{toMoney(benefit.amount)} target</span>
        <span>{CADENCE_LABELS[benefit.cadence]}</span>
        <span>Current: {formatCycleLabel(current.cycle, benefit.cadence)}</span>
      </div>

      <div className="progress-rows">
        <ProgressRow
          label="Purchases"
          value={`${toMoney(current.purchaseTotal)} (${current.matchedPurchases} tx)`}
          ratio={Math.min(current.purchaseTotal / Math.max(benefit.amount, 0.01), 1)}
          tone="purchase"
        />
        <ProgressRow
          label="Refunds"
          value={`${toMoney(current.refundTotal)} (${current.matchedRefunds} tx)`}
          ratio={Math.min(current.refundTotal / Math.max(benefit.amount, 0.01), 1)}
          tone="refund"
        />
      </div>

      <div className="benefit-footer">
        <span>Next reset: {`${MONTH_NAMES_LONG[nextReset.getMonth()]} 1, ${nextReset.getFullYear()}`}</span>
        <span>
          Previous: {formatCycleLabel(previous.cycle, benefit.cadence)} • {previous.status}
        </span>
      </div>
    </Card>
  );
}
