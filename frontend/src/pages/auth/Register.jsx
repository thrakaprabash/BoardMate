// src/pages/auth/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../layouts/AuthLayout";

const rolePathMap = {
  student: "/dashboards/student",
  inventory_manager: "/dashboards/inventory",
  hostel_owner: "/dashboards/hostel",
  room_manager: "/dashboards/rooms",
  
  maintenance_manager: "/dashboards/maintenance",
  
};

export default function Register() {
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await doRegister(form);
      const path = rolePathMap[user?.role] || "/";
      navigate(path, { replace: true });
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Register">
      {/* quick, component-local CSS to darken native <select> menus */}
      <style>{`
        select.dark-native,
        select.dark-native option,
        select.dark-native optgroup {
          background-color: #0f172a; /* slate-900 */
          color: #ffffff;
        }
        select.dark-native:focus { outline: none; }
      `}</style>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-2xl text-white"
      >
        <h2 className="mb-1 text-center text-3xl font-semibold">Create account</h2>
        <p className="mb-6 text-center text-sm text-white/80">Join to continue</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200 border border-red-400/30">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium">Full name</label>
        <input
          className="mt-1 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/70 outline-none focus:ring-2 focus:ring-fuchsia-300/60"
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="Jane Doe"
          required
        />

        <label className="mt-4 block text-sm font-medium">Username</label>
        <input
          className="mt-1 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/70 outline-none focus:ring-2 focus:ring-fuchsia-300/60"
          name="username"
          value={form.username}
          onChange={onChange}
          placeholder="janedoe"
          required
        />

        <label className="mt-4 block text-sm font-medium">Email</label>
        <input
          className="mt-1 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/70 outline-none focus:ring-2 focus:ring-fuchsia-300/60"
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          placeholder="you@example.com"
          required
        />

        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          className="mt-1 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/70 outline-none focus:ring-2 focus:ring-fuchsia-300/60"
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder="Min 8 characters"
          minLength={8}
          required
        />

        <label className="mt-4 block text-sm font-medium">Role</label>
        <div className="relative">
          <select
            className="dark-native mt-1 w-full appearance-none rounded-full border border-white/20 bg-white/10 px-4 py-2.5 pr-10 text-white outline-none focus:ring-2 focus:ring-fuchsia-300/60 [color-scheme:dark]"
            name="role"
            value={form.role}
            onChange={onChange}
          >
            <option value="student">Student</option>
            <option value="inventory_manager">Inventory Manager</option>
            <option value="hostel_owner">Hostel Owner</option>
            <option value="room_manager">Room Manager</option>
            <option value="maintenance_manager">Maintenance Manager</option>
            
          </select>

          {/* chevron */}
          <svg
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <button
          className="mt-6 w-full rounded-full bg-white px-5 py-2.5 font-medium text-[#2b1055] hover:opacity-90 transition disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="mt-5 text-center text-sm text-white/80">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-white underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
