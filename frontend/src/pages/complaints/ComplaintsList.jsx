// src/pages/student/ComplaintsList.jsx
import { useEffect, useMemo, useRef, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import api from "../../services/api"
import { useAuth } from "../../context/AuthContext"

// ---------- small utils ----------
const fdt = (d) => (d ? new Date(d).toLocaleString() : "—")
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []
const safeId = (x) => (typeof x === "string" ? x : x?._id || x?.id || "")

const pickRoomField = (row) =>
  row?.room ??
  row?.room_id ??
  row?.roomId ??
  row?.booking?.room ??
  row?.assignment?.room ??
  row?.roomRef ??
  row?.roomDetail ??
  null

const pickUserName = (u) =>
  u?.name || u?.fullName || u?.email || u?.username || u?.displayName

const makeRoomLabel = (valOrRow, roomsList) => {
  const val =
    valOrRow && !valOrRow?.name && !valOrRow?._id && !valOrRow?.id
      ? pickRoomField(valOrRow)
      : valOrRow

  if (!val) return "—"

  if (typeof val === "object") {
    const label =
      val.name || val.type || val.number || val.no || val.code || val.label
    if (label) return label
    const id = safeId(val)
    if (!id) return "—"
    const match = (roomsList || []).find((r) => safeId(r) === id)
    return match
      ? match.name ||
          match.type ||
          match.number ||
          match.code ||
          `Room ${String(id).slice(-4)}`
      : `Room ${String(id).slice(-4)}`
  }

  const id = String(val)
  const match = (roomsList || []).find((r) => safeId(r) === id)
  return match
    ? match.name ||
        match.type ||
        match.number ||
        match.code ||
        `Room ${id.slice(-4)}`
    : `Room ${id.slice(-4)}`
}

// ---------- data fetching ----------
async function fetchComplaintsForMe() {
  const variants = [
    { me: true, limit: 200, sort: "-createdAt" },
    { user: "me", limit: 200, sort: "-createdAt" },
    { user_id: "me", limit: 200, sort: "-createdAt" },
    { limit: 200, sort: "-createdAt" },
    {},
  ]
  for (const params of variants) {
    try {
      const res = await api.get("/complaints", { params })
      return getArr(res)
    } catch {}
  }
  return []
}

// Cache + lazy-ensure user names
function useUserNames() {
  const [users, setUsers] = useState({})

  const ensureUser = async (maybeUser) => {
    if (typeof maybeUser === "object" && pickUserName(maybeUser)) {
      const id = safeId(maybeUser)
      if (id && !users[id]) {
        setUsers((m) => ({ ...m, [id]: pickUserName(maybeUser) }))
      }
      return
    }
    const id = safeId(maybeUser)
    if (!id || users[id]) return
    try {
      const { data } = await api.get(`/users/${id}`)
      const name = pickUserName(data) || `User ${String(id).slice(-4)}`
      setUsers((m) => ({ ...m, [id]: name }))
    } catch {
      setUsers((m) => ({ ...m, [id]: `User ${String(id).slice(-4)}` }))
    }
  }

  const userLabel = (maybeUser) => {
    const nameFromObj = pickUserName(maybeUser)
    if (nameFromObj) return nameFromObj
    const id = safeId(maybeUser)
    return id ? users[id] || `User ${String(id).slice(-4)}` : "—"
  }

  return { ensureUser, userLabel }
}

// ---------- simple modal ----------
function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-base font-semibold text-white/90">{title}</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-white/60 hover:bg-white/5"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ---------- styles ----------
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 px-3 py-1.5"
const iconBtn =
  "inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white hover:bg-white/10"

// ---------- status badge ----------
function StatusBadge({ v }) {
  const s = String(v || "").toLowerCase()
  const cls =
    s === "resolved"
      ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/20"
      : s.includes("progress")
      ? "bg-sky-400/15 text-sky-300 border-sky-400/20"
      : s === "cancelled"
      ? "bg-rose-400/15 text-rose-300 border-rose-400/20"
      : "bg-amber-400/15 text-amber-300 border-amber-400/20"
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize ${cls}`}>
      {v || "—"}
    </span>
  )
}

// ========== main component ==========
export default function ComplaintsList() {
  const { user } = useAuth()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  // modals
  const [openDelete, setOpenDelete] = useState(false)

  // delete state
  const [deleteRow, setDeleteRow] = useState(null)

  // toasts
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")
  const toast = (m, isErr = false) => {
    setMsg(isErr ? "" : m)
    setErr(isErr ? m : "")
    setTimeout(() => {
      setMsg("")
      setErr("")
    }, 2200)
  }

  const { ensureUser, userLabel } = useUserNames()
  const ensureUserRef = useRef(ensureUser)
  useEffect(() => {
    ensureUserRef.current = ensureUser
  }, [ensureUser])

  // ---- initial load ONCE ----
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await fetchComplaintsForMe()
        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setRows(list)

        // prime names
        Array.from(
          new Set(
            (list || [])
              .flatMap((x) => [x.user, x.assignedTo])
              .filter((v) => v != null)
          )
        ).forEach((idOrObj) => ensureUserRef.current?.(idOrObj))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // ---- Delete complaint ----
  async function deleteComplaint(rowId) {
    const id = safeId(rowId)
    if (!id) throw new Error("Invalid complaint id")
    await api.delete(`/complaints/${id}`)
  }

  const askDelete = (row) => {
    setDeleteRow(row)
    setOpenDelete(true)
  }

  const onDeleteConfirm = async () => {
    if (!deleteRow) return
    try {
      await deleteComplaint(deleteRow)
      toast("Deleted")
      setOpenDelete(false)
      setDeleteRow(null)

      // refresh list
      setLoading(true)
      const data = await fetchComplaintsForMe()
      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (e2) {
      toast(e2?.response?.data?.message || "Delete failed", true)
    }
  }

  return (
    <AppLayout>
      <h2 className="text-2xl font-semibold text-white/90">My Complaints</h2>

      {(msg || err) && (
        <div className="mt-3">
          {msg && (
            <span className="rounded bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300 border border-emerald-400/20">
              {msg}
            </span>
          )}
          {err && (
            <span className="ml-2 rounded bg-rose-400/15 px-3 py-1 text-sm text-rose-300 border border-rose-400/20">
              {err}
            </span>
          )}
        </div>
      )}

      <div className="mt-6">
        <Section title="All complaints" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "room", header: "Room", render: (r) => makeRoomLabel(r, []) },
              { key: "description", header: "Issue", render: (r) => r.description || r.issueDetails || "—" },
              { key: "status", header: "Status", render: (r) => <StatusBadge v={r.status} /> },
              { key: "assignedTo", header: "Assigned to", render: (r) => userLabel(r.assignedTo) },
              { key: "createdAt", header: "Created", render: (r) => fdt(r.createdAt || r.date) },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <div className="flex gap-2">
                    <button className={iconBtn} onClick={() => askDelete(r)} title="Delete">
                      🗑️ <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                ),
              },
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "No complaints found."}
          />
        </Section>
      </div>

      {/* Delete confirm modal */}
      <Modal open={openDelete} title="Delete complaint" onClose={() => setOpenDelete(false)}>
        <div className="space-y-4">
          <p className="text-white/80">Are you sure you want to delete this complaint?</p>
          <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            <div><span className="opacity-70">Subject: </span>{deleteRow?.subject || "—"}</div>
            <div className="line-clamp-2"><span className="opacity-70">Description: </span>{deleteRow?.description || deleteRow?.issueDetails || "—"}</div>
          </div>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setOpenDelete(false)}>Cancel</button>
            <button
              className="rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-900 font-medium px-4 py-2 shadow"
              onClick={onDeleteConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
