import { cn } from "../../lib";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function Switch({ checked, onCheckedChange, disabled, className, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      className={cn("ui-switch", checked && "is-checked", className)}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="ui-switch-thumb" />
    </button>
  );
}
