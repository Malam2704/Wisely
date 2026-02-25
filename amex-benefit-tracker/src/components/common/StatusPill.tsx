import type { BenefitStatus } from "../../types";

export function StatusPill({ status }: { status: BenefitStatus }) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}
