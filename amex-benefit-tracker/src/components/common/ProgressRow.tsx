export function ProgressRow(props: { label: string; value: string; ratio: number; tone: "purchase" | "refund" }) {
  return (
    <div className="progress-row">
      <div className="progress-head">
        <span>{props.label}</span>
        <strong>{props.value}</strong>
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill ${props.tone}`}
          style={{ width: `${Math.max(0, Math.min(1, props.ratio)) * 100}%` }}
        />
      </div>
    </div>
  );
}
