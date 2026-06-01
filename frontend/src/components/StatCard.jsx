import { useTheme } from "../context/ThemeContext";

export default function StatCard({ title, value, hint, className = "" }) {
  const { theme } = useTheme();

  return (
    <div
      className={[
        theme === "dark"
          ? "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md"
          : "rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-panel)] backdrop-blur-md",
        "p-4 text-[color:var(--app-text)] shadow-sm",
        "relative z-[1]",
        className,
      ].join(" ")}
    >
      <p className="text-sm text-[color:var(--app-text-soft)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[color:var(--app-text-soft)]">{hint}</p>}
    </div>
  );
}
