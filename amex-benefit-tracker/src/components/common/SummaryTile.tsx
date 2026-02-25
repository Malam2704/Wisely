export type SummaryTileTone = "complete" | "purchased" | "inactive" | "neutral";

export function SummaryTile(props: { label: string; value: string; tone: SummaryTileTone }) {
  return (
    <div className={`summary-tile ${props.tone}`}>
      <div className="summary-value">{props.value}</div>
      <div className="summary-label">{props.label}</div>
    </div>
  );
}
