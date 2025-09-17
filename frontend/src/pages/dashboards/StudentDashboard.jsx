// src/pages/student/StudentDashboard.jsx
// Full student dashboard: bookings, payments, availability, feedback, complaints.
// FIXED: Upcoming excludes completed-by-date/status; dues ignore completed.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../layouts/AppLayout";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/DataTable";
import Section from "../../components/Section";
import Button from "../../components/Button";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

/* ------------------------------- helpers ------------------------------- */
const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "--");
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const fmtAmt = (n) => (n == null ? "--" : `LKR ${Number(n).toLocaleString()}`);
const toLower = (s) => String(s || "").toLowerCase();
const isSuccessPayment = (p) => ["paid", "success", "completed"].includes(toLower(p?.status));
const sum = (arr, pick = (x) => x) => arr.reduce((a, x) => a + (Number(pick(x)) || 0), 0);

// completed stays
const isCompletedBooking = (b) => {
  const st = toLower(b?.status);
  if (["completed", "checked_out", "finished", "done"].includes(st)) return true;
  const end = new Date(b?.end_date || b?.endDate || b?.end);
  if (!isNaN(end) && end < new Date() && st !== "cancelled") return true;
  return false;
};

// dues
const computeBookingDue = (bk, allPayments = [], roomMap = {}) => {
  let base =
    Number(bk.amount_due) ||
    Number(bk.price) ||
    Number(bk.rent) ||
    Number((bk.room || {}).rent) ||
    0;

  if (!base && bk.room_id) {
    const rm = typeof bk.room_id === "object" ? bk.room_id : roomMap[bk.room_id];
    if (rm?.rent) base = Number(rm.rent);
  }

  if (!base) base = 0;

  const pays = (allPayments || []).filter(
    (p) => String(p.booking_id || p.booking) === String(bk._id || bk.id)
  );
  const paid = sum(pays.filter(isSuccessPayment), (p) => p.amount);
  return Math.max(0, base - paid);
};

// overlap helper
const overlaps = (aStart, aEnd, bStart, bEnd) => {
  const A1 = new Date(aStart), A2 = new Date(aEnd);
  const B1 = new Date(bStart), B2 = new Date(bEnd);
  if ([A1, A2, B1, B2].some(d => isNaN(d))) return false;
  return A1 < B2 && B1 < A2;
};

// safe GET across multiple paths
async function safeGet(paths, withParams) {
  for (const p of paths) {
    try {
      const { data } = await api.get(p, withParams ? { params: withParams } : undefined);
      if (data) return data;
    } catch {}
  }
  return null;
}

/* ---------------- availability (server → fallback) ---------------- */
const checkRoomAvailability = async ({ roomId, hostelId, start, end, allBookings }) => {
  try {
    const resp = await api.post("/bookings/check-availability", {
      room_id: roomId,
      hostel_id: hostelId,
      start_date: start,
      end_date: end,
    });
    const data = resp?.data;
    if (typeof data?.available !== "undefined") return !!data.available;
    if (typeof data?.isAvailable !== "undefined") return !!data.isAvailable;
    if (Array.isArray(data?.conflicts)) return data.conflicts.length === 0;
  } catch {}

  for (const p of [`/rooms/${roomId}/availability`, `/room/${roomId}/availability`]) {
    try {
      const { data } = await api.get(p, { params: { start_date: start, end_date: end } });
      if (typeof data?.available !== "undefined") return !!data.available;
      if (typeof data?.isAvailable !== "undefined") return !!data.isAvailable;
      if (Array.isArray(data?.conflicts)) return data.conflicts.length === 0;
    } catch {}
  }

  const conflicts = (allBookings || []).some(b =>
    String(b.room_id) === String(roomId) &&
    overlaps(start, end, b.start_date || b.startDate || b.start, b.end_date || b.endDate || b.end) &&
    toLower(b.status) !== "cancelled"
  );
  return !conflicts;
};

