import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const rolePathMap = {
  student: "/dashboards/student",
  inventory_manager: "/dashboards/inventory",
  hostel_owner: "/dashboards/hostel",
  room_manager: "/dashboards/rooms",
  booking_manager: "/dashboards/bookings",
  maintenance_manager: "/dashboards/maintenance",
};

function Avatar({ name }) {
  const initials = useMemo(() => {
    if (!name) return "?";
    const p = name.trim().split(/\s+/);
    return (p[0]?.[0] + (p[1]?.[0] || "")).toUpperCase();
  }, [name]);

  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--app-text)]/10 text-sm font-semibold text-[color:var(--app-text)]">
      {initials}
    </div>
  );
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const homePath = user ? rolePathMap[user.role] || "/" : "/login";

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--app-border)] bg-[color:var(--app-panel)]/90 text-[color:var(--app-text)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(homePath)}
            className="select-none text-base font-semibold tracking-tight"
          >
            BoardMate
          </button>
          {user?.role && (
            <span className="hidden rounded-full border border-[color:var(--app-border)] px-2 py-0.5 text-xs text-[color:var(--app-text-soft)] sm:inline">
              {user.role.replace("_", " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {user ? (
            <div className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-black/5"
              >
                <Avatar name={user.name} />
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-4">{user.name || "User"}</p>
                  <p className="text-xs text-[color:var(--app-text-soft)]">{user.role?.replace("_", " ")}</p>
                </div>
                <svg className="ml-1 hidden h-4 w-4 text-[color:var(--app-text-soft)] sm:block" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
                </svg>
              </button>
              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-panel)] text-[color:var(--app-text)] shadow-lg backdrop-blur-xl"
                  onMouseLeave={() => setOpen(false)}
                >
                  <Link to={homePath} className="block px-4 py-2 text-sm hover:bg-black/5" onClick={() => setOpen(false)}>Go to dashboard</Link>
                  <Link to="/notices" className="block px-4 py-2 text-sm hover:bg-black/5" onClick={() => setOpen(false)}>Notices</Link>
                  <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-black/5" onClick={() => setOpen(false)}>Profile</Link>
                  <div className="my-1 border-t border-[color:var(--app-border)]" />
                  <button onClick={onLogout} className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-500/10">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="rounded-lg bg-[color:var(--app-text)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
