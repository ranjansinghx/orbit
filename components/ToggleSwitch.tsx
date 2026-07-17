"use client";

export default function ToggleSwitch({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 disabled:cursor-wait ${
        on ? "bg-text" : "bg-surface2 border border-line"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-transform duration-150 ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
