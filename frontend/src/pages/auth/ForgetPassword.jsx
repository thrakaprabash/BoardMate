// src/pages/auth/ForgotPassword.jsx
import { useState } from "react";
import AuthLayout from "../../layouts/AuthLayout";
import api from "../../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      return setError("Passwords do not match");
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/auth/reset-password", { email, password });
      setMessage(data?.message || "Password updated successfully");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-2xl text-white"
      >
        <h2 className="mb-1 text-center text-3xl font-semibold">Reset Password</h2>
        <p className="mb-6 text-center text-sm text-white/80">
          Enter your email and a new password.
        </p>

        {error && <p className="mb-4 text-red-400">{error}</p>}
        {message && <p className="mb-4 text-green-400">{message}</p>}

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white"
          required
        />

        <label className="mt-4">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white"
          required
        />

        <label className="mt-4">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-white"
          required
        />

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-white px-5 py-2.5 font-medium text-[#2b1055] hover:opacity-90"
          disabled={loading}
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </AuthLayout>
  );
}
