import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function NotFound() {
  const navigate = useNavigate()
  const { user } = useAuth() || {}

  const rolePathMap = {
    student: "/dashboards/student",
    inventory_manager: "/dashboards/inventory",
    hostel_owner: "/dashboards/hostel",
    room_manager: "/dashboards/rooms",
    booking_manager: "/dashboards/bookings",
    maintenance_manager: "/dashboards/maintenance",
  }

  const fallbackPath = user ? rolePathMap[user.role] || "/" : "/login"

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-500">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-gray-600">
          The page you’re looking for doesn’t exist or has been moved.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go back
          </button>
          <Link
            to={fallbackPath}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {user ? "Go to Dashboard" : "Sign in"}
          </Link>
        </div>
      </div>
    </div>
  )
}
