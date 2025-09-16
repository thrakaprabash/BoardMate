export default function StatCard({ title, value, hint, className = "" }) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md",
        "p-4 text-white shadow-sm",
        "relative z-[1]",           // sit above anything right below
        className,
      ].join(" ")}
    >
      <p className="text-sm text-white/70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/60">{hint}</p>}
    </div>
  );
}
