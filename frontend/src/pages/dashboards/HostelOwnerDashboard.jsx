// src/pages/owner/HostelOwnerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../layouts/AppLayout";
import StatCard from "../../components/StatCard";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// ---------- helpers ----------
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtAmt = (n) => (n == null ? "—" : `LKR ${Number(n).toLocaleString()}`);
const L = (v) => String(v || "").toLowerCase();
const isPaid = (s) => ["paid", "completed", "success"].includes(L(s));
const isPayoutLike = (t) => L(t?.type) === "payout" || L(t?.method) === "payout";

// hostel helpers
const hostelName = (h) =>
  h?.name || h?.hostel_name || h?.title || `Hostel ${String(h?._id || "").slice(-6)}`;
const hostelLocation = (h) =>
  h?.location || h?.address || [h?.city, h?.state || h?.province].filter(Boolean).join(", ") || "—";
const hostelDescription = (h) => h?.description || h?.details || h?.note || "—";

// generic list (no params)
const safeList = async (path) => {
  try { const res = await api.get(path); const arr = getArr(res); return Array.isArray(arr) ? arr : []; }
  catch { return []; }
};

// label cache
function useLabelCache(path, picks) {
  const [map, setMap] = useState({});
  const ensure = async (id) => {
    if (!id || typeof id !== "string" || !/^[0-9a-f]{24}$/i.test(id) || map[id]) return;
    try {
      const { data } = await api.get(`${path}/${id}`);
      const label = picks.map((k) => data?.[k]).find(Boolean) || `${path.replace(/\//g, "").toUpperCase()} ${String(id).slice(-6)}`;
      setMap((m) => ({ ...m, [id]: label }));
    } catch {
      setMap((m) => ({ ...m, [id]: `${path.replace(/\//g, "").toUpperCase()} ${String(id).slice(-6)}` }));
    }
  };
  return { label: (id) => map[id] || "—", ensure };
}

