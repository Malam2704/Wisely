import { createContext, useContext, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib";

type TabsContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs(props: {
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const { value, onValueChange, className, children } = props;
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("ui-tabs", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-tabs-list", className)} role="tablist" {...props} />;
}

export function TabsTrigger(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === props.value;
  const { className, value, onClick, type = "button", children, ...rest } = props;

  return (
    <button
      type={type}
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      className={cn("ui-tabs-trigger", active && "is-active", className)}
      onClick={(event) => {
        ctx?.onValueChange?.(value);
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TabsContent({ className, value, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  if (!active) return null;
  return <div role="tabpanel" className={cn("ui-tabs-content", className)} {...props} />;
}
