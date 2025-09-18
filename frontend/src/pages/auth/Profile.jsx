// src/pages/auth/Profile.jsx
import { useEffect, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/Button";
import api from "../../services/api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const userId = user?._id || user?.id;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m);
    setErr(isErr ? m : "");
    setTimeout(() => {
      setOk("");
      setErr("");
    }, 2200);
  };

  const LocalCss = () => (
    <style>{`
      button:empty { display:none; }
      .input-dark { background:rgba(255,255,255,.08); color:#fff; border-color:rgba(255,255,255,.2); }
      .input-dark::placeholder { color:rgba(255,255,255,.7); }
      .glass { border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.10); backdrop-filter: blur(10px); }
    `}</style>
  );

  // Load my profile from /users/:id
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data } = await api.get(`/users/${userId}`);
        if (!alive) return;
        setForm((f) => ({
          ...f,
          name: data?.name || "",
          email: data?.email || "",
          phone: data?.phone || "",
        }));
      } catch (e) {
        toast(e?.response?.data?.message || "Failed to load profile", true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [userId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    // 1) Validate password pair (if provided)
    const wantsPasswordChange = Boolean(form.password);
    if (wantsPasswordChange) {
      if (form.password !== form.passwordConfirm) {
        return toast("Passwords do not match", true);
      }
      if (form.password.length < 8) {
        return toast("Password must be at least 8 characters", true);
      }
    }

    setSaving(true);
    try {
      // 2) Update profile fields (no password here)
      const profilePayload = {
        name: form.name?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim() || undefined,
      };

      const { data: updated } = await api.patch(`/users/${userId}`, profilePayload);

      // keep AuthContext fresh
      if (typeof setUser === "function") {
        setUser((u) => ({
          ...u,
          ...profilePayload,
          ...updated,
        }));
      }

      // 3) If password was requested, call /auth/reset-password with email + new pass
      if (wantsPasswordChange) {
        const emailForReset = (updated?.email || profilePayload.email || user?.email || "").trim();
        await api.post(`/auth/reset-password`, {
          email: emailForReset,
          password: form.password,
        });
      }

      // Clear local password fields
      setForm((f) => ({ ...f, password: "", passwordConfirm: "" }));

      // Success message
      toast(wantsPasswordChange ? "Profile & password updated" : "Profile updated");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (e?.response?.data?.errors?.fieldErrors
          ? Object.entries(e.response.data.errors.fieldErrors)
              .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
              .join("; ")
          : null) ||
        e?.message ||
        "Update failed";
      toast(msg, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <LocalCss />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Profile</h2>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{ok}</span>}
          {err && <span className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">{err}</span>}
        </div>
      )}

      {loading ? (
        <div className="mt-6 glass rounded-2xl p-6 text-sm text-white/80">Loading…</div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4 rounded-2xl glass p-5 text-white">
          {/* (unchanged) inputs for name/email/phone/passwords */}
          <label className="block">
            <span className="mb-1 block text-sm">Full name</span>
            <input
              className="input-dark w-full rounded px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">Email</span>
            <input
              type="email"
              className="input-dark w-full rounded px-3 py-2"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">Phone (optional)</span>
            <input
              className="input-dark w-full rounded px-3 py-2"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+94 7X XXX XXXX"
            />
          </label>

          <div className="rounded-xl border border-white/15 bg-white/5 p-3">
            <div className="text-sm text-white/80">Change password (optional)</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm">New password</span>
                <input
                  type="password"
                  className="input-dark w-full rounded px-3 py-2"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm">Confirm password</span>
                <input
                  type="password"
                  className="input-dark w-full rounded px-3 py-2"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                  placeholder="••••••••"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setForm((f) => ({ ...f, password: "", passwordConfirm: "" }))}
            >
              Clear password
            </Button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