// Glass modal (UI only)
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-xs text-white/80 hover:bg-white/10">Close</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function HostelOwnerDashboard() {
  // local CSS shim (dark inputs/selects + hide stray empty pills)
  const LocalCss = () => (
    <style>{`
      button:empty { display:none; }
      .input-dark { background:rgba(255,255,255,.08); color:#fff; border-color:rgba(255,255,255,.2); }
      .input-dark::placeholder { color:rgba(255,255,255,.7); }
      select.dark-native, select.dark-native option, select.dark-native optgroup { background:#0f172a; color:#fff; }
      select.dark-native:focus { outline:none; }
      .btn-primary { background:#111827; color:#fff; }
      .btn-primary:hover { background:#0f172a; }
      .btn-ghost  { border:1px solid rgba(255,255,255,.2); background:transparent; color:#fff; }
      .btn-ghost:hover { background:rgba(255,255,255,.08); }
      .glass { border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.10); backdrop-filter: blur(10px); }
    `}</style>
  );

  const { user } = useAuth();
  const ownerId = user?._id || user?.id;

  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // modals/forms
  const [showHostelCreate, setShowHostelCreate] = useState(false);
  const [hostelForm, setHostelForm] = useState({ name: "", location: "", description: "" });

  // ✨ NEW: edit hostel
  const [showHostelEdit, setShowHostelEdit] = useState(false);
  const [hostelEditForm, setHostelEditForm] = useState({ _id: "", name: "", location: "", description: "" });

  const [showNoticeCreate, setShowNoticeCreate] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: "", description: "" });

  // ✨ NEW: edit notice
  const [showNoticeEdit, setShowNoticeEdit] = useState(false);
  const [noticeEditForm, setNoticeEditForm] = useState({ _id: "", title: "", description: "" });

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", method: "bank" });
  const [withdrawing, setWithdrawing] = useState(false);

  const [showRefund, setShowRefund] = useState(false);
  const [refundForm, setRefundForm] = useState({ paymentId: "", amount: "", method: "bank", studentId: "" });
  const [refunding, setRefunding] = useState(false);

  const { label: roomLabel, ensure: ensureRoom } = useLabelCache("/rooms", ["name", "type"]);
  const { label: userLabel, ensure: ensureUser } = useLabelCache("/users", ["name", "fullName", "email"]);

  const toast = (m, e = false) => {
    setOk(e ? "" : m); setErr(e ? m : "");
    setTimeout(() => { setOk(""); setErr(""); }, 2000);
  };

  const load = async () => {
    try {
      const [h, r, b, p, n] = await Promise.all([
        safeList("/hostels"),
        safeList("/rooms"),
        safeList("/bookings"),
        safeList("/finance"),
        safeList("/notices")
      ]);
      setHostels(h || []); setRooms(r || []); setBookings(b || []); setPayments(p || []); setNotices(n || []);
      Array.from(new Set(b.map((x) => x.room_id).filter(Boolean))).forEach(ensureRoom);
      Array.from(new Set([...p.map((x) => x.user_id), ...p.map((x) => x.refundOf)].filter(Boolean))).forEach(ensureUser);
    } catch { toast("Failed to load data", true); }
  };

  useEffect(() => { if (ownerId) load(); }, [ownerId]);

  // ----- Stats -----
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const activeBookings = bookings.filter((x) => ["pending", "confirmed", "checked_in"].includes(L(x.status))).length;

    const paid = payments.filter((t) => isPaid(t.status));
    const incomePaid = paid.filter((t) => !isPayoutLike(t)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const refundsIssued = payments.filter((t) => L(t.status) === "refunded").reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const revenue = Math.max(0, incomePaid - refundsIssued);

    const payoutsCommitted = payments
      .filter((t) => isPayoutLike(t) && !["failed", "cancelled"].includes(L(t.status)))
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const available = Math.max(0, revenue - payoutsCommitted);
    return { totalRooms, activeBookings, revenue, available };
  }, [rooms, bookings, payments]);

  // ------- Hostels: create / edit / delete -------
  const createHostel = async (e) => {
    e.preventDefault();
    if (!hostelForm.name?.trim()) return toast("Enter hostel name", true);
    if (!hostelForm.location?.trim()) return toast("Enter hostel location", true);
    try {
      const payload = { owner_id: ownerId, name: hostelForm.name.trim(), location: hostelForm.location.trim(), facilities: [] };
      if (hostelForm.description?.trim()) payload.description = hostelForm.description.trim();
      await api.post("/hostels", payload);
      setShowHostelCreate(false);
      setHostelForm({ name: "", location: "", description: "" });
      toast("Hostel created successfully");
      load();
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (e?.response?.data?.errors?.fieldErrors
          ? Object.entries(e.response.data.errors.fieldErrors).map(([field, errors]) => `${field}: ${errors.join(", ")}`).join("; ")
          : null) ||
        e?.message || "Failed to create hostel";
      toast(`Create hostel failed: ${message}`, true);
    }
  };

  const openEditHostel = (h) => {
    setHostelEditForm({
      _id: h?._id || "",
      name: h?.name || h?.hostel_name || "",
      location: h?.location || h?.address || "",
      description: h?.description || h?.details || "",
    });
    setShowHostelEdit(true);
  };

  const submitHostelEdit = async (e) => {
    e.preventDefault();
    if (!hostelEditForm._id) return;
    try {
      const payload = {
        name: hostelEditForm.name?.trim(),
        location: hostelEditForm.location?.trim(),
      };
      if (hostelEditForm.description?.trim() !== undefined) payload.description = hostelEditForm.description.trim();
      await api.patch?.(`/hostels/${hostelEditForm._id}`, payload).catch(() => api.put(`/hostels/${hostelEditForm._id}`, payload));
      toast("Hostel updated");
      setShowHostelEdit(false);
      load();
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true);
    }
  };

  const deleteHostel = async (h) => {
    if (!h?._id) return;
    if (!confirm(`Delete hostel "${h.name || String(h._id).slice(-6)}"? This cannot be undone.`)) return;
    try { await api.delete(`/hostels/${h._id}`); toast("Hostel deleted"); load(); }
    catch (e) { toast(e?.response?.data?.message || "Delete failed", true); }
  };

  // ------- Notices: create / edit / delete -------
  const createNotice = async (e) => {
    e.preventDefault();
    if (!noticeForm.title?.trim() || !noticeForm.description?.trim()) return toast("Enter title and description", true);
    try {
      await api.post("/notices", {
        title: noticeForm.title.trim(),
        description: noticeForm.description.trim(),
        date_posted: new Date().toISOString(),
        postedBy: ownerId
      });
      setShowNoticeCreate(false);
      setNoticeForm({ title: "", description: "" });
      toast("Notice created");
      load();
    } catch (e) {
      toast(e?.response?.data?.message || e?.response?.data?.error || "Create notice failed", true);
    }
  };

  const openEditNotice = (n) => {
    setNoticeEditForm({
      _id: n?._id || "",
      title: n?.title || "",
      description: n?.description || "",
    });
    setShowNoticeEdit(true);
  };

  const submitNoticeEdit = async (e) => {
    e.preventDefault();
    if (!noticeEditForm._id) return;
    try {
      const payload = {
        title: noticeEditForm.title?.trim(),
        description: noticeEditForm.description?.trim(),
      };
      await api.patch?.(`/notices/${noticeEditForm._id}`, payload).catch(() => api.put(`/notices/${noticeEditForm._id}`, payload));
      toast("Notice updated");
      setShowNoticeEdit(false);
      load();
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true);
    }
  };

  const deleteNotice = async (n) => {
    if (!n?._id) return;
    if (!confirm(`Delete notice "${n.title || String(n._id).slice(-6)}"?`)) return;
    try { await api.delete(`/notices/${n._id}`); toast("Notice deleted"); load(); }
    catch (e) { toast(e?.response?.data?.message || "Delete failed", true); }
  };

  // ------- Withdraw (post as payout) -------
  const submitWithdraw = async (e) => {
    e.preventDefault();
    const amt = Number(withdrawForm.amount);
    if (!amt || amt <= 0) return toast("Enter a valid amount", true);
    if (amt > stats.available) return toast("Amount exceeds available balance", true);

    const payload = {
      user_id: ownerId, amount: amt, method: "payout", channel: withdrawForm.method,
      type: "payout", status: "pending", currency: "LKR", date: new Date().toISOString()
    };

    setWithdrawing(true);
    try {
      await api.post("/finance", payload);
      toast("Withdrawal request submitted");
      setShowWithdraw(false);
      setWithdrawForm({ amount: "", method: "bank" });
      await load();
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (e?.response?.data?.errors?.fieldErrors
          ? Object.entries(e.response.data.errors.fieldErrors).map(([field, errors]) => `${field}: ${errors.join(", ")}`).join("; ")
          : null) ||
        e?.message || "Withdrawal failed";
      toast(`Withdrawal failed: ${message}`, true);
    } finally { setWithdrawing(false); }
  };

  // ------- Refund -------
  const submitRefund = async (e) => {
    e.preventDefault();
    const amt = Number(refundForm.amount);
    if (!refundForm.paymentId || !/^[0-9a-f]{24}$/i.test(refundForm.paymentId)) return toast("Select a valid payment to refund", true);
    if (!amt || amt <= 0) return toast("Enter a valid refund amount", true);

    const originalPayment = payments.find((p) => p._id === refundForm.paymentId);
    if (!originalPayment || amt > Number(originalPayment.amount)) return toast("Refund amount exceeds original payment", true);
    if (amt > stats.available) return toast("Refund amount exceeds available balance", true);

    const payload = {
      user_id: refundForm.studentId || originalPayment.user_id,
      amount: amt, method: refundForm.method, status: "refunded",
      currency: "LKR", date: new Date().toISOString(), refundOf: refundForm.paymentId
    };

    setRefunding(true);
    try {
      await api.post("/finance", payload);
      toast("Refund request submitted");
      setShowRefund(false);
      setRefundForm({ paymentId: "", amount: "", method: "bank", studentId: "" });
      await load();
    } catch (e) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (e?.response?.data?.errors?.fieldErrors
          ? Object.entries(e.response.data.errors.fieldErrors).map(([field, errors]) => `${field}: ${errors.join(", ")}`).join("; ")
          : null) ||
        e?.message || "Refund failed";
      toast(`Refund failed: ${message}`, true);
    } finally { setRefunding(false); }
  };

  // ---------- UI ----------
  return (
    <AppLayout>
      <LocalCss />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Hostel Owner Dashboard</h2>
        <div className="flex gap-2 text-sm">
          <Link
            to="/finance/ownerPayment"
            className="btn-ghost rounded px-3 py-1.5"
          >
            View payments
          </Link>
          <button
            onClick={() => setShowWithdraw(true)}
            className="btn-primary rounded px-3 py-1.5"
          >
            Withdraw
          </button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{ok}</span>}
          {err && <span className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">{err}</span>}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-[1]">
        <StatCard title="Total rooms" value={stats.totalRooms} />
        <StatCard title="Active bookings" value={stats.activeBookings} />
        <StatCard title="Revenue (paid)" value={fmtAmt(stats.revenue)} />
        <StatCard title="Available balance" value={fmtAmt(stats.available)} />
      </div>

      <div className="mt-8">
        <Section
          title="My hostels"
          subtitle="Create and manage your hostels"
          actions={
            <button
              onClick={() => setShowHostelCreate(true)}
              className="btn-primary rounded px-3 py-1.5 text-sm font-medium"
            >
              New hostel
            </button>
          }
        >
          <DataTable
            columns={[
              { key: "name", header: "Name", render: (h) => hostelName(h) },
              { key: "location", header: "Location", render: (h) => hostelLocation(h) },
              { key: "description", header: "Description", render: (h) => hostelDescription(h) },
              {
                key: "actions",
                header: "Actions",
                render: (h) => (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openEditHostel(h)}
                      className="rounded-md border border-blue-300/60 bg-white/5 px-2 py-1 text-xs text-blue-300 hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteHostel(h)}
                      className="rounded-md border border-rose-300/60 bg-white/5 px-2 py-1 text-xs text-rose-300 hover:bg-white/10"
                    >
                      Delete
                    </button>
                  </div>
                )
              }
            ]}
            rows={hostels}
            emptyText="No hostels yet."
          />
        </Section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section
          title="Recent bookings"
          subtitle="Newest first"
          actions={<Link className="text-sm text-white/80 underline" to="/ownerbookings">View all</Link>}
        >
          <DataTable
            columns={[
              { key: "room", header: "Room", render: (r) => roomLabel(r.room_id) },
              { key: "user", header: "User", render: (r) => userLabel(r.user_id) },
              { key: "start", header: "Start", render: (r) => fmtD(r.start_date || r.start) },
              { key: "end", header: "End", render: (r) => fmtD(r.end_date || r.end) },
              { key: "status", header: "Status" }
            ]}
            rows={bookings.slice(0, 8)}
            emptyText="No bookings found."
          />
        </Section>

        <Section
          title="Recent payments"
          subtitle="Newest first"
          actions={<Link className="text-sm text-white/80 underline" to="/finance/ownerPayment">View all</Link>}
        >
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => fmtD(r.date || r.createdAt) },
              { key: "amount", header: "Amount", render: (r) => fmtAmt(r.amount) },
              { key: "method", header: "Method" },
              { key: "status", header: "Status" },
              {
                key: "actions",
                header: "Actions",
                render: (r) =>
                  isPaid(r.status) && !isPayoutLike(r) ? (
                    <button
                      onClick={() => {
                        setRefundForm({ paymentId: r._id, amount: String(r.amount || ""), method: "bank", studentId: r.user_id });
                        setShowRefund(true);
                      }}
                      className="rounded-md border border-blue-300/60 bg-white/5 px-2 py-1 text-xs text-blue-300 hover:bg-white/10"
                    >
                      Refund
                    </button>
                  ) : null
              }
            ]}
            rows={payments.slice(0, 8)}
            emptyText="No payments found."
          />
        </Section>
      </div>

      <div className="mt-8">
        <Section
          title="Latest notices"
          subtitle="What’s new"
          actions={
            <button
              onClick={() => setShowNoticeCreate(true)}
              className="btn-primary rounded px-3 py-1.5 text-sm font-medium"
            >
              New notice
            </button>
          }
        >
          {notices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/80">No notices yet.</div>
          ) : (
            <div className="grid gap-3">
              {notices.map((n) => (
                <div key={n._id} className="rounded-2xl border border-white/15 bg-white/5 p-3 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="mt-1 text-sm text-white/80">{n.description}</div>
                      <div className="mt-1 text-xs text-white/60">{fmtD(n.date_posted || n.createdAt)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditNotice(n)}
                        className="h-7 rounded-md border border-blue-300/60 bg-white/5 px-2 text-xs text-blue-300 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNotice(n)}
                        className="h-7 rounded-md border border-rose-300/60 bg-white/5 px-2 text-xs text-rose-300 hover:bg-white/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Create Hostel */}
      <Modal open={showHostelCreate} title="Create hostel" onClose={() => setShowHostelCreate(false)}>
        <form onSubmit={createHostel} className="space-y-4 text-white">
          <label className="block">
            <span className="mb-1 block text-sm">Name</span>
            <input className="input-dark w-full rounded px-3 py-2" value={hostelForm.name}
              onChange={(e) => setHostelForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Location</span>
            <input className="input-dark w-full rounded px-3 py-2" value={hostelForm.location}
              onChange={(e) => setHostelForm((f) => ({ ...f, location: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Description (optional)</span>
            <textarea rows={3} className="input-dark w-full rounded px-3 py-2" value={hostelForm.description}
              onChange={(e) => setHostelForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowHostelCreate(false)} className="btn-ghost rounded px-4 py-2 text-sm">Close</button>
            <button className="btn-primary rounded px-4 py-2 text-sm font-medium">Create</button>
          </div>
        </form>
      </Modal>

      {/* ✨ Edit Hostel */}
      <Modal open={showHostelEdit} title="Edit hostel" onClose={() => setShowHostelEdit(false)}>
        <form onSubmit={submitHostelEdit} className="space-y-4 text-white">
          <label className="block">
            <span className="mb-1 block text-sm">Name</span>
            <input className="input-dark w-full rounded px-3 py-2" value={hostelEditForm.name}
              onChange={(e) => setHostelEditForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Location</span>
            <input className="input-dark w-full rounded px-3 py-2" value={hostelEditForm.location}
              onChange={(e) => setHostelEditForm((f) => ({ ...f, location: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Description</span>
            <textarea rows={3} className="input-dark w-full rounded px-3 py-2" value={hostelEditForm.description}
              onChange={(e) => setHostelEditForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowHostelEdit(false)} className="btn-ghost rounded px-4 py-2 text-sm">Cancel</button>
            <button className="btn-primary rounded px-4 py-2 text-sm font-medium">Save changes</button>
          </div>
        </form>
      </Modal>

      {/* Create Notice */}
      <Modal open={showNoticeCreate} title="Create notice" onClose={() => setShowNoticeCreate(false)}>
        <form onSubmit={createNotice} className="space-y-4 text-white">
          <label className="block">
            <span className="mb-1 block text-sm">Title</span>
            <input className="input-dark w-full rounded px-3 py-2"
              value={noticeForm.title} onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Description</span>
            <textarea rows={3} className="input-dark w-full rounded px-3 py-2"
              value={noticeForm.description} onChange={(e) => setNoticeForm((f) => ({ ...f, description: e.target.value }))} required />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNoticeCreate(false)} className="btn-ghost rounded px-4 py-2 text-sm">Close</button>
            <button className="btn-primary rounded px-4 py-2 text-sm font-medium">Create</button>
          </div>
        </form>
      </Modal>

      {/* ✨ Edit Notice */}
      <Modal open={showNoticeEdit} title="Edit notice" onClose={() => setShowNoticeEdit(false)}>
        <form onSubmit={submitNoticeEdit} className="space-y-4 text-white">
          <label className="block">
            <span className="mb-1 block text-sm">Title</span>
            <input className="input-dark w-full rounded px-3 py-2"
              value={noticeEditForm.title} onChange={(e) => setNoticeEditForm((f) => ({ ...f, title: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Description</span>
            <textarea rows={3} className="input-dark w-full rounded px-3 py-2"
              value={noticeEditForm.description} onChange={(e) => setNoticeEditForm((f) => ({ ...f, description: e.target.value }))} required />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNoticeEdit(false)} className="btn-ghost rounded px-4 py-2 text-sm">Cancel</button>
            <button className="btn-primary rounded px-4 py-2 text-sm font-medium">Save changes</button>
          </div>
        </form>
      </Modal>

      {/* Withdraw */}
      <Modal open={showWithdraw} title="Request Withdrawal" onClose={() => setShowWithdraw(false)}>
        <form onSubmit={submitWithdraw} className="space-y-4 text-white">
          <div className="text-sm text-white/80">
            Available: <span className="font-medium">{fmtAmt(stats.available)}</span>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm">Amount (LKR)</span>
            <input type="number" min="0" step="0.01" className="input-dark w-full rounded px-3 py-2"
              value={withdrawForm.amount} onChange={(e) => setWithdrawForm((f) => ({ ...f, amount: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Method</span>
            <select className="dark-native w-full rounded border border-white/20 px-3 py-2" value={withdrawForm.method}
              onChange={(e) => setWithdrawForm((f) => ({ ...f, method: e.target.value }))}>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowWithdraw(false)} className="btn-ghost rounded px-4 py-2 text-sm">Close</button>
            <button disabled={withdrawing} className="btn-primary rounded px-4 py-2 text-sm font-medium">
              {withdrawing ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Refund */}
      <Modal open={showRefund} title="Request Refund" onClose={() => setShowRefund(false)}>
        <form onSubmit={submitRefund} className="space-y-4 text-white">
          <div className="text-sm text-white/80">
            Available: <span className="font-medium">{fmtAmt(stats.available)}</span>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm">Payment to Refund</span>
            <input
              type="text"
              className="input-dark w-full rounded px-3 py-2"
              value={
                refundForm.paymentId
                  ? (() => {
                      const p = payments.find((x) => x._id === refundForm.paymentId);
                      return p ? `Payment ${refundForm.paymentId.slice(-6)} (${fmtAmt(p.amount)})` : "Invalid Payment";
                    })()
                  : "Select from table"
              }
              readOnly
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Amount (LKR)</span>
            <input type="number" min="0" step="0.01" className="input-dark w-full rounded px-3 py-2"
              value={refundForm.amount} onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Method</span>
            <select className="dark-native w-full rounded border border-white/20 px-3 py-2" value={refundForm.method}
              onChange={(e) => setRefundForm((f) => ({ ...f, method: e.target.value }))}>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Student</span>
            <input type="text" className="input-dark w-full rounded px-3 py-2"
              value={refundForm.studentId ? userLabel(refundForm.studentId) : ""} readOnly />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowRefund(false)} className="btn-ghost rounded px-4 py-2 text-sm">Close</button>
            <button disabled={refunding} className="btn-primary rounded px-4 py-2 text-sm font-medium">
              {refunding ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
