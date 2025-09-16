import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6 text-sm text-gray-600">Loading…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
