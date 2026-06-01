import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleHome = {
  student:"/dashboards/student",
  inventory_manager:"/dashboards/inventory",
  hostel_owner:"/dashboards/hostel",
  room_manager:"/dashboards/rooms",
  booking_manager:"/dashboards/bookings",
  maintenance_manager:"/dashboards/maintenance",
};

const menuByRole = {
  student: [{ label:"Dashboard", to:"/dashboards/student" }, { label:"My Bookings", to:"/bookings" }, { label:"Payments", to:"/finance" }, { label:"Complaints", to:"/complaints" }, { label:"Feedback", to:"/feedback" }, { label:"Notices", to:"/notices" }],
  inventory_manager: [{ label:"Dashboard", to:"/dashboards/inventory" }, { label:"Inventory", to:"/inventory" }, { label:"Low Stock", to:"/inventory/low-stock" }, { label:"Reports", to:"/inventory/reports" }, { label:"Notices", to:"/notices" }],
  hostel_owner: [{ label:"Dashboard", to:"/dashboards/hostel" }, { label:"Bookings", to:"/ownerbookings" }, { label:"Payments", to:"/finance/ownerPayment" }, { label:"Reports", to:"/reports/revenue" }, { label:"Notices", to:"/notices" }],
  room_manager: [{ label:"Dashboard", to:"/dashboards/rooms" }, { label:"Rooms", to:"/rooms" }, { label:"Today’s Bookings", to:"/bookings/today" }, { label:"Maintenance", to:"/maintenance" }],
  booking_manager: [{ label:"Dashboard", to:"/dashboards/bookings" }, { label:"All Bookings", to:"/bookings" }, { label:"Check-ins", to:"/bookings/check-ins" }, { label:"Check-outs", to:"/bookings/check-outs" }, { label:"Payments", to:"/finance" }],
  maintenance_manager: [{ label:"Dashboard", to:"/dashboards/maintenance" }, { label:"Open Tickets", to:"/maintenance/open" }, { label:"All Tickets", to:"/maintenance" }, { label:"Complaint Manage", to:"/complaints/manage" }, { label:"Technicians", to:"/maintenance/technicians" }],
};

function ItemIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3"></rect>
    </svg>
  );
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
          isActive
            ? "bg-black/5 text-[color:var(--app-text)]"
            : "text-[color:var(--app-text-soft)] hover:bg-black/5 hover:text-[color:var(--app-text)]",
        ].join(" ")
      }
    >
      <ItemIcon />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const items = menuByRole[user.role] || [{ label: "Home", to: roleHome[user.role] || "/" }];

  return (
    <aside className="hidden w-64 shrink-0 md:block">
      <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-panel)] p-4 text-[color:var(--app-text)] shadow-sm backdrop-blur-xl">
        <nav className="space-y-1">
          {items.map((it) => (
            <NavItem key={it.to} to={it.to} label={it.label} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
