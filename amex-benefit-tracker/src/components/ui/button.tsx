import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib";

type ButtonVariant = "default" | "secondary" | "destructive" | "ghost";
type ButtonSize = "default" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant = "default", size = "default", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...props}
    />
  );
}
