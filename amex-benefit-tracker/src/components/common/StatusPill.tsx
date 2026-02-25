import type { BenefitStatus } from "../../types";
import { Badge } from "../ui";

export function StatusPill({ status }: { status: BenefitStatus }) {
  return (
    <Badge className={`status-pill status-${status}`} variant="outline">
      {status}
    </Badge>
  );
}
