import { createContext, useContext, useEffect, useMemo, useState } from "react"
import api from "../services/api" // your interceptor reads token from localStorage

export const AuthContext = createContext(null)
export function useAuth() { return useContext(AuthContext) }

function getErrorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message
  if (typeof err?.message === "string") return err.message
  return "Something went wrong"
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  // Hydrate from localStorage on refresh (no /me endpoint)
  useEffect(() => {
    try {
      const token = localStorage.getItem("token")
      const cached = localStorage.getItem("user")
      if (token && cached) {
        const parsed = JSON.parse(cached)
        setUser(parsed || null)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Login: expects { token, role, user: { id, name, email } }
  const login = async (credentials) => {
    try {
      setLoading(true)
      const { data } = await api.post("/auth/login", credentials)
      if (data?.token) localStorage.setItem("token", data.token)

      // IMPORTANT: merge role into user object for the app to use user.role
      const mergedUser = data?.user ? { ...data.user, role: data.role } : null
      if (mergedUser) localStorage.setItem("user", JSON.stringify(mergedUser))

      setUser(mergedUser)
      return mergedUser
    } catch (err) {
      throw new Error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Register: expects { token, role, user } (same shape as login)
  const register = async (payload) => {
    try {
      setLoading(true)
      const { data } = await api.post("/auth/register", payload)
      if (data?.token) localStorage.setItem("token", data.token)
      const mergedUser = data?.user ? { ...data.user, role: data.role } : null
      if (mergedUser) localStorage.setItem("user", JSON.stringify(mergedUser))
      setUser(mergedUser)
      return mergedUser
    } catch (err) {
      throw new Error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
  }

  const isAuthenticated = !!user
  const hasRole = (roles) =>
    Array.isArray(roles) ? roles.includes(user?.role) : user?.role === roles

  const value = useMemo(
    () => ({ user, loading, login, register, logout, isAuthenticated, hasRole }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
