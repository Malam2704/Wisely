import type { HTMLAttributes } from "react";
import { cn } from "../../lib";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "muted";

export function Badge(props: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const { className, variant = "default", ...rest } = props;
  return <span className={cn("ui-badge", `ui-badge--${variant}`, className)} {...rest} />;
}
