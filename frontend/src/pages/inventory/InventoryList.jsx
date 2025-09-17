// InventoryList.jsx
import { useEffect, useMemo, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import StatCard from "../../components/StatCard"
import api from "../../services/api"

const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []
const fdt = (d) => (d ? new Date(d).toLocaleString() : "--")
const badge = (t, cls) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${cls}`}>{t}</span>
)
const tone = (s = "") => {
  const v = String(s).toLowerCase()
  if (v === "active") return "bg-emerald-100/20 text-emerald-300"
  if (v === "inactive") return "bg-white/10 text-white/80"
  if (v === "low") return "bg-amber-100/20 text-amber-300"
  if (v === "out") return "bg-rose-100/20 text-rose-300"
  return "bg-white/10 text-white/80"
}

// inventory pages
async function fetchAllInventory(apiInstance, baseParams = {}) {
  const pageSize = 100
  let page = 1
  const all = []
  for (let i = 0; i < 200; i++) {
    const res = await apiInstance.get("/inventory", { params: { ...baseParams, page, limit: pageSize } })
    const items = res?.data?.data ?? res?.data?.items ?? res?.data ?? []
    all.push(...items)
    if (!items.length || items.length < pageSize) break
    page++
  }
  return all
}

async function fetchHostels(apiInstance) {
  const res = await apiInstance.get("/hostels", { params: { page: 1, limit: 100 } })
  return getArr(res)
}

export default function InventoryList() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState("")
  const [err, setErr] = useState("")
  const toast = (m, bad = false) => {
    setOk(bad ? "" : m)
    setErr(bad ? m : "")
    setTimeout(() => {
      setOk("")
      setErr("")
    }, 2000)
  }

  // hostels for dropdown
  const [hostels, setHostels] = useState([])
  const [hostelsLoading, setHostelsLoading] = useState(false)

  // modals
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ hostel_id: "", name: "", quantity: 0, min_level: 0, status: "active" })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ id: "", hostel_id: "", name: "", quantity: 0, min_level: 0, status: "active" })
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ id: "", delta: 0 })

  const load = async () => {
    setLoading(true)
    try {
      const baseParams = {}
      if (search.trim()) baseParams.search = search.trim()
      if (status !== "all") baseParams.status = status.toLowerCase()
      const all = await fetchAllInventory(api, baseParams)
      setItems(all)
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
      const list = await fetchHostels(api)
      setHostels(list)
    } catch (e) {
      console.error("Hostels load error:", e?.response?.data || e?.message || e)
    } finally {
      setHostelsLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadHostels()
  }, [])

  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter((i) => String(i.status).toLowerCase() === "active").length
    const low =
      items.filter(
        (i) => String(i.status).toLowerCase() === "low" || Number(i.quantity) <= Number(i.min_level),
      ).length
    const out =
      items.filter(
        (i) => String(i.status).toLowerCase() === "out" || Number(i.quantity) === 0,
      ).length
    return { total, active, low, out }
  }, [items])

  const openCreate = () => {
    setCreateForm({ hostel_id: "", name: "", quantity: 0, min_level: 0, status: "active" })
    setShowCreate(true)
  }
  const submitCreate = async (e) => {
    e.preventDefault()
    try {
      const p = {
        name: String(createForm.name || "").trim(),
        quantity: Math.max(0, Number(createForm.quantity) || 0),
        min_level: Math.max(0, Number(createForm.min_level) || 0),
        status: String(createForm.status || "active").toLowerCase(),
      }
      const hid = String(createForm.hostel_id || "").trim()
      if (/^[0-9a-fA-F]{24}$/.test(hid)) p.hostel_id = hid
      await api.post("/inventory", p)
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
      const p = {
        name: String(editForm.name || "").trim(),
        quantity: Math.max(0, Number(editForm.quantity) || 0),
        min_level: Math.max(0, Number(editForm.min_level) || 0),
        status: String(editForm.status || "active").toLowerCase(),
      }
      const hid = String(editForm.hostel_id || "").trim()
      if (/^[0-9a-fA-F]{24}$/.test(hid)) p.hostel_id = hid
      await api.patch(`/inventory/${editForm.id}`, p)
      setShowEdit(false)
      toast("Updated")
      load()
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true)
    }
  }

  const openAdjust = (it) => {
    setAdjustForm({ id: it._id, delta: 0 })
    setShowAdjust(true)
  }

  const submitAdjust = async (e) => {
    e.preventDefault()
    try {
      const item = items.find((i) => i._id === adjustForm.id)
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
      console.error("submitAdjust error:", e?.response?.data || e?.message || e)
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
      load()
    } catch (e) {
      console.error("quickAdjust error:", e?.response?.data || e?.message || e)
      toast(e?.response?.data?.message || "Adjust failed", true)
    }
  }

  const removeItem = async (it) => {
    if (!confirm(`Delete “${it.name}”?`)) return
    try {
      await api.delete(`/inventory/${it._id}`)
      toast("Deleted")
      load()
    } catch (e) {
      toast("Delete failed", true)
    }
  }

  const exportCSV = () => {
    const headers = ["name", "quantity", "min_level", "status", "hostel_id"]
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const body = items.map((i) => [i.name, i.quantity, i.min_level, i.status, i.hostel_id].map(esc).join(",")).join("\n")
    const csv = headers.join(",") + "\n" + body
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "inventory.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const hostelLabel = (h) => (h?.name ? `${h.name}${h.code ? ` (${h.code})` : ""}` : h?._id ?? "Hostel")

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
          >
            -
          </button>
          <span className="min-w-[2ch] text-center">{r.quantity ?? 0}</span>
          <button
            onClick={() => quickAdjust(r, +1)}
            className="rounded border border-white/20 bg-white/10 px-1.5 text-xs text-white hover:bg-white/20"
          >
            +
          </button>
        </div>
      ),
    },
    { key: "min_level", header: "Min", render: (r) => r.min_level ?? 0 },
    { key: "status", header: "Status", render: (r) => badge(String(r.status || "—"), tone(r.status)) },
    {
      key: "hostel_id",
      header: "Hostel",
      render: (r) => {
        const hostel = hostels.find(h => h._id === r.hostel_id)
        return hostel ? hostelLabel(hostel) : "—"
      },
    },
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
            className="rounded-md border border-rose-300/40 bg-rose-100/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-100/20"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Inventory</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-white/90"
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
          {ok && <span className="rounded bg-emerald-100/20 px-3 py-1 text-sm text-emerald-200">{ok}</span>}
          {err && <span className="rounded bg-rose-100/20 px-3 py-1 text-sm text-rose-200">{err}</span>}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total items" value={stats.total} />
        <StatCard title="Active" value={stats.active} />
        <StatCard title="Low stock" value={stats.low} />
        <StatCard title="Out of stock" value={stats.out} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load() }} className="mt-6 grid items-end gap-3 md:grid-cols-4">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm text-white/80">Search</span>
          <input
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Item name…"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-white/80">Status</span>
          <select
            className="dark-native rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="low">Low</option>
            <option value="out">Out</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90">
            Apply
          </button>
          <button
            type="button"
            className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            onClick={() => {
              setSearch("")
              setStatus("all")
              load()
            }}
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-6">
        <Section title="All items">
          <DataTable columns={columns} rows={items} emptyText={loading ? "Loading…" : "No items found."} />
        </Section>
      </div>

      {/* Create */}
      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-lg font-semibold">Create item</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={submitCreate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Name</span>
                    <input
                      className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </label>

                  {/* Hostel dropdown */}
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Hostel</span>
                    <select
                      className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={createForm.hostel_id}
                      onChange={(e) => setCreateForm((f) => ({ ...f, hostel_id: e.target.value }))}
                      disabled={hostelsLoading}
                    >
                      <option value="">— No hostel —</option>
                      {hostels.map((h) => (
                        <option key={h._id} value={h._id}>
                          {hostelLabel(h)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Quantity</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={createForm.quantity}
                      onChange={(e) => setCreateForm((f) => ({ ...f, quantity: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Min level</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={createForm.min_level}
                      onChange={(e) => setCreateForm((f) => ({ ...f, min_level: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm text-white/80">Status</span>
                    <select
                      className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={createForm.status}
                      onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
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
                    onClick={() => setShowCreate(false)}
                    className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                  >
                    Close
                  </button>
                  <button className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit */}
      {showEdit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-lg font-semibold">Edit item</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={submitEdit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Name</span>
                    <input
                      className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </label>

                  {/* Hostel dropdown (edit) */}
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Hostel</span>
                    <select
                      className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={editForm.hostel_id || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, hostel_id: e.target.value }))}
                      disabled={hostelsLoading}
                    >
                      <option value="">— No hostel —</option>
                      {hostels.map((h) => (
                        <option key={h._id} value={h._id}>
                          {hostelLabel(h)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Quantity</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-white/80">Min level</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={editForm.min_level}
                      onChange={(e) => setEditForm((f) => ({ ...f, min_level: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm text-white/80">Status</span>
                    <select
                      className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
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
                    onClick={() => setShowEdit(false)}
                    className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                  >
                    Close
                  </button>
                  <button className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Adjust */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-lg font-semibold">Adjust quantity</h3>
              <button
                onClick={() => setShowAdjust(false)}
                className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={submitAdjust} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm text-white/80">Delta (e.g. +5 or -3)</span>
                  <input
                    type="number"
                    className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
                    value={adjustForm.delta}
                    onChange={(e) => setAdjustForm((f) => ({ ...f, delta: e.target.value }))}
                    required
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdjust(false)}
                    className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                  >
                    Close
                  </button>
                  <button className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90">
                    Apply
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
