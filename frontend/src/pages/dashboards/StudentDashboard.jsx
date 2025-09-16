// src/pages/student/StudentDashboard.jsx
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import AppLayout from "../../layouts/AppLayout"
import StatCard from "../../components/StatCard"
import DataTable from "../../components/DataTable"
import Section from "../../components/Section"
import { useAuth } from "../../context/AuthContext"
import api from "../../services/api"

// ---------- helpers ----------
const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "--")
const todayISO = () => new Date().toISOString().slice(0, 10)
const addDaysISO = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []
const isPaid = (s) => ["paid", "completed", "success"].includes(String(s || "").toLowerCase())
const fmtAmt = (n) => (n == null ? "--" : `LKR ${Number(n).toLocaleString()}`)

// tiny GET-with-fallback helper used by ensureRoom/ensureHostel
async function safeGet(paths) {
  for (const p of paths) {
    try {
      const { data } = await api.get(p)
      if (data) return data
    } catch {}
  }
  return null
}

// ---------- Local CSS (dark inputs/selects/buttons/table) ----------
const LocalCss = () => (
  <style>{`
    .btn-primary { background:#111827; color:#fff; }
    .btn-primary:hover { background:#0f172a; }
    .btn-ghost  { border:1px solid rgba(255,255,255,.2); background:transparent; color:#fff; }
    .btn-ghost:hover { background:rgba(255,255,255,.08); }
    .btn-soft { background:rgba(255,255,255,.20); color:#fff; backdrop-filter: blur(6px); }
    .btn-soft:hover { background:rgba(255,255,255,.28); }

    .input-dark { background:rgba(255,255,255,.10); color:#fff; border:1px solid rgba(255,255,255,.2); }
    .input-dark::placeholder { color:rgba(255,255,255,.7); }
    .select-dark option { background:#0b1220; color:#fff; }
    .card-glass { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.15); }
    .table-dark thead { background:rgba(255,255,255,.06); color:#fff; }
    .table-dark td, .table-dark th { border-color: rgba(255,255,255,.08); }
    .notice-box { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.15) }
    .modal-backdrop { background: rgba(0,0,0,.5); }
    .modal-panel { background: rgba(17,24,39,.95); color:#fff; border:1px solid rgba(255,255,255,.12); }
    .chip { border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#fff; }
  `}</style>
)

