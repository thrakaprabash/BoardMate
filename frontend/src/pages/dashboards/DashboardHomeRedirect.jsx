import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const rolePathMap = {
  student: "/dashboards/student",
  inventory_manager: "/dashboards/inventory",
  hostel_owner: "/dashboards/hostel",
  room_manager: "/dashboards/rooms",
  booking_manager: "/dashboards/bookings",
  maintenance_manager: "/dashboards/maintenance",
}

export default function DashboardHomeRedirect() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const path = rolePathMap[user?.role] || "/"
    navigate(path, { replace: true })
  }, [user, navigate])

  return null
}
