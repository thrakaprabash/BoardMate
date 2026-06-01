import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
        "border-[color:var(--app-border)] bg-[color:var(--app-panel)] text-[color:var(--app-text)] shadow-sm hover:shadow-md",
        className,
      ].join(" ")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}