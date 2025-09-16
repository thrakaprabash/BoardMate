import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-sm font-semibold">
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/40 text-white backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(homePath)}
            className="select-none text-base font-semibold tracking-tight"
          >
            BoardMate
          </button>
          {user?.role && (
            <span className="hidden rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/80 sm:inline">
              {user.role.replace("_", " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/10"
              >
                <Avatar name={user.name} />
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-4">{user.name || "User"}</p>
                  <p className="text-xs text-white/70">{user.role?.replace("_", " ")}</p>
                </div>
                <svg className="ml-1 hidden h-4 w-4 text-white/70 sm:block" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
                </svg>
              </button>
              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 text-white shadow-lg backdrop-blur"
                  onMouseLeave={() => setOpen(false)}
                >
                  <Link to={homePath} className="block px-4 py-2 text-sm hover:bg-white/10" onClick={() => setOpen(false)}>Go to dashboard</Link>
                  <Link to="/notices" className="block px-4 py-2 text-sm hover:bg-white/10" onClick={() => setOpen(false)}>Notices</Link>
                  <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-white/10" onClick={() => setOpen(false)}>Profile</Link>
                  <div className="my-1 border-t border-white/10" />
                  <button onClick={onLogout} className="block w-full px-4 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:opacity-90">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
