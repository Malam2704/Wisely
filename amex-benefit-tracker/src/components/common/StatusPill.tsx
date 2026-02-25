import type { BenefitStatus } from "../../types";
import { Badge } from "../ui";

export function StatusPill({ status }: { status: BenefitStatus }) {
  const variant =
    status === "complete" ? "success" : status === "purchased" ? "warning" : "muted";
  return (
    <Badge className={`status-pill status-${status}`} variant={variant}>
      {status}
    </Badge>
  );
}
