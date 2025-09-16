import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../layouts/AuthLayout";

const rolePathMap = {
  student: "/dashboards/student",
  inventory_manager: "/dashboards/inventory",
  hostel_owner: "/dashboards/hostel",
  room_manager: "/dashboards/rooms",
  booking_manager: "/dashboards/bookings",
  maintenance_manager: "/dashboards/maintenance",
};

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role) {
      navigate(rolePathMap[user.role] || "/", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const u = await login({ email, password });
      const path = rolePathMap[u?.role] || "/";
      navigate(path, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Login">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-2xl text-white"
      >
        <h2 className="mb-1 text-center text-3xl font-semibold">Login</h2>
        <p className="mb-6 text-center text-sm text-white/80">
          Welcome back! Please sign in.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200 border border-red-400/30">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium">Email</label>
        <div className="mt-1">
          <input
            className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/70 outline-none focus:ring-2 focus:ring-fuchsia-300/60"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <label className="mt-4 block text-sm font-medium">Password</label>
        <div className="mt-1">
          <input
            className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/70 outline-none focus:ring-2 focus:ring-fuchsia-300/60"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="h-4 w-4 rounded border-white/30 bg-white/10" />
            <span className="text-white/80">Remember me</span>
          </label>
          <button type="button" className="underline underline-offset-4 text-white/90 hover:text-white">
            Forgot password?
          </button>
        </div>

        <button
          className="mt-6 w-full rounded-full bg-white px-5 py-2.5 font-medium text-[#2b1055] hover:opacity-90 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Login"}
        </button>

        <p className="mt-5 text-center text-sm text-white/80">
          Don’t have an account?{" "}
          <Link to="/register" className="font-semibold text-white underline underline-offset-4">
            Register
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