/* --------------------------------- styling --------------------------------- */
const LocalCss = () => (
  <style>{`
    .btn-ghost{border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;}
    .btn-ghost:hover{background:rgba(255,255,255,.08);}
    .input-dark{background:rgba(255,255,255,.10);color:#fff;border:1px solid rgba(255,255,255,.18);}
    .input-dark::placeholder{color:rgba(255,255,255,.7)}
    .select-dark option{background:#0b1220;color:#fff;}
    .chip{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;}
    .tab{padding:.375rem .75rem;border-radius:.5rem;border:1px solid transparent;}
    .tab--on{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.18);}
    .tab--off{color:rgba(255,255,255,.85);}
    .hero{background: radial-gradient(1200px 400px at 20% -20%, rgba(255,255,255,.12), transparent 60%);}
  `}</style>
);

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm text-white/70 hover:bg-white/10">Close</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* =============================== main component =============================== */
export default function StudentDashboard() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;

  // core data
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);            // rooms for selected hostel/date range
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);

  // caches
  const [roomMap, setRoomMap] = useState({});
  const [hostelMap, setHostelMap] = useState({});

  // UI state
  const [search, setSearch] = useState("");
  const [bookingTab, setBookingTab] = useState("active"); // active|completed|all

  // toasts
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m);
    setErr(isErr ? m : "");
    setTimeout(() => { setOk(""); setErr(""); }, 2200);
  };

  // modals
  const [showBook, setShowBook] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);
  const [showPay, setShowPay] = useState(false);

  // forms
  const [bookForm, setBookForm] = useState({ hostel_id: "", room_id: "", start_date: todayISO(), end_date: addDaysISO(30) });
  const [editForm, setEditForm] = useState({ id: "", start_date: todayISO(), end_date: addDaysISO(30) });
  const [feedbackForm, setFeedbackForm] = useState({ comments: "", rating: 5, room_id: "" });
  const [complaintForm, setComplaintForm] = useState({ subject: "", description: "", room_id: "" });
  const [payForm, setPayForm] = useState({ booking_id: "", amount: "", method: "card" });

  const [payBusy, setPayBusy] = useState(false);

  // loading flags
  const [loadingHostels, setLoadingHostels] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  /* ----------------------------- fetch utilities ----------------------------- */
  const ensureHostel = async (hostelId) => {
    if (!hostelId || hostelMap[hostelId]) return;
    const data = await safeGet([`/hostels/${hostelId}`, `/hostel/${hostelId}`]);
    if (data) setHostelMap(m => ({ ...m, [hostelId]: data }));
    else setHostelMap(m => ({ ...m, [hostelId]: { _id: hostelId, name: `Hostel ${String(hostelId).slice(-6)}` }}));
  };

  const ensureRoom = async (roomId) => {
    if (!roomId || roomMap[roomId]) return;
    const data = await safeGet([`/rooms/${roomId}`, `/room/${roomId}`]);
    if (data) {
      setRoomMap(m => ({ ...m, [roomId]: data }));
      const hid = data.hostel || data.hostel_id || data.hostelId;
      if (hid) ensureHostel(hid);
    } else {
      setRoomMap(m => ({ ...m, [roomId]: { _id: roomId, name: `Room ${String(roomId).slice(-6)}` }}));
    }
  };

  const fetchWithParamFallback = async (path, baseParams, variants = []) => {
    try {
      const res = await api.get(path, baseParams ? { params: baseParams } : undefined);
      const arr = getArr(res);
      if (Array.isArray(arr)) return arr;
    } catch {}
    for (const v of variants) {
      try {
        const res = await api.get(path, v ? { params: v } : undefined);
        const arr = getArr(res);
        if (Array.isArray(arr)) return arr;
      } catch {}
    }
    return [];
  };

  const loadHostels = async () => {
    setLoadingHostels(true);
    const tryGet = async (p) => { try { const r = await api.get(p); const a = getArr(r); if (Array.isArray(a)) return a; } catch {} return null; };
    const tryPost = async (p, b) => { try { const r = await api.post(p, b); const a = getArr(r); if (Array.isArray(a)) return a; } catch {} return null; };

    const PATHS = ["/hostels", "/hostels/list", "/hostels/all", "/hostel/list", "/hostel/all"];
    for (const p of PATHS) { const r = await tryGet(p); if (r) { setLoadingHostels(false); return r; } }

    const POSTS = [
      { path: "/hostels/search", body: { status: "active" } },
      { path: "/hostel/search", body: { status: "active" } },
      { path: "/hostels/query", body: {} },
    ];
    for (const t of POSTS) { const r = await tryPost(t.path, t.body); if (r) { setLoadingHostels(false); return r; } }

    setLoadingHostels(false);
    return [];
  };

  const loadRoomsForHostel = async (hostelId, start_date, end_date) => {
    setLoadingRooms(true);
    if (!hostelId) { setLoadingRooms(false); return []; }

    const tryGet = async (p, params) => { try { const r = await api.get(p, params ? { params } : undefined); const a = getArr(r); if (Array.isArray(a)) return a; } catch {} return null; };
    const tryPost = async (p, b) => { try { const r = await api.post(p, b); const a = getArr(r); if (Array.isArray(a)) return a; } catch {} return null; };

    const PATH_TRIES = [
      `/hostels/${hostelId}/rooms`,
      `/rooms/hostel/${hostelId}`,
      `/rooms/by-hostel/${hostelId}`,
      `/hostel/${hostelId}/rooms`,
    ];
    for (const p of PATH_TRIES) { const got = await tryGet(p); if (got) { setLoadingRooms(false); return got; } }

    // Do not force availability here; we compute / display flag column
    const baseBody = { hostel_id: hostelId, start_date, end_date };
    const POST_TRIES = [
      { path: "/rooms/search", body: baseBody },
      { path: "/rooms/find",   body: baseBody },
      { path: "/rooms/query",  body: baseBody },
      { path: "/rooms",        body: baseBody },
    ];
    for (const t of POST_TRIES) { const got = await tryPost(t.path, t.body); if (got) { setLoadingRooms(false); return got; } }

    const all = await tryGet("/rooms");
    if (all) {
      const hid = String(hostelId);
      const filtered = all.filter(r =>
        [r.hostel, r.hostel_id, r.hostelId]?.some(v => String(v) === hid)
      );
      setLoadingRooms(false);
      return filtered;
    }

    setLoadingRooms(false);
    return [];
  };

  const loadAll = async () => {
    try {
      const hs = await loadHostels();
      setHostels(hs);
      const hm = {}; hs.forEach(h => { const id = h._id || h.id; if (id) hm[id] = h; });
      setHostelMap(hm);

      const defaultHostel = bookForm.hostel_id || hs[0]?._id || hs[0]?.id || "";

      const r = await loadRoomsForHostel(defaultHostel, bookForm.start_date, bookForm.end_date);
      setRooms(r);
      const rm = {}; r.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x; });
      setRoomMap(m => ({ ...rm, ...m }));

      const b = await fetchWithParamFallback(
        "/bookings",
        { user: userId, limit: 50, sort: "-createdAt" },
        [
          { user_id: userId, limit: 50, sort: "-createdAt" },
          { student: userId, limit: 50, sort: "-createdAt" },
          { createdBy: userId, limit: 50, sort: "-createdAt" },
          { limit: 50, sort: "-createdAt" },
        ]
      );
      setBookings(b);

      // warm caches
      const roomIds = new Set((b || []).map(x => x.room_id).filter(Boolean));
      const hostelIds = new Set((b || []).map(x => x.hostel_id || x.hostelId).filter(Boolean));
      await Promise.all([...roomIds].map(ensureRoom));
      await Promise.all([...hostelIds].map(ensureHostel));

      const p = await fetchWithParamFallback(
        "/finance",
        { user: userId, limit: 50, sort: "-date" },
        [
          { user_id: userId, limit: 50, sort: "-date" },
          { student: userId, limit: 50, sort: "-date" },
          { limit: 50, sort: "-date" },
        ]
      );
      setPayments(Array.isArray(p) ? p.filter(x => String(x.method || "").toLowerCase() !== "payout") : []);

      const n = await fetchWithParamFallback(
        "/notices",
        { limit: 10, sort: "-date_posted" },
        [{ limit: 10, sort: "-createdAt" }, { limit: 10 }]
      );
      setNotices(n);

      const firstRoom = r.find(x => (x?.availability_status ?? x?.available ?? true))?._id || r[0]?._id || r[0]?.id || "";
      setBookForm(f => ({ ...f, hostel_id: defaultHostel, room_id: f.room_id || firstRoom }));
      setFeedbackForm(f => ({ ...f, room_id: firstRoom }));
      setComplaintForm(f => ({ ...f, room_id: firstRoom }));
    } catch (e) {
      toast(e?.response?.data?.message || e.message || "Failed to load data", true);
    }
  };

  const refreshLists = async () => { try { await loadAll(); } catch { toast("Refresh failed", true); } };

  useEffect(() => { if (userId) loadAll(); /* eslint-disable-next-line */ }, [userId]);
  useEffect(() => {
    if (!bookings?.length) return;
    const rids = new Set(bookings.map(x => x.room_id).filter(Boolean));
    const hids = new Set(bookings.map(x => x.hostel_id || x.hostelId).filter(Boolean));
    rids.forEach(ensureRoom);
    hids.forEach(ensureHostel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  /* ---------- derived stats (fixed upcoming vs completed + dues) ---------- */
  const stats = useMemo(() => {
    const activeStatuses = new Set(["pending", "confirmed", "checked_in"]);

    // Upcoming: active status AND not completed by status/date
    const upcoming = (bookings || []).filter((b) => {
      const st = toLower(b?.status);
      if (!activeStatuses.has(st)) return false;
      return !isCompletedBooking(b);
    }).length;

    // Completed: by status OR end-date in the past (and not cancelled)
    const completed = (bookings || []).filter(isCompletedBooking).length;

    // Total paid (successful payments only)
    const paidTotal = (payments || [])
      .filter(isSuccessPayment)
      .reduce((s, x) => s + (Number(x.amount) || 0), 0);

    // Outstanding dues across ACTIVE & NOT COMPLETED bookings
    const dues = (bookings || []).reduce((sumDue, bk) => {
      const st = toLower(bk?.status);
      if (!activeStatuses.has(st)) return sumDue;
      if (isCompletedBooking(bk)) return sumDue;
      return sumDue + computeBookingDue(bk, payments, roomMap);
    }, 0);

    return {
      upcoming,
      completed,
      dues,
      lastPayment: payments?.[0]?.amount ? fmtAmt(payments[0].amount) : "--",
      paidTotal,
    };
  }, [bookings, payments, roomMap]);

  /* ------------------------------- labels/maps ------------------------------ */
  const roomLabel = (id) => {
    if (!id) return "—";
    const r = roomMap[id] || rooms.find(x => String(x._id || x.id) === String(id));
    return r?.name || r?.type || `Room ${String(id).slice(-6)}`;
  };
  const hostelLabel = (id) => {
    if (!id) return "—";
    const h = hostelMap[id] || hostels.find(x => String(x._id || x.id) === String(id));
    return h?.name || h?.title || `Hostel ${String(id).slice(-6)}`;
  };
  const bookingHostelLabel = (bk) => {
    const hid =
      bk.hostel_id || bk.hostelId ||
      bk.hostel?._id || bk.hostel?.id ||
      (roomMap[bk.room_id]?.hostel || roomMap[bk.room_id]?.hostel_id || roomMap[bk.room_id]?.hostelId);
    return hostelLabel(hid);
  };

  /* ------------------------------ booking CRUD ------------------------------ */
  const openEdit = (bk) => {
    setEditForm({
      id: bk._id,
      start_date: (bk.start_date || bk.startDate || "").slice(0, 10) || todayISO(),
      end_date: (bk.end_date || bk.endDate || "").slice(0, 10) || addDaysISO(30),
    });
    setShowEdit(true);
  };

  const onCreateBooking = async (e) => {
    e.preventDefault();
    if (!bookForm.hostel_id) return toast("Select a hostel", true);
    if (!bookForm.room_id || !bookForm.start_date || !bookForm.end_date) return toast("Select room and dates", true);
    try {
      await api.post("/bookings", { ...bookForm, user_id: userId });
      setShowBook(false); toast("Booking created"); await refreshLists();
    } catch (e2) { toast(e2?.response?.data?.message || "Booking failed", true); }
  };

  const onEditBooking = async (e) => {
    e.preventDefault();
    if (!editForm.id) return toast("Missing booking id", true);
    try {
      await api.patch(`/bookings/${editForm.id}`, { start_date: editForm.start_date, end_date: editForm.end_date });
      setShowEdit(false); toast("Booking updated"); await refreshLists();
    } catch (e2) { toast(e2?.response?.data?.message || "Update failed", true); }
  };

  const onCancelBooking = async (bk) => {
    if (!bk?._id) return;
    if (!confirm("Cancel this booking?")) return;
    try { await api.patch(`/bookings/${bk._id}/cancel`); toast("Booking cancelled"); await refreshLists(); }
    catch (e2) { toast(e2?.response?.data?.message || "Cancel failed", true); }
  };

  /* -------------------------------- payments -------------------------------- */
  const openPay = (bk) => {
    const suggested = computeBookingDue(bk, payments, roomMap) || bk.amount_due || bk.amount || bk.rent || "";
    setPayForm({ booking_id: bk._id, amount: suggested, method: "card" });
    setShowPay(true);
  };

  const onPayNow = async (e) => {
    e.preventDefault();
    if (payBusy) return;
    if (!payForm.booking_id) return toast("Missing booking", true);

    const amt = Number(payForm.amount);
    if (!isFinite(amt) || amt <= 0) return toast("Enter a valid amount", true);

    setPayBusy(true);
    try {
      await api.post("/finance", {
        user_id: userId,
        booking_id: payForm.booking_id,
        amount: amt,
        method: payForm.method,
        date: new Date().toISOString(),
        status: "paid",
      });
      toast("Payment recorded");
      setShowPay(false);
      await refreshLists();
    } catch (err) {
      toast(err?.response?.data?.message || "Payment failed", true);
    } finally {
      setPayBusy(false);
    }
  };

  const canShowPay = (bk) => {
    const status = toLower(bk.status);
    const active = ["pending", "confirmed", "checked_in"].includes(status);
    const due = computeBookingDue(bk, payments, roomMap);
    return active && !isCompletedBooking(bk) && due > 0;
  };

  /* --------------------------- feedback & complaint -------------------------- */
  const roomOptions = () => {
    const apiRooms = (rooms || []).map(r => ({
      id: r._id || r.id,
      label: (r.name || r.type || `Room ${String(r._id || r.id).slice(-4)}`) + (r.capacity ? ` • cap ${r.capacity}` : ""),
    }));
    const bookingRooms = (bookings || [])
      .map(b => b.room_id || (b.room && b.room._id))
      .filter(Boolean)
      .map(rid => ({ id: rid, label: (roomLabel(rid) || `Room ${String(rid).slice(-4)}`) + " (from booking)" }));
    const all = [...apiRooms, ...bookingRooms];
    const unique = new Map();
    all.forEach(opt => { if (!unique.has(opt.id)) unique.set(opt.id, opt.label); });
    return Array.from(unique.entries()).map(([id, label]) => ({ id, label }));
  };

  const onSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      await api.post("/feedback", {
        user_id: userId,
        room_id: feedbackForm.room_id || undefined,
        comments: feedbackForm.comments,
        rating: Number(feedbackForm.rating) || 5,
        date: new Date().toISOString(),
      });
      toast("Feedback submitted"); setShowFeedback(false);
      setFeedbackForm({ comments: "", rating: 5, room_id: rooms[0]?._id || rooms[0]?.id || "" });
    } catch (e2) { toast(e2?.response?.data?.message || "Feedback failed", true); }
  };

  const onSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.subject?.trim() || !complaintForm.description?.trim()) {
      return toast("Please enter subject and description", true);
    }
    try {
      await api.post("/complaints", {
        subject: complaintForm.subject.trim(),
        description: complaintForm.description.trim(),
        user: userId,
        ...(complaintForm.room_id ? { room_id: complaintForm.room_id } : {}),
      });
      toast("Complaint submitted");
      setShowComplaint(false);
      setComplaintForm({ subject: "", description: "", room_id: rooms[0]?._id || rooms[0]?.id || "" });
    } catch (e2) { toast(e2?.response?.data?.message || "Complaint failed", true); }
  };

  /* ------------------------------- availability ------------------------------ */
  const [availMsg, setAvailMsg] = useState("");
  const checkAvailabilityAction = async () => {
    setAvailMsg("");
    const { hostel_id, room_id, start_date, end_date } = bookForm || {};

    if (!hostel_id || !start_date || !end_date) {
      setAvailMsg("Select hostel and dates");
      return;
    }
    if (!room_id) {
      setAvailMsg("Select a room");
      return;
    }

    // Try local flag from rooms first
    const present = rooms.find(x => String(x._id || x.id) === String(room_id));
    let flag;
    if (present && typeof present.availability_status !== "undefined") flag = !!present.availability_status;
    if (present && typeof present.available !== "undefined") flag = !!present.available;

    let isAvailable;
    if (typeof flag === "boolean") {
      isAvailable = flag;
    } else {
      isAvailable = await checkRoomAvailability({
        roomId: room_id,
        hostelId: hostel_id,
        start: start_date,
        end: end_date,
        allBookings: bookings,
      });
    }

    setAvailMsg(isAvailable
      ? "✅ Selected room is available for the chosen dates."
      : "❌ Room not available; try another room or dates."
    );
  };

  /* ------------------------------ derived lists ------------------------------ */
  const bookingsFiltered = useMemo(() => {
    let list = [...(bookings || [])];
    const now = new Date();

    if (bookingTab === "active") {
      list = list.filter(b => {
        const start = new Date(b.start_date || b.startDate || b.start);
        const end = new Date(b.end_date || b.endDate || b.end);
        const status = toLower(b.status);
        const timeActive = !isNaN(start) && !isNaN(end) ? end >= now : true;
        const statusActive = ["pending","confirmed","checked_in"].includes(status);
        // visible in "Active" if either time says not ended yet OR status is active, but not completed
        return (timeActive || statusActive) && !isCompletedBooking(b);
      });
    } else if (bookingTab === "completed") {
      list = list.filter(isCompletedBooking);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(b => {
        const host = bookingHostelLabel(b)?.toLowerCase() || "";
        const room = roomLabel(b.room_id)?.toLowerCase() || "";
        return host.includes(q) || room.includes(q) || String(b.status||"").toLowerCase().includes(q);
      });
    }

    return list.sort(
      (a, b) =>
        new Date(a.start_date || a.startDate || a.start) -
        new Date(b.start_date || b.startDate || b.start)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, bookingTab, search, rooms, hostels, roomMap, hostelMap]);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <AppLayout>
      <LocalCss />

      {/* Hero */}
      <div className="hero rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ""} 👋</h2>
            <p className="text-white/70">Browse → Book → Pay — all in one place.</p>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Search bookings, hostels, rooms…"
              className="input-dark w-64 rounded-lg px-3 py-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button onClick={() => setShowBook(true)}>New booking</Button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={refreshLists}>Refresh</Button>
          <Link to="/bookings"><Button variant="subtle">All bookings</Button></Link>
          <Link to="/finance"><Button variant="subtle">Payments</Button></Link>
          <Button variant="secondary" onClick={() => setShowFeedback(true)}>Give feedback</Button>
          <Button variant="secondary" onClick={() => setShowComplaint(true)}>New complaint</Button>
          <Link to="/notices"><Button variant="subtle">Notices</Button></Link>
        </div>

        {(ok || err) && (
          <div className="mt-3">
            {ok && <span className="rounded bg-green-500/20 px-3 py-1 text-sm text-green-300">{ok}</span>}
            {err && <span className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300">{err}</span>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Upcoming bookings" value={stats.upcoming} />
        <StatCard title="Completed stays" value={stats.completed} />
        <StatCard title="Total paid" value={fmtAmt(stats.paidTotal)} hint={`Last payment: ${stats.lastPayment}`} />
        <StatCard title="Outstanding dues" value={fmtAmt(stats.dues)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Bookings */}
        <div className="lg:col-span-2">
          <Section
            title="My bookings"
            subtitle="Manage and track your reservations"
            actions={
              <div className="flex items-center gap-2">
                <button
                  className={`tab ${bookingTab === "active" ? "tab--on" : "tab--off"}`}
                  onClick={() => setBookingTab("active")}
                >Active</button>
                <button
                  className={`tab ${bookingTab === "completed" ? "tab--on" : "tab--off"}`}
                  onClick={() => setBookingTab("completed")}
                >Completed</button>
                <button
                  className={`tab ${bookingTab === "all" ? "tab--on" : "tab--off"}`}
                  onClick={() => setBookingTab("all")}
                >All</button>
                <Button variant="secondary" className="ml-1" onClick={() => setShowBook(true)}>New</Button>
              </div>
            }
          >
            <DataTable
              columns={[
                { key: "hostel", header: "Hostel", render: (r) => bookingHostelLabel(r) },
                { key: "room", header: "Room", render: (r) => roomLabel(r.room_id) },
                { key: "start_date", header: "Start", render: (r) => fmtD(r.start_date || r.startDate || r.start) },
                { key: "end_date", header: "End", render: (r) => fmtD(r.end_date || r.endDate || r.end) },
                { key: "status", header: "Status", render: (r) => (
                  <span className="chip rounded-md px-2 py-1 text-xs capitalize">{String(r.status||"").replace("_"," ")}</span>
                )},
                {
                  key: "actions",
                  header: "Actions",
                  render: (r) => (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEdit(r)} className="chip rounded-md px-2 py-1 text-xs">Edit</button>
                      <button onClick={() => onCancelBooking(r)} className="rounded-md border border-rose-400/50 bg-rose-400/10 px-2 py-1 text-xs text-rose-300 hover:bg-rose-400/20">Cancel</button>
                      {canShowPay(r) && (
                        <button onClick={() => openPay(r)} className="rounded-md border border-emerald-400/50 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-400/20">Pay</button>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={bookingTab === "all" ? bookings : bookingsFiltered}
              emptyText={search ? "No matching bookings." : "No bookings yet."}
            />
          </Section>
        </div>

        {/* Payments + Notices */}
        <div className="space-y-6">
          <Section title="Payments" subtitle="Recent transactions" actions={<Link to="/finance" className="text-sm text-white underline">View all</Link>}>
            <DataTable
              columns={[
                { key: "date", header: "Date", render: (r) => fmtD(r.date || r.createdAt) },
                { key: "amount", header: "Amount", render: (r) => fmtAmt(r.amount) },
                { key: "method", header: "Method" },
                { key: "status", header: "Status", render: (r) => <span className="chip rounded-md px-2 py-1 text-xs capitalize">{String(r.status||"")}</span> },
              ]}
              rows={payments.slice(0, 8)}
              emptyText={"No payments found."}
            />
          </Section>

          <Section title="Latest notices" subtitle="Updates from hostel owners" actions={<Link to="/notices" className="text-sm text-white underline">View all</Link>}>
            {notices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/80">No notices yet.</div>
            ) : (
              <div className="grid gap-3">
                {notices.slice(0, 6).map((n) => (
                  <div key={n._id || n.id} className="rounded-2xl border border-white/15 bg-white/5 p-3 text-white">
                    <div className="font-medium">{n.title}</div>
                    <div className="mt-1 text-sm text-white/80">{n.description}</div>
                    <div className="mt-2 text-xs text-white/60">{fmtD(n.date_posted || n.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Book modal */}
      <Modal open={showBook} title="Book a room" onClose={() => setShowBook(false)}>
        <form onSubmit={onCreateBooking} className="space-y-4 text-white">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Hostel</span>
              <select
                className="select-dark input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={bookForm.hostel_id}
                onChange={async (e) => {
                  const hostel_id = e.target.value;
                  setBookForm(f => ({ ...f, hostel_id }));
                  const rs = await loadRoomsForHostel(hostel_id, bookForm.start_date, bookForm.end_date);
                  setRooms(rs);
                  const rm = {}; rs.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x; });
                  setRoomMap(m => ({ ...m, ...rm }));
                  const first = rs.find(x => (x?.availability_status ?? x?.available ?? true))?._id || rs[0]?._id || rs[0]?.id || "";
                  setBookForm(f => ({ ...f, room_id: first }));
                }}
                required
              >
                <option className="bg-gray-900 text-white" value="">{loadingHostels ? "Loading hostels…" : "Select a hostel"}</option>
                {(hostels || []).map(h => (
                  <option className="bg-gray-900 text-white" key={h._id || h.id} value={h._id || h.id}>
                    {h.name || h.title || `Hostel ${String(h._id || h.id).slice(-6)}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Room</span>
              <select
                className="select-dark input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={bookForm.room_id}
                onChange={(e) => setBookForm(f => ({ ...f, room_id: e.target.value }))}
                required
                disabled={!bookForm.hostel_id}
              >
                {!bookForm.hostel_id && <option className="bg-gray-900 text-white" value="">Select a hostel first</option>}
                {bookForm.hostel_id && (
                  rooms?.length ? (
                    rooms.map(r => (
                      <option className="bg-gray-900 text-white" key={r._id || r.id} value={r._id || r.id}>
                        {(r.name || r.type || `Room ${String(r._id || r.id).slice(-4)}`)}{r.capacity ? ` • cap ${r.capacity}` : ""}{r.rent ? ` • LKR ${r.rent}` : ""}
                      </option>
                    ))
                  ) : (
                    <option className="bg-gray-900 text-white" value="">{loadingRooms ? "Loading rooms…" : "No rooms found for this hostel"}</option>
                  )
                )}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Start date</span>
              <input
                type="date"
                className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={bookForm.start_date}
                onChange={async (e) => {
                  const start_date = e.target.value;
                  setBookForm(f => ({ ...f, start_date }));
                  if (bookForm.hostel_id) {
                    const rs = await loadRoomsForHostel(bookForm.hostel_id, start_date, bookForm.end_date);
                    setRooms(rs);
                    const rm = {}; rs.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x; });
                    setRoomMap(m => ({ ...m, ...rm }));
                    if (!rs.some(x => String(x._id || x.id) === String(bookForm.room_id))) {
                      setBookForm(f => ({ ...f, room_id: rs[0]?._id || rs[0]?.id || "" }));
                    }
                  }
                }}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">End date</span>
              <input
                type="date"
                className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={bookForm.end_date}
                onChange={async (e) => {
                  const end_date = e.target.value;
                  setBookForm(f => ({ ...f, end_date }));
                  if (bookForm.hostel_id) {
                    const rs = await loadRoomsForHostel(bookForm.hostel_id, bookForm.start_date, end_date);
                    setRooms(rs);
                    const rm = {}; rs.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x; });
                    setRoomMap(m => ({ ...m, ...rm }));
                    if (!rs.some(x => String(x._id || x.id) === String(bookForm.room_id))) {
                      setBookForm(f => ({ ...f, room_id: rs[0]?._id || rs[0]?.id || "" }));
                    }
                  }
                }}
                required
              />
            </label>
          </div>

          {/* Available rooms list */}
          {bookForm.hostel_id && (
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-sm text-white/80">
                Available rooms in <strong>{hostelLabel(bookForm.hostel_id)}</strong>
                {" "}(for {fmtD(bookForm.start_date)} → {fmtD(bookForm.end_date)})
              </div>

              <DataTable
                columns={[
                  { key: "name", header: "Room", render: (r) => r.name || r.type || `Room ${String(r._id || r.id).slice(-4)}` },
                  { key: "capacity", header: "Cap.", render: (r) => r.capacity ?? "—" },
                  { key: "rent", header: "Rent", render: (r) => r.rent ? `LKR ${Number(r.rent).toLocaleString()}` : "—" },
                  {
                    key: "availability_status",
                    header: "Avail.",
                    render: (r) => {
                      const flag = typeof r.availability_status !== "undefined"
                        ? r.availability_status
                        : (typeof r.available !== "undefined" ? r.available : undefined);
                      return typeof flag === "boolean" ? (flag ? "Yes" : "No") : "?";
                    }
                  },
                  {
                    key: "pick",
                    header: "",
                    render: (r) => {
                      const flag = typeof r.availability_status !== "undefined"
                        ? r.availability_status
                        : (typeof r.available !== "undefined" ? r.available : undefined);
                      const disabled = flag === false; // only disable if we *know* it's unavailable
                      const selected = String(bookForm.room_id) === String(r._id || r.id);
                      return (
                        <button
                          type="button"
                          className={`rounded-md px-2 py-1 text-xs ${selected
                            ? "border border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                            : "chip"}`}
                          onClick={() => setBookForm(f => ({ ...f, room_id: r._id || r.id }))}
                          disabled={disabled}
                          title={disabled ? "Room not available for the chosen dates" : ""}
                        >
                          {selected ? "Selected" : "Select"}
                        </button>
                      );
                    }
                  }
                ]}
                rows={rooms || []}
                emptyText={loadingRooms ? "Loading rooms…" : "No rooms found."}
              />

              <div className="mt-2 text-xs text-white/60">
                Tip: adjust dates to see more availability.
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="button" onClick={checkAvailabilityAction} className="btn-ghost rounded-lg px-3 py-2 text-sm">Check availability</button>
            {availMsg && <span className="text-sm">{availMsg}</span>}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowBook(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Close</button>
            <Button className="px-4 py-2 text-sm">Create booking</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={showEdit} title="Edit booking" onClose={() => setShowEdit(false)}>
        <form onSubmit={onEditBooking} className="space-y-4 text-white">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Start date</span>
              <input type="date" className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={editForm.start_date} onChange={(e) => setEditForm(f => ({ ...f, start_date: e.target.value }))} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">End date</span>
              <input type="date" className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={editForm.end_date} onChange={(e) => setEditForm(f => ({ ...f, end_date: e.target.value }))} required />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Close</button>
            <Button className="px-4 py-2 text-sm">Save changes</Button>
          </div>
        </form>
      </Modal>

      {/* Feedback modal */}
      <Modal open={showFeedback} title="Give feedback" onClose={() => setShowFeedback(false)}>
        <form onSubmit={onSubmitFeedback} className="space-y-4 text-white">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Rating</span>
              <input
                type="number" min="1" max="5"
                className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={feedbackForm.rating}
                onChange={(e) => setFeedbackForm(f => ({ ...f, rating: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Room (optional)</span>
              <select
                className="select-dark input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={feedbackForm.room_id}
                onChange={(e) => setFeedbackForm(f => ({ ...f, room_id: e.target.value }))}
              >
                <option className="bg-gray-900 text-white" value="">—</option>
                {roomOptions().map(opt => (
                  <option className="bg-gray-900 text-white" key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Comments</span>
            <input
              className="input-dark w-full rounded-lg px-3 py-2 placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={feedbackForm.comments}
              onChange={(e) => setFeedbackForm(f => ({ ...f, comments: e.target.value }))}
              placeholder="Your experience…"
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowFeedback(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Close</button>
            <Button className="px-4 py-2 text-sm">Submit</Button>
          </div>
        </form>
      </Modal>

      {/* Complaint modal */}
      <Modal open={showComplaint} title="Create complaint" onClose={() => setShowComplaint(false)}>
        <form onSubmit={onSubmitComplaint} className="space-y-4 text-white">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Subject</span>
              <input
                className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={complaintForm.subject}
                onChange={(e) => setComplaintForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Eg. Broken shower"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Room (optional)</span>
              <select
                className="select-dark input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={complaintForm.room_id}
                onChange={(e) => setComplaintForm(f => ({ ...f, room_id: e.target.value }))}
              >
                <option className="bg-gray-900 text-white" value="">—</option>
                {roomOptions().map(opt => (
                  <option className="bg-gray-900 text-white" key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Description</span>
            <textarea
              rows="4"
              className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={complaintForm.description}
              onChange={(e) => setComplaintForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue…"
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowComplaint(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Close</button>
            <Button className="px-4 py-2 text-sm">Submit complaint</Button>
          </div>
        </form>
      </Modal>

      {/* Pay modal */}
      <Modal open={showPay} title="Pay for booking" onClose={() => setShowPay(false)}>
        <form onSubmit={onPayNow} className="space-y-4 text-white">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Suggested due</span>
              <strong>
                {(() => {
                  const bk = bookings.find(b => String(b._id) === String(payForm.booking_id));
                  const due = bk ? computeBookingDue(bk, payments, roomMap) : 0;
                  return `LKR ${Number(due).toLocaleString()}`;
                })()}
              </strong>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Amount (LKR)</label>
            <input
              type="number" min={0} step="0.01"
              className="input-dark w-full rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={payForm.amount}
              onChange={(e) => setPayForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
            <div className="mt-2">
              <button
                type="button"
                className="btn-ghost rounded px-3 py-1.5 text-sm"
                onClick={() => {
                  const bk = bookings.find(b => String(b._id) === String(payForm.booking_id));
                  const due = bk ? computeBookingDue(bk, payments, roomMap) : 0;
                  setPayForm(f => ({ ...f, amount: due || "" }));
                }}
              >
                Pay full due
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Method</label>
            <select
              className="select-dark input-dark w-full rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={payForm.method}
              onChange={(e) => setPayForm(f => ({ ...f, method: e.target.value }))}
            >
              <option className="bg-gray-900 text-white" value="card">Card</option>
              <option className="bg-gray-900 text-white" value="cash">Cash</option>
              <option className="bg-gray-900 text-white" value="bank">Bank transfer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost rounded px-3 py-1.5" onClick={() => setShowPay(false)} disabled={payBusy}>Cancel</button>
            <Button className="px-3 py-1.5" disabled={payBusy}>
              {payBusy ? "Processing…" : "Pay now"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
