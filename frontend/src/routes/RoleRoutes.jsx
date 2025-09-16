// RoleRoutes.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleHome = {
  student: "/dashboards/student",
  inventory_manager: "/dashboards/inventory",
  hostel_owner: "/dashboards/hostel",
  room_manager: "/dashboards/rooms",
  booking_manager: "/dashboards/bookings",
  maintenance_manager: "/dashboards/maintenance",
};

export default function RoleRoutes({ allow = [] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    return <Navigate to={roleHome[user.role] || "/"} replace />;
  }
  return <Outlet />;
}
