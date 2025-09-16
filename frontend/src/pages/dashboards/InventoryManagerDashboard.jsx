// InventoryManagerDashboard.jsx
import { useEffect, useMemo, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import StatCard from "../../components/StatCard"
import api from "../../services/api"

// helpers
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []
const fdt = (d) => (d ? new Date(d).toLocaleString() : "--")
const badge = (text, cls) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${cls}`}>{text}</span>
)
const toneForStatus = (s = "") => {
  const v = String(s).toLowerCase()
  if (v === "active") return "bg-emerald-100/20 text-emerald-300"
  if (v === "inactive") return "bg-gray-100/20 text-gray-400"
  if (v === "low") return "bg-amber-100/20 text-amber-300"
  if (v === "out") return "bg-rose-100/20 text-rose-400"
  return "bg-gray-100/20 text-gray-300"
}

// ---- Fetch all pages with server cap (limit ≤ 100) ----
async function fetchAllInventory(apiInstance, baseParams = {}) {
  const pageSize = 100
  let page = 1
  const all = []
  for (let i = 0; i < 200; i++) {
    const res = await apiInstance.get("/inventory", {
      params: { ...baseParams, page, limit: pageSize },
    })
    const items = res?.data?.data ?? res?.data?.items ?? res?.data ?? []
    all.push(...items)
    if (!items.length || items.length < pageSize) break
    page++
  }
  return all
}

// fetch hostels, with sensible defaults
async function fetchHostels(apiInstance) {
  const res = await apiInstance.get("/hostels", { params: { page: 1, limit: 100 } })
  return getArr(res)
}

// glassy modal
function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// very small CSV utils (no libs)
const headersExpected = ["name", "quantity", "min_level", "status", "hostel_id"]
const toCSV = (rows, headers) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = headers.map(esc).join(",");
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return head + "\n" + body;
};
const downloadBlob = (filename, text, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
const parseCSV = (text) => {
  const rows = []
  let i = 0, field = "", row = [], inQ = false
  const pushField = () => { row.push(field); field = "" }
  const pushRow = () => { rows.push(row); row = [] }
  while (i < text.length) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i += 2; continue } inQ = false; i++; continue }
      field += c; i++; continue
    } else {
      if (c === '"') { inQ = true; i++; continue }
      if (c === ",") { pushField(); i++; continue }
      if (c === "\r") { i++; continue }
      if (c === "\n") { pushField(); pushRow(); i++; continue }
      field += c; i++; continue
    }
  }
  pushField()
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) pushRow()
  return rows
}
const mapHeaders = (head) => {
  const norm = head.map((h) => String(h).trim().toLowerCase().replace(/\s+/g, "_"))
  const idx = {}
  headersExpected.forEach((h) => { idx[h] = norm.indexOf(h) })
  return idx
}
const rowsToObjects = (rows) => {
  if (!rows.length) return []
  const head = rows[0], body = rows.slice(1), idx = mapHeaders(head)
  const out = []
  for (const r of body) {
    if (r.every((v) => String(v).trim() === "")) continue
    out.push({
      name: r[idx.name] ?? "",
      quantity: r[idx.quantity] ?? "",
      min_level: r[idx.min_level] ?? "",
      status: r[idx.status] ?? "",
      hostel_id: r[idx.hostel_id] ?? "",
    })
  }
  return out
}

export default function InventoryManagerDashboard() {
  // data
  const [items, setItems] = useState([])
  const [lowStock, setLowStock] = useState([])

  // hostels dropdown data
  const [hostels, setHostels] = useState([])
  const [hostelsLoading, setHostelsLoading] = useState(false)

  // filters
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")

  // ui messages
  const [ok, setOk] = useState("")
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(true)
  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m)
    setErr(isErr ? m : "")
    setTimeout(() => { setOk(""); setErr("") }, 2200)
  }

  // modals/forms
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ hostel_id: "", name: "", quantity: 0, min_level: 0, status: "active" })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ id: "", hostel_id: "", name: "", quantity: 0, min_level: 0, status: "active" })
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ id: "", delta: 0 })
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState([])
  const [importPreview, setImportPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const baseParams = {}
      if (search.trim()) baseParams.search = search.trim()
      if (status !== "all") baseParams.status = status.toLowerCase()
      const [listAll, lows] = await Promise.all([
        fetchAllInventory(api, baseParams),
        api.get("/inventory/low-stock", { params: { page: 1, limit: 100 } }),
      ])
      setItems(listAll)
      setLowStock(getArr(lows))
    } catch (e) {
      console.error("Inventory load error:", e?.response?.data || e?.message || e)
      toast(e?.response?.data?.message || "Failed to load inventory", true)
    } finally {
      setLoading(false)
    }
  }

  const loadHostels = async () => {
    setHostelsLoading(true)
    try {
      setHostels(await fetchHostels(api))
    } catch (e) {
      console.error("Hostels load error:", e?.response?.data || e?.message || e)
    } finally {
      setHostelsLoading(false)
    }
  }

  useEffect(() => { load(); loadHostels() }, [])

  // stats
  const stats = useMemo(() => {
    const total = items.length
    const low = lowStock.length
    const out = items.filter(i => String(i.status).toLowerCase()==="out" || Number(i.quantity)===0).length
    const active = items.filter(i => String(i.status).toLowerCase()==="active").length
    return { total, low, out, active }
  }, [items, lowStock])

  // actions
  const openCreate = () => {
    setCreateForm({ hostel_id: "", name: "", quantity: 0, min_level: 0, status: "active" })
    setShowCreate(true)
  }
  const submitCreate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: String(createForm.name || "").trim(),
        quantity: Math.max(0, Number(createForm.quantity) || 0),
        min_level: Math.max(0, Number(createForm.min_level) || 0),
        status: String(createForm.status || "active").toLowerCase(),
      }
      const hid = String(createForm.hostel_id || "").trim()
      if (/^[0-9a-fA-F]{24}$/.test(hid)) payload.hostel_id = hid
      await api.post("/inventory", payload)
      setShowCreate(false)
      toast("Item created")
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Create failed", true)
    }
  }

  const openEdit = (it) => {
    setEditForm({
      id: it._id,
      hostel_id: it.hostel_id || "",
      name: it.name || "",
      quantity: it.quantity ?? 0,
      min_level: it.min_level ?? 0,
      status: it.status || "active",
    })
    setShowEdit(true)
  }
  const submitEdit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: String(editForm.name || "").trim(),
        quantity: Math.max(0, Number(editForm.quantity) || 0),
        min_level: Math.max(0, Number(editForm.min_level) || 0),
        status: String(editForm.status || "active").toLowerCase(),
      }
      const hid = String(editForm.hostel_id || "").trim()
      if (/^[0-9a-fA-F]{24}$/.test(hid)) payload.hostel_id = hid
      await api.patch(`/inventory/${editForm.id}`, payload)
      setShowEdit(false)
      toast("Item updated")
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true)
    }
  }

  const openAdjust = (it) => { setAdjustForm({ id: it._id, delta: 0 }); setShowAdjust(true) }
  const submitAdjust = async (e) => {
    e.preventDefault()
    try {
      const item = items.find(i => i._id === adjustForm.id)
      if (!item) throw new Error("Item not found")
      const d = parseInt(adjustForm.delta, 10)
      if (!Number.isFinite(d)) throw new Error("Invalid delta")
      const current = Number(item.quantity) || 0
      const nextQty = Math.max(0, current + d)
      await api.patch(`/inventory/${adjustForm.id}`, { quantity: nextQty })
      setShowAdjust(false)
      toast(d > 0 ? `+${d}` : `${d}`)
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Adjust failed", true)
    }
  }

  const quickAdjust = async (it, delta) => {
    try {
      const d = parseInt(delta, 10)
      if (!Number.isFinite(d)) throw new Error("Invalid delta")
      const current = Number(it.quantity) || 0
      const nextQty = Math.max(0, current + d)
      await api.patch(`/inventory/${it._id}`, { quantity: nextQty })
      toast(d>0?"+1":"-1")
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Adjust failed", true)
    }
  }

  const removeItem = async (it) => {
    if (!confirm(`Delete “${it.name}”?`)) return
    try { await api.delete(`/inventory/${it._id}`); toast("Deleted"); load() }
    catch (e) { toast(e?.response?.data?.message || "Delete failed", true) }
  }

  // EXPORT
  const exportCSV = () => {
    const rows = items.map(i => ({
      name: i.name ?? "",
      quantity: i.quantity ?? "",
      min_level: i.min_level ?? "",
      status: i.status ?? "",
      hostel_id: i.hostel_id ?? "",
    }))
    const csv = toCSV(rows, headersExpected)
    downloadBlob(`inventory_export_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv;charset=utf-8;")
  }

  const downloadTemplate = () => {
    const sample = [
      { name: "Broom", quantity: 10, min_level: 2, status: "active", hostel_id: "" },
      { name: "Bedsheet", quantity: 50, min_level: 10, status: "active", hostel_id: "" },
    ]
    const csv = toCSV(sample, headersExpected)
    downloadBlob("inventory_template.csv", csv, "text/csv;charset=utf-8;")
  }

  // columns
  const columns = [
    { key: "name", header: "Item" },
    {
      key: "quantity",
      header: "Qty",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => quickAdjust(r, -1)}
            className="rounded border border-white/20 bg-white/10 px-1.5 text-xs text-white hover:bg-white/20"
            title="Decrease"
          >
            -
          </button>
          <span className="min-w-[2ch] text-center">{r.quantity ?? 0}</span>
          <button
            onClick={() => quickAdjust(r, +1)}
            className="rounded border border-white/20 bg-white/10 px-1.5 text-xs text-white hover:bg-white/20"
            title="Increase"
          >
            +
          </button>
        </div>
      ),
    },
    { key: "min_level", header: "Min", render: (r) => r.min_level ?? 0 },
    { key: "status", header: "Status", render: (r) => badge(String(r.status || "—"), toneForStatus(r.status)) },
    {
      key: "health",
      header: "Stock health",
      render: (r) => {
        const q = Number(r.quantity) || 0
        const min = Number(r.min_level) || 0
        if (q === 0) return badge("Out", "bg-rose-100/20 text-rose-400")
        if (q <= min) return badge("Low", "bg-amber-100/20 text-amber-300")
        return badge("OK", "bg-emerald-100/20 text-emerald-300")
      },
    },
    { key: "hostel_id", header: "Hostel", render: (r) => (r.hostel_id ? String(r.hostel_id).slice(-6) : "—") },
    { key: "createdAt", header: "Created", render: (r) => fdt(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openAdjust(r)}
            className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
          >
            Adjust
          </button>
          <button
            onClick={() => openEdit(r)}
            className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
          >
            Edit
          </button>
          <button
            onClick={() => removeItem(r)}
            className="rounded-md border border-rose-400 bg-rose-500/20 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/30"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  const hostelLabel = (h) => h?.name ? `${h.name}${h.code ? ` (${h.code})` : ""}` : (h?._id ?? "Hostel")

  return (
    <AppLayout>
      {/* Header with gap below */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Inventory Manager</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Import CSV
          </button>
          <button
            onClick={exportCSV}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30"
          >
            New item
          </button>
          <button
            onClick={load}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Refresh
          </button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-emerald-100/20 px-3 py-1 text-sm text-emerald-300">{ok}</span>}
          {err && <span className="rounded bg-rose-100/20 px-3 py-1 text-sm text-rose-300">{err}</span>}
        </div>
      )}

      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total items" value={stats.total} />
        <StatCard title="Active" value={stats.active} />
        <StatCard title="Low stock" value={stats.low} />
        <StatCard title="Out of stock" value={stats.out} />
      </div>

      {/* filters */}
      <form onSubmit={(e)=>{ e.preventDefault(); load() }} className="mt-6 grid items-end gap-3 md:grid-cols-4">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm text-white/80">Search</span>
          <input
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50"
            placeholder="Item name…"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-white/80">Status</span>
          <select
            className="dark-native rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
            value={status}
            onChange={(e)=>setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="low">Low</option>
            <option value="out">Out</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button className="rounded border border-white/20 bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30">
            Apply
          </button>
          <button
            type="button"
            className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            onClick={()=>{ setSearch(""); setStatus("all"); load() }}
          >
            Clear
          </button>
        </div>
      </form>

      {/* tables */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="All items">
          <DataTable columns={columns} rows={items} emptyText={loading ? "Loading…" : "No items found."} />
        </Section>

        <Section title="Low stock (qty ≤ min)">
          <DataTable
            columns={[
              { key: "name", header: "Item" },
              { key: "quantity", header: "Qty" },
              { key: "min_level", header: "Min" },
              { key: "status", header: "Status", render: (r) => badge(String(r.status || "—"), toneForStatus(r.status)) },
              { key: "hostel_id", header: "Hostel", render: (r) => (r.hostel_id ? String(r.hostel_id).slice(-6) : "—") },
            ]}
            rows={lowStock}
            emptyText={loading ? "Loading…" : "No low stock items 🎉"}
          />
        </Section>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} title="Create item" onClose={()=>setShowCreate(false)}>
        <form onSubmit={submitCreate} className="space-y-4 text-white">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm">Name</span>
              <input
                className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={createForm.name}
                onChange={(e)=>setCreateForm(f=>({ ...f, name: e.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm">Hostel</span>
              <select
                className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={createForm.hostel_id}
                onChange={(e)=>setCreateForm(f=>({ ...f, hostel_id: e.target.value }))}
                disabled={hostelsLoading}
              >
                <option value="">— No hostel —</option>
                {hostels.map(h => (
                  <option key={h._id} value={h._id}>{hostelLabel(h)}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm">Quantity</span>
              <input
                type="number" min="0"
                className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={createForm.quantity}
                onChange={(e)=>setCreateForm(f=>({ ...f, quantity: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">Min level</span>
              <input
                type="number" min="0"
                className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={createForm.min_level}
                onChange={(e)=>setCreateForm(f=>({ ...f, min_level: e.target.value }))}
                required
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm">Status</span>
              <select
                className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={createForm.status}
                onChange={(e)=>setCreateForm(f=>({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="low">Low</option>
                <option value="out">Out</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={()=>setShowCreate(false)}
              className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              Close
            </button>
            <button className="rounded border border-white/20 bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30">
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={showEdit} title="Edit item" onClose={()=>setShowEdit(false)}>
        <form onSubmit={submitEdit} className="space-y-4 text-white">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm">Name</span>
              <input
                className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={editForm.name}
                onChange={(e)=>setEditForm(f=>({ ...f, name: e.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm">Hostel</span>
              <select
                className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={editForm.hostel_id || ""}
                onChange={(e)=>setEditForm(f=>({ ...f, hostel_id: e.target.value }))}
                disabled={hostelsLoading}
              >
                <option value="">— No hostel —</option>
                {hostels.map(h => (
                  <option key={h._id} value={h._id}>{hostelLabel(h)}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm">Quantity</span>
              <input
                type="number" min="0"
                className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={editForm.quantity}
                onChange={(e)=>setEditForm(f=>({ ...f, quantity: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">Min level</span>
              <input
                type="number" min="0"
                className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={editForm.min_level}
                onChange={(e)=>setEditForm(f=>({ ...f, min_level: e.target.value }))}
                required
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm">Status</span>
              <select
                className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                value={editForm.status}
                onChange={(e)=>setEditForm(f=>({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="low">Low</option>
                <option value="out">Out</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={()=>setShowEdit(false)}
              className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              Close
            </button>
            <button className="rounded border border-white/20 bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30">
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust modal */}
      <Modal open={showAdjust} title="Adjust quantity" onClose={()=>setShowAdjust(false)}>
        <form onSubmit={submitAdjust} className="space-y-4 text-white">
          <label className="block">
            <span className="mb-1 block text-sm">Delta (e.g. +5 or -3)</span>
            <input
              type="number"
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={adjustForm.delta}
              onChange={(e)=>setAdjustForm(f=>({ ...f, delta: e.target.value }))}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={()=>setShowAdjust(false)}
              className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              Close
            </button>
            <button className="rounded border border-white/20 bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30">
              Apply
            </button>
          </div>
        </form>
      </Modal>

      {/* Import modal */}
      <Modal open={showImport} title="Import CSV" onClose={()=>setShowImport(false)}>
        <div className="space-y-4 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              className="block text-sm file:mr-3 file:rounded file:border-0 file:bg-white/20 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/30"
              onChange={async (e) => {
                setImportErrors([])
                setImportRows([])
                setImportPreview([])
                const file = e.target.files?.[0]
                if (!file) return
                const text = await file.text()
                const rows = parseCSV(text)
                if (!rows.length) { setImportErrors(["Empty file."]); return }
                const head = rows[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, "_"))
                const missing = headersExpected.filter((h) => !head.includes(h))
                if (missing.length) {
                  setImportErrors([`Missing headers: ${missing.join(", ")}.`, `Expected: ${headersExpected.join(", ")}`])
                }
                setImportRows(rows)
                setImportPreview(rowsToObjects(rows))
              }}
            />
            <button
              type="button"
              onClick={downloadTemplate}
              className="rounded border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              Download template
            </button>
          </div>

          {importErrors.length > 0 && (
            <div className="space-y-1 rounded border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">
              {importErrors.map((e, i) => (<div key={i}>• {e}</div>))}
            </div>
          )}

          {importPreview.length > 0 && (
            <>
              <div className="text-sm text-white/80">Preview ({importPreview.length} rows)</div>
              <div className="max-h-64 overflow-auto rounded border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white">
                    <tr>
                      {headersExpected.map((h) => (
                        <th key={h} className="px-3 py-2 font-medium capitalize">{h.replaceAll("_", " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-white/90">
                    {importPreview.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-white/10">
                        {headersExpected.map((h) => (
                          <td key={h} className="px-3 py-1.5">{String(r[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => { setImportRows([]); setImportPreview([]); setImportErrors([]) }}
                  className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={async () => {
                    if (!importPreview.length) return
                    setImportErrors([])
                    setImporting(true)
                    try {
                      const chunk = 25
                      const errs = []
                      for (let i = 0; i < importPreview.length; i += chunk) {
                        const slice = importPreview.slice(i, i + chunk)
                        // eslint-disable-next-line no-await-in-loop
                        const results = await Promise.allSettled(slice.map((r) => {
                          const payload = {
                            name: String(r.name || "").trim(),
                            quantity: Math.max(0, Number(r.quantity) || 0),
                            min_level: Math.max(0, Number(r.min_level) || 0),
                            status: String(r.status || "active").toLowerCase(),
                          }
                          const hid = String(r.hostel_id || "").trim()
                          if (/^[0-9a-fA-F]{24}$/.test(hid)) payload.hostel_id = hid
                          return api.post("/inventory", payload)
                        }))
                        results.forEach((res, idx) => {
                          if (res.status === "rejected") {
                            errs.push(`Row ${i + idx + 2}: ${res.reason?.response?.data?.message || res.reason?.message || "Failed"}`)
                          }
                        })
                      }
                      if (errs.length) { setImportErrors(errs); toast(`Imported with ${errs.length} errors`, true) }
                      else { toast("Import complete"); setShowImport(false) }
                      await load()
                    } catch (e) {
                      setImportErrors([e?.response?.data?.message || e?.message || "Import failed"])
                    } finally {
                      setImporting(false)
                    }
                  }}
                  className="rounded border border-white/20 bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-50"
                >
                  {importing ? "Importing…" : "Import"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </AppLayout>
  )
}
