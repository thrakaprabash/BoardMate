import { useTheme } from "../context/ThemeContext";

export default function Section({ title, subtitle, children, actions, className = "" }) {
  const { theme } = useTheme();

  return (
    <section
      className={[
        theme === "dark"
          ? "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md"
          : "rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-panel)] backdrop-blur-md",
        "p-4",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-[color:var(--app-text)]">{title}</h3>
          {subtitle && <p className="text-sm text-[color:var(--app-text-soft)]">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
