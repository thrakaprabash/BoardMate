export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/40";
  const variants = {
    primary:   "bg-white text-slate-900 hover:opacity-90",
    secondary: "border border-white/25 bg-white/10 text-white hover:bg-white/15",
    subtle:    "text-white/80 hover:text-white hover:bg-white/5",
    success:   "bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
    danger:    "bg-rose-400 text-rose-950 hover:bg-rose-300",
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
