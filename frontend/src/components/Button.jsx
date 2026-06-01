import { useTheme } from "../context/ThemeContext";

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const { theme } = useTheme();
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]/30";
  const variants = {
    primary:
      theme === "dark"
        ? "bg-white text-slate-900 hover:opacity-90"
        : "bg-[color:var(--app-text)] text-white hover:opacity-90",
    secondary:
      theme === "dark"
        ? "border border-white/25 bg-white/10 text-white hover:bg-white/15"
        : "border border-[color:var(--app-border)] bg-[color:var(--app-panel)] text-[color:var(--app-text)] hover:bg-black/5",
    subtle:
      theme === "dark"
        ? "text-white/80 hover:text-white hover:bg-white/5"
        : "text-[color:var(--app-text-soft)] hover:text-[color:var(--app-text)] hover:bg-black/5",
    success: "bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
    danger: "bg-rose-400 text-rose-950 hover:bg-rose-300",
  };
  return (
    <button
      className={[base, variants[variant] || variants.primary, className].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
