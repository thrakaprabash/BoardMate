export default function Section({ title, subtitle, children, actions, className = "" }) {
  return (
    <section
      className={[
        // glass
        "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md",
        // spacing
        "p-4",
        // shadow
        "shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-white">{title}</h3>
          {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
