import { useEffect, useMemo, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import api from "../../services/api"

const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []
const idTail = (v) => String(v || "").slice(-6)

// ---- theme helpers (styles only) ----
const ctrl =
  "w-full rounded-lg bg-slate-800/60 border border-white/10 px-3 py-2 text-white placeholder-white/40 shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400/40"
const btnPrimary =
  "rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium px-4 py-2 shadow"
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 px-4 py-2"
const btnTiny =
  "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"

function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-base font-semibold text-white/90">{title}</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm text-white/60 hover:bg-white/5">
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function RoomsList() {
  const [rooms, setRooms] = useState([])
  const [hostels, setHostels] = useState([])
  const [ok, setOk] = useState("")
  const [err, setErr] = useState("")

  // modals
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // forms
  const [createRoom, setCreateRoom] = useState({ hostel_id: "", type: "", capacity: 1, rent: 0, availability_status: true })
  const [editRoom, setEditRoom] = useState({ id: "", hostel_id: "", type: "", capacity: 1, rent: 0, availability_status: true })

  const toast = (m, isErr=false) => { setOk(isErr ? "" : m); setErr(isErr ? m : ""); setTimeout(()=>{setOk("");setErr("")}, 2200) }

  const load = async () => {
    try {
      const [r, h] = await Promise.all([
        api.get("/rooms", { params: { limit: 100 } }),
        api.get("/hostels", { params: { limit: 100 } }),
      ])
      setRooms(getArr(r))
      const hs = getArr(h)
      setHostels(hs)
      setCreateRoom((f)=>({ ...f, hostel_id: hs[0]?._id || "" }))
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load rooms", true)
    }
  }

  useEffect(() => { load() }, [])

  const hostelNameById = useMemo(()=>{
    const m = new Map()
    hostels.forEach(h => m.set(h._id, h.name || h.location || `Hostel • ${idTail(h._id)}`))
    return m
  }, [hostels])

  const toggleAvailability = async (room) => {
    try {
      await api.patch(`/rooms/${room._id}`, { availability_status: !room.availability_status })
      toast("Availability updated")
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true)
    }
  }

  const openEdit = (room) => {
    setEditRoom({
      id: room._id,
      hostel_id: room.hostel_id || "",
      type: room.type || "",
      capacity: room.capacity ?? 1,
      rent: room.rent ?? 0,
      availability_status: !!room.availability_status,
    })
    setShowEdit(true)
  }

  const submitCreate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        hostel_id: createRoom.hostel_id,
        type: createRoom.type,
        capacity: Number(createRoom.capacity),
        rent: Number(createRoom.rent),
        availability_status: !!createRoom.availability_status,
      }
      await api.post("/rooms", payload)
      setShowCreate(false)
      toast("Room created")
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Create failed", true)
    }
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        hostel_id: editRoom.hostel_id || undefined,
        type: editRoom.type,
        capacity: Number(editRoom.capacity),
        rent: Number(editRoom.rent),
        availability_status: !!editRoom.availability_status,
      }
      await api.patch(`/rooms/${editRoom.id}`, payload)
      setShowEdit(false)
      toast("Room updated")
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true)
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white/90">Rooms</h2>
        <button
          onClick={() => setShowCreate(true)}
          className={btnPrimary}
        >
          Add room
        </button>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded border border-emerald-400/20 bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300">{ok}</span>}
          {err && <span className="ml-2 rounded border border-rose-400/20 bg-rose-400/15 px-3 py-1 text-sm text-rose-300">{err}</span>}
        </div>
      )}

      <div className="mt-6">
        <Section title="All rooms">
          <DataTable
            columns={[
              { key: "type", header: "Type" },
              { key: "capacity", header: "Cap" },
              { key: "rent", header: "Rent", render: (r) => `LKR ${r.rent}` },
              { key: "hostel_id", header: "Hostel", render: (r) => hostelNameById.get(r.hostel_id) || `— ${idTail(r.hostel_id)}` },
              { key: "availability_status", header: "Available", render: (r) => (r.availability_status ? "Yes" : "No") },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <div className="flex flex-wrap gap-2">
                    <button className={btnTiny} onClick={() => toggleAvailability(r)}>
                      {r.availability_status ? "Mark Unavailable" : "Mark Available"}
                    </button>
                    <button className={btnTiny} onClick={() => openEdit(r)}>
                      Edit
                    </button>
                  </div>
                ),
              },
            ]}
            rows={rooms}
            emptyText={"No rooms found."}
          />
        </Section>
      </div>

      {/* Create */}
      <Modal open={showCreate} title="Add room" onClose={() => setShowCreate(false)}>
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Hostel</span>
              <select className={ctrl} value={createRoom.hostel_id} onChange={(e)=>setCreateRoom(f=>({ ...f, hostel_id: e.target.value }))} required>
                <option value="">Select hostel</option>
                {hostels.map(h => <option key={h._id} value={h._id}>{hostelNameById.get(h._id)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Type</span>
              <input className={ctrl} value={createRoom.type} onChange={(e)=>setCreateRoom(f=>({ ...f, type: e.target.value }))} required/>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Capacity</span>
              <input type="number" min="1" className={ctrl} value={createRoom.capacity} onChange={(e)=>setCreateRoom(f=>({ ...f, capacity: e.target.value }))} required/>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Rent (LKR)</span>
              <input type="number" min="0" className={ctrl} value={createRoom.rent} onChange={(e)=>setCreateRoom(f=>({ ...f, rent: e.target.value }))} required/>
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-white/80">
            <input type="checkbox" checked={createRoom.availability_status} onChange={(e)=>setCreateRoom(f=>({ ...f, availability_status: e.target.checked }))}/>
            <span className="text-sm">Available</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setShowCreate(false)} className={btnGhost}>Close</button>
            <button className={btnPrimary}>Create</button>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={showEdit} title="Edit room" onClose={() => setShowEdit(false)}>
        <form onSubmit={submitEdit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Hostel</span>
              <select className={ctrl} value={editRoom.hostel_id} onChange={(e)=>setEditRoom(f=>({ ...f, hostel_id: e.target.value }))}>
                <option value="">—</option>
                {hostels.map(h => <option key={h._id} value={h._id}>{hostelNameById.get(h._id)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Type</span>
              <input className={ctrl} value={editRoom.type} onChange={(e)=>setEditRoom(f=>({ ...f, type: e.target.value }))} required/>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Capacity</span>
              <input type="number" min="1" className={ctrl} value={editRoom.capacity} onChange={(e)=>setEditRoom(f=>({ ...f, capacity: e.target.value }))} required/>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-white/80">Rent (LKR)</span>
              <input type="number" min="0" className={ctrl} value={editRoom.rent} onChange={(e)=>setEditRoom(f=>({ ...f, rent: e.target.value }))} required/>
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-white/80">
            <input type="checkbox" checked={editRoom.availability_status} onChange={(e)=>setEditRoom(f=>({ ...f, availability_status: e.target.checked }))}/>
            <span className="text-sm">Available</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setShowEdit(false)} className={btnGhost}>Close</button>
            <button className={btnPrimary}>Save</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
