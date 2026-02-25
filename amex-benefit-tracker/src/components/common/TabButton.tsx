export function TabButton(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`tab-button${props.active ? " active" : ""}`}
      aria-pressed={props.active}
    >
      {props.label}
    </button>
  );
}