// ---------- UI ----------
function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center modal-backdrop p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl modal-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm text-white/70 hover:bg-white/10">Close</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const userId = user?._id || user?.id || null

  // ---------- data ----------
  const [hostels, setHostels] = useState([])
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [notices, setNotices] = useState([])

  // small caches for labels
  const [roomMap, setRoomMap] = useState({})     // id -> room object
  const [hostelMap, setHostelMap] = useState({}) // id -> hostel object

  // ---------- ensure helpers (fetch & cache missing entities) ----------
  const ensureHostel = async (hostelId) => {
    if (!hostelId || hostelMap[hostelId]) return
    const data = await safeGet([`/hostels/${hostelId}`, `/hostel/${hostelId}`])
    if (data) setHostelMap(m => ({ ...m, [hostelId]: data }))
    else setHostelMap(m => ({ ...m, [hostelId]: { _id: hostelId, name: `Hostel ${String(hostelId).slice(-6)}` }}))
  }

  const ensureRoom = async (roomId) => {
    if (!roomId || roomMap[roomId]) return
    const data = await safeGet([`/rooms/${roomId}`, `/room/${roomId}`])
    if (data) {
      setRoomMap(m => ({ ...m, [roomId]: data }))
      const hid = data.hostel || data.hostel_id || data.hostelId
      if (hid) ensureHostel(hid)
    } else {
      setRoomMap(m => ({ ...m, [roomId]: { _id: roomId, name: `Room ${String(roomId).slice(-6)}` }}))
    }
  }

  // ---------- messages ----------
  const [ok, setOk] = useState("")
  const [err, setErr] = useState("")
  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m)
    setErr(isErr ? m : "")
    setTimeout(() => { setOk(""); setErr("") }, 2200)
  }

  // ---------- modals ----------
  const [showBook, setShowBook] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showComplaint, setShowComplaint] = useState(false)
  const [showPay, setShowPay] = useState(false)

  // ---------- forms ----------
  const [bookForm, setBookForm] = useState({
    hostel_id: "",
    room_id: "",
    start_date: todayISO(),
    end_date: addDaysISO(30),
  })
  const [editForm, setEditForm] = useState({ id: "", start_date: todayISO(), end_date: addDaysISO(30) })
  const [feedbackForm, setFeedbackForm] = useState({ comments: "", rating: 5, room_id: "" })
  const [complaintForm, setComplaintForm] = useState({ subject: "", description: "", room_id: "" })
  const [payForm, setPayForm] = useState({ booking_id: "", amount: "", method: "card" })

  // ---------- loading flags ----------
  const [loadingHostels, setLoadingHostels] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)

  // ---------- generic fetch with fallbacks ----------
  const fetchWithParamFallback = async (url, baseParams, variants = []) => {
    try {
      const res = await api.get(url, baseParams ? { params: baseParams } : undefined)
      const arr = getArr(res)
      if (Array.isArray(arr)) return arr
    } catch {}
    for (const v of variants) {
      try {
        const res = await api.get(url, v ? { params: v } : undefined)
        const arr = getArr(res)
        if (Array.isArray(arr)) return arr
      } catch {}
    }
    return []
  }

  // ---------- robust hostel loader ----------
  const loadHostels = async () => {
    setLoadingHostels(true)
    const tryGet = async (path) => {
      try {
        const res = await api.get(path)
        const arr = getArr(res)
        if (Array.isArray(arr)) return arr
      } catch {}
      return null
    }
    const tryPost = async (path, body) => {
      try {
        const res = await api.post(path, body)
        const arr = getArr(res)
        if (Array.isArray(arr)) return arr
      } catch {}
      return null
    }
    const PATHS = ["/hostels", "/hostels/list", "/hostels/all", "/hostel/list", "/hostel/all"]
    for (const p of PATHS) {
      const r = await tryGet(p)
      if (r) { setLoadingHostels(false); return r }
    }
    const POSTS = [
      { path: "/hostels/search", body: { status: "active" } },
      { path: "/hostel/search", body: { status: "active" } },
      { path: "/hostels/query", body: {} },
    ]
    for (const t of POSTS) {
      const r = await tryPost(t.path, t.body)
      if (r) { setLoadingHostels(false); return r }
    }
    setLoadingHostels(false)
    return []
  }

  // ---------- robust rooms loader ----------
  const loadRoomsForHostel = async (hostelId, start_date, end_date) => {
    setLoadingRooms(true)
    if (!hostelId) { setLoadingRooms(false); return [] }
    const tryGet = async (path, params) => {
      try {
        const res = await api.get(path, params ? { params } : undefined)
        const arr = getArr(res)
        if (Array.isArray(arr)) return arr
      } catch {}
      return null
    }
    const tryPost = async (path, body) => {
      try {
        const res = await api.post(path, body)
        const arr = getArr(res)
        if (Array.isArray(arr)) return arr
      } catch {}
      return null
    }
    const PATH_TRIES = [
      `/hostels/${hostelId}/rooms`,
      `/rooms/hostel/${hostelId}`,
      `/rooms/by-hostel/${hostelId}`,
      `/hostel/${hostelId}/rooms`,
    ]
    for (const p of PATH_TRIES) {
      const got = await tryGet(p)
      if (got) { setLoadingRooms(false); return got }
    }
    const baseBody = { hostel_id: hostelId, start_date, end_date, availability_status: true }
    const POST_TRIES = [
      { path: "/rooms/search", body: baseBody },
      { path: "/rooms/find",   body: baseBody },
      { path: "/rooms/query",  body: baseBody },
      { path: "/rooms",        body: baseBody },
    ]
    for (const t of POST_TRIES) {
      const got = await tryPost(t.path, t.body)
      if (got) { setLoadingRooms(false); return got }
    }
    const all = await tryGet("/rooms")
    if (all) {
      const hid = String(hostelId)
      const filtered = all.filter(r =>
        [r.hostel, r.hostel_id, r.hostelId]?.some(v => String(v) === hid)
      )
      setLoadingRooms(false)
      return filtered
    }
    setLoadingRooms(false)
    return []
  }

  // ---------- initial load ----------
  const loadAll = async () => {
    try {
      const hs = await loadHostels()
      setHostels(hs)
      const hm = {}
      hs.forEach(h => { const id = h._id || h.id; if (id) hm[id] = h })
      setHostelMap(hm)

      const defaultHostel = bookForm.hostel_id || hs[0]?._id || hs[0]?.id || ""

      const r = await loadRoomsForHostel(defaultHostel, bookForm.start_date, bookForm.end_date)
      setRooms(r)
      const rm = {}
      r.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x })
      setRoomMap(m => ({ ...rm, ...m })) // keep any previously ensured entries

      const b = await fetchWithParamFallback(
        "/bookings",
        { user: userId, limit: 50, sort: "-createdAt" },
        [
          { user_id: userId, limit: 50, sort: "-createdAt" },
          { student: userId, limit: 50, sort: "-createdAt" },
          { createdBy: userId, limit: 50, sort: "-createdAt" },
          { limit: 50, sort: "-createdAt" },
        ]
      )
      setBookings(b)

      // prime caches for any bookings that only contain ids
      const roomIds = new Set((b || []).map(x => x.room_id).filter(Boolean))
      const hostelIds = new Set((b || []).map(x => x.hostel_id || x.hostelId).filter(Boolean))
      await Promise.all([...roomIds].map(ensureRoom))
      await Promise.all([...hostelIds].map(ensureHostel))

      const p = await fetchWithParamFallback(
        "/finance",
        { user: userId, limit: 50, sort: "-date" },
        [
          { user_id: userId, limit: 50, sort: "-date" },
          { student: userId, limit: 50, sort: "-date" },
          { limit: 50, sort: "-date" },
        ]
      )
      setPayments(Array.isArray(p) ? p.filter(x => String(x.method || "").toLowerCase() !== "payout") : [])

      const n = await fetchWithParamFallback(
        "/notices",
        { limit: 10, sort: "-date_posted" },
        [{ limit: 10, sort: "-createdAt" }, { limit: 10 }]
      )
      setNotices(n)

      const firstRoom = r.find(x => x?.availability_status)?._id || r[0]?._id || r[0]?.id || ""
      setBookForm(f => ({ ...f, hostel_id: defaultHostel, room_id: f.room_id || firstRoom }))
      setFeedbackForm(f => ({ ...f, room_id: firstRoom }))
      setComplaintForm(f => ({ ...f, room_id: firstRoom }))
    } catch (e) {
      toast(e?.response?.data?.message || e.message || "Failed to load data", true)
    }
  }

  const refreshLists = async () => {
    try { await loadAll() } catch { toast("Refresh failed", true) }
  }

  useEffect(() => { if (userId) loadAll() }, [userId])

  // keep maps warm if bookings change later
  useEffect(() => {
    if (!bookings?.length) return
    const rids = new Set(bookings.map(x => x.room_id).filter(Boolean))
    const hids = new Set(bookings.map(x => x.hostel_id || x.hostelId).filter(Boolean))
    rids.forEach(ensureRoom)
    hids.forEach(ensureHostel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  // ---------- derived stats ----------
  const stats = useMemo(() => {
    const upcoming = bookings.filter(b => ["pending", "confirmed", "checked_in"].includes(String(b.status || "").toLowerCase())).length
    const completed = bookings.filter(b => String(b.status || "").toLowerCase() === "completed").length
    const paidTotal = (payments || []).filter(x => isPaid(x.status)).reduce((s, x) => s + (Number(x.amount) || 0), 0)
    return {
      upcoming,
      completed,
      dues: 0,
      lastPayment: payments[0]?.amount ? fmtAmt(payments[0].amount) : "--",
      paidTotal,
    }
  }, [bookings, payments])

  // ---------- labels ----------
  const roomLabel = (id) => {
    if (!id) return "—"
    const r = roomMap[id] || rooms.find(x => String(x._id || x.id) === String(id))
    return r?.name || r?.type || `Room ${String(id).slice(-6)}`
  }
  const hostelLabel = (id) => {
    if (!id) return "—"
    const h = hostelMap[id] || hostels.find(x => String(x._id || x.id) === String(id))
    return h?.name || h?.title || `Hostel ${String(id).slice(-6)}`
  }
  const bookingHostelLabel = (bk) => {
    const hid =
      bk.hostel_id || bk.hostelId ||
      bk.hostel?._id || bk.hostel?.id ||
      (roomMap[bk.room_id]?.hostel || roomMap[bk.room_id]?.hostel_id || roomMap[bk.room_id]?.hostelId)
    return hostelLabel(hid)
  }

  // ---------- booking CRUD ----------
  const onCreateBooking = async (e) => {
    e.preventDefault()
    if (!bookForm.hostel_id) return toast("Select a hostel", true)
    if (!bookForm.room_id || !bookForm.start_date || !bookForm.end_date) return toast("Select room and dates", true)
    try {
      await api.post("/bookings", { ...bookForm, user_id: userId })
      setShowBook(false); toast("Booking created"); await refreshLists()
    } catch (e2) { toast(e2?.response?.data?.message || "Booking failed", true) }
  }

  const openEdit = (bk) => {
    setEditForm({
      id: bk._id,
      start_date: (bk.start_date || bk.startDate || "").slice(0, 10) || todayISO(),
      end_date: (bk.end_date || bk.endDate || "").slice(0, 10) || addDaysISO(30),
    })
    setShowEdit(true)
  }

  const onEditBooking = async (e) => {
    e.preventDefault()
    if (!editForm.id) return toast("Missing booking id", true)
    try {
      await api.patch(`/bookings/${editForm.id}`, { start_date: editForm.start_date, end_date: editForm.end_date })
      setShowEdit(false); toast("Booking updated"); await refreshLists()
    } catch (e2) { toast(e2?.response?.data?.message || "Update failed", true) }
  }

  const onCancelBooking = async (bk) => {
    if (!bk?._id) return
    if (!confirm("Cancel this booking?")) return
    try { await api.patch(`/bookings/${bk._id}/cancel`); toast("Booking cancelled"); await refreshLists() }
    catch (e2) { toast(e2?.response?.data?.message || "Cancel failed", true) }
  }

  // ---------- payments ----------
  const openPay = (bk) => {
    const defaultAmt = bk.amount_due ?? bk.amount ?? bk.rent ?? bk.price ?? ""
    setPayForm({ booking_id: bk._id, amount: defaultAmt, method: "card" })
    setShowPay(true)
  }

  const onPayNow = async (e) => {
    e.preventDefault()
    if (!payForm.booking_id) return toast("Missing booking", true)
    const amt = Number(payForm.amount)
    if (!amt || amt <= 0) return toast("Enter a valid amount", true)
    try {
      await api.post("/finance", {
        user_id: userId,
        booking_id: payForm.booking_id,
        amount: amt,
        method: payForm.method,
        date: new Date().toISOString(),
        status: "paid",
        meta: { note: "Mock payment from student dashboard" },
      })
      toast("Payment recorded"); setShowPay(false); await refreshLists()
    } catch (err) { toast(err?.response?.data?.message || "Payment failed", true) }
  }

  const canShowPay = (bk) => {
    const status = String(bk.status || "").toLowerCase()
    const active = ["pending", "confirmed", "checked_in"].includes(status)
    const paid = isPaid(bk.payment_status)
    return active && !paid
  }

  // ---------- feedback & complaint ----------
  const onSubmitFeedback = async (e) => {
    e.preventDefault()
    try {
      await api.post("/feedback", {
        user_id: userId,
        room_id: feedbackForm.room_id || undefined,
        comments: feedbackForm.comments,
        rating: Number(feedbackForm.rating) || 5,
        date: new Date().toISOString(),
      })
      toast("Feedback submitted"); setShowFeedback(false)
      setFeedbackForm({ comments: "", rating: 5, room_id: rooms[0]?._id || rooms[0]?.id || "" })
    } catch (e2) { toast(e2?.response?.data?.message || "Feedback failed", true) }
  }

  const onSubmitComplaint = async (e) => {
    e.preventDefault()
    if (!complaintForm.subject?.trim() || !complaintForm.description?.trim()) {
      return toast("Please enter subject and description", true)
    }
    try {
      await api.post("/complaints", {
        subject: complaintForm.subject.trim(),
        description: complaintForm.description.trim(),
        user: userId,
        ...(complaintForm.room_id ? { room_id: complaintForm.room_id } : {}),
      })
      toast("Complaint submitted")
      setShowComplaint(false)
      setComplaintForm({ subject: "", description: "", room_id: rooms[0]?._id || rooms[0]?.id || "" })
    } catch (e2) { toast(e2?.response?.data?.message || "Complaint failed", true) }
  }

  // ---------- availability check ----------
  const [availMsg, setAvailMsg] = useState("")
  const checkAvailability = async () => {
    setAvailMsg("")
    if (!bookForm.hostel_id || !bookForm.start_date || !bookForm.end_date) {
      setAvailMsg("Select hostel and dates"); return
    }
    const fresh = await loadRoomsForHostel(bookForm.hostel_id, bookForm.start_date, bookForm.end_date)
    const isAvailable = fresh.some(r => String(r._id || r.id) === String(bookForm.room_id))
    setAvailMsg(isAvailable ? "✅ Selected room is available for the chosen dates." : "❌ Room not available; try another room or dates.")
    setRooms(fresh)
    const rm = {}
    fresh.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x })
    setRoomMap(m => ({ ...m, ...rm }))
  }

  // ---------- render ----------
  const upcomingOrActive = useMemo(() => {
    const now = new Date()
    return (bookings || [])
      .filter((b) => {
        const start = new Date(b.start_date || b.startDate || b.start)
        const end = new Date(b.end_date || b.endDate || b.end)
        return !isNaN(start) && !isNaN(end) ? end >= now : true
      })
      .sort(
        (a, b) =>
          new Date(a.start_date || a.startDate || a.start) -
          new Date(b.start_date || b.startDate || b.start)
      )
  }, [bookings])

  return (
    <AppLayout>
      <LocalCss />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Student Dashboard</h2>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={refreshLists} className="btn-ghost rounded-lg px-3 py-1.5">
            {loadingHostels || loadingRooms ? "Refreshing…" : "Refresh"}
          </button>
          <Link to="/bookings" className="btn-primary rounded-lg px-3 py-1.5 font-medium">All bookings</Link>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-green-500/20 px-3 py-1 text-sm text-green-300">{ok}</span>}
          {err && <span className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300">{err}</span>}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Upcoming bookings" value={stats.upcoming} />
        <StatCard title="Completed stays" value={stats.completed} />
        <StatCard title="Outstanding dues" value={`LKR ${stats.dues}`} />
        <StatCard title="Last payment" value={stats.lastPayment} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Bookings */}
        <Section
          title="My bookings"
          subtitle="Latest reservations"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setShowBook(true)} className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium">New booking</button>
              <button onClick={() => setShowFeedback(true)} className="btn-ghost rounded-lg px-3 py-1.5 text-sm">Give feedback</button>
              <button onClick={() => setShowComplaint(true)} className="btn-ghost rounded-lg px-3 py-1.5 text-sm">New complaint</button>
              <Link to="/feedback" className="btn-ghost rounded-lg px-3 py-1.5 text-sm">My feedback</Link>
              <Link to="/complaints" className="btn-ghost rounded-lg px-3 py-1.5 text-sm">My complaints</Link>
            </div>
          }
        >
          <DataTable
            columns={[
              { key: "hostel", header: "Hostel", render: (r) => bookingHostelLabel(r) },
              { key: "room", header: "Room", render: (r) => roomLabel(r.room_id) },
              { key: "start_date", header: "Start", render: (r) => fmtD(r.start_date || r.startDate || r.start) },
              { key: "end_date", header: "End", render: (r) => fmtD(r.end_date || r.endDate || r.end) },
              { key: "status", header: "Status" },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openEdit(r)} className="chip rounded-md px-2 py-1 text-xs">Edit</button>
                    <button onClick={() => onCancelBooking(r)} className="rounded-md border border-red-400/50 bg-red-400/10 px-2 py-1 text-xs text-red-300 hover:bg-red-400/20">Cancel</button>
                    {canShowPay(r) && (
                      <button onClick={() => openPay(r)} className="rounded-md border border-emerald-400/50 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-400/20">Pay</button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={upcomingOrActive}
            emptyText={"No bookings yet."}
          />
        </Section>

        {/* Payments */}
        <Section
          title="Payments"
          subtitle="Recent transactions"
          actions={<Link to="/finance" className="text-sm text-white underline">View all</Link>}
        >
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => fmtD(r.date || r.createdAt) },
              { key: "amount", header: "Amount", render: (r) => fmtAmt(r.amount) },
              { key: "method", header: "Method" },
              { key: "status", header: "Status" },
            ]}
            rows={payments}
            emptyText={"No payments found."}
          />
        </Section>
      </div>

      {/* Notices */}
      <div className="mt-6">
        <Section
          title="Latest notices"
          subtitle="What’s new from hostel owners"
          actions={<Link to="/notices" className="text-sm text-white underline">View all</Link>}
        >
          {notices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/80">No notices yet.</div>
          ) : (
            <div className="grid gap-3">
              {notices.slice(0, 6).map((n) => (
                <div key={n._id || n.id} className="notice-box rounded-2xl p-3 text-white">
                  <div className="font-medium">{n.title}</div>
                  <div className="mt-1 text-sm text-white/80">{n.description}</div>
                  <div className="mt-2 text-xs text-white/60">{fmtD(n.date_posted || n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Book a room */}
      <Modal open={showBook} title="Book a room" onClose={() => setShowBook(false)}>
        <form onSubmit={onCreateBooking} className="space-y-4 text-white">
          {/* Hostel */}
          <div>
            <div className="mb-1 text-sm font-medium">Hostel</div>
            <select
              className="select-dark input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={bookForm.hostel_id}
              onChange={async (e) => {
                const hostel_id = e.target.value
                setBookForm(f => ({ ...f, hostel_id }))
                const rs = await loadRoomsForHostel(hostel_id, bookForm.start_date, bookForm.end_date)
                setRooms(rs)
                const rm = {}
                rs.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x })
                setRoomMap(m => ({ ...m, ...rm }))
                const first = rs.find(x => x?.availability_status)?._id || rs[0]?._id || rs[0]?.id || ""
                setBookForm(f => ({ ...f, room_id: first }))
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
          </div>

          {/* Room */}
          <div>
            <div className="mb-1 text-sm font-medium">Room</div>
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
          </div>

          {/* Dates */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Start date</span>
              <input
                type="date"
                className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={bookForm.start_date}
                onChange={async (e) => {
                  const start_date = e.target.value
                  setBookForm(f => ({ ...f, start_date }))
                  if (bookForm.hostel_id) {
                    const rs = await loadRoomsForHostel(bookForm.hostel_id, start_date, bookForm.end_date)
                    setRooms(rs)
                    const rm = {}
                    rs.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x })
                    setRoomMap(m => ({ ...m, ...rm }))
                    if (!rs.some(x => String(x._id || x.id) === String(bookForm.room_id))) {
                      setBookForm(f => ({ ...f, room_id: rs[0]?._id || rs[0]?.id || "" }))
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
                  const end_date = e.target.value
                  setBookForm(f => ({ ...f, end_date }))
                  if (bookForm.hostel_id) {
                    const rs = await loadRoomsForHostel(bookForm.hostel_id, bookForm.start_date, end_date)
                    setRooms(rs)
                    const rm = {}
                    rs.forEach(x => { const id = x._id || x.id; if (id) rm[id] = x })
                    setRoomMap(m => ({ ...m, ...rm }))
                    if (!rs.some(x => String(x._id || x.id) === String(bookForm.room_id))) {
                      setBookForm(f => ({ ...f, room_id: rs[0]?._id || rs[0]?.id || "" }))
                    }
                  }
                }}
                required
              />
            </label>
          </div>

          {/* Availability check */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={checkAvailability}
              className="btn-ghost rounded-lg px-3 py-2 text-sm"
            >
              Check availability
            </button>
            {availMsg && <span className="text-sm">{availMsg}</span>}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowBook(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Close</button>
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Create booking</button>
          </div>
        </form>
      </Modal>

      {/* Edit booking */}
      <Modal open={showEdit} title="Edit booking" onClose={() => setShowEdit(false)}>
        <form onSubmit={onEditBooking} className="space-y-4 text-white">
          <div className="grid gap-4 md:grid-cols-2">
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
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Save changes</button>
          </div>
        </form>
      </Modal>

      {/* Give feedback */}
      <Modal open={showFeedback} title="Give feedback" onClose={() => setShowFeedback(false)}>
        <form onSubmit={onSubmitFeedback} className="space-y-4 text-white">
          <div>
            <div className="mb-1 text-sm font-medium">Room (optional)</div>
            <select
              className="select-dark input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={feedbackForm.room_id}
              onChange={(e) => setFeedbackForm(f => ({ ...f, room_id: e.target.value }))}
            >
              <option className="bg-gray-900 text-white" value="">—</option>
              {(rooms || []).map(r => (
                <option className="bg-gray-900 text-white" key={r._id || r.id} value={r._id || r.id}>
                  {r.name || r.type}{r.capacity ? ` • cap ${r.capacity}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
            <label className="block md:col-span-1">
              <span className="mb-1 block text-sm font-medium">Comments</span>
              <input
                className="input-dark w-full rounded-lg px-3 py-2 placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={feedbackForm.comments}
                onChange={(e) => setFeedbackForm(f => ({ ...f, comments: e.target.value }))}
                placeholder="Your experience..."
                required
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowFeedback(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Close</button>
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Submit</button>
          </div>
        </form>
      </Modal>

      {/* Create complaint */}
      <Modal open={showComplaint} title="Create complaint" onClose={() => setShowComplaint(false)}>
        <form onSubmit={onSubmitComplaint} className="space-y-4 text-white">
          <div className="grid gap-4 md:grid-cols-2">
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
                {(rooms || []).map(r => <option className="bg-gray-900 text-white" key={r._id || r.id} value={r._id || r.id}>{r.name || r.type}</option>)}
              </select>
            </label>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Description</div>
            <textarea
              rows="4"
              className="input-dark w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={complaintForm.description}
              onChange={(e) => setComplaintForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue…"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowComplaint(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm">Close</button>
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Submit complaint</button>
          </div>
        </form>
      </Modal>

      {/* Pay modal */}
      <Modal open={showPay} title="Pay for booking" onClose={() => setShowPay(false)}>
        <form onSubmit={onPayNow} className="space-y-4 text-white">
          <div>
            <label className="mb-1 block text-sm font-medium">Amount (LKR)</label>
            <input
              type="number" min={0} step="0.01"
              className="input-dark w-full rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={payForm.amount}
              onChange={(e) => setPayForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
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
            <button type="button" className="btn-ghost rounded px-3 py-1.5" onClick={() => setShowPay(false)}>Cancel</button>
            <button type="submit" className="btn-primary rounded px-3 py-1.5">Pay now</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
