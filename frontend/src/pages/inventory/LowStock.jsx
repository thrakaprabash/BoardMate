// LowStock.jsx
import { useEffect, useMemo, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import StatCard from "../../components/StatCard"
import api from "../../services/api"

const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []
const badge = (t, cls) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${cls}`}>{t}</span>
)
const tone = (s = "") => {
  const v = String(s).toLowerCase()
  if (v === "out") return "bg-rose-100/20 text-rose-300"
  if (v === "low") return "bg-amber-100/20 text-amber-300"
  if (v === "active") return "bg-emerald-100/20 text-emerald-300"
  if (v === "inactive") return "bg-gray-100/20 text-gray-400"
  return "bg-gray-100/20 text-gray-300"
}

// fetch all low stock
async function fetchAllLowStock(apiInstance, baseParams = {}) {
  const pageSize = 100
  let page = 1
  const all = []
  for (let i = 0; i < 200; i++) {
    const res = await apiInstance.get("/inventory/low-stock", {
      params: { ...baseParams, page, limit: pageSize },
    })
    const items = getArr(res)
    all.push(...items)
    if (!items.length || items.length < pageSize) break
    page++
  }
  return all
}

export default function LowStock() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState("")
  const [err, setErr] = useState("")
  const toast = (m, b = false) => {
    setOk(b ? "" : m)
    setErr(b ? m : "")
    setTimeout(() => {
      setOk("")
      setErr("")
    }, 2000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const all = await fetchAllLowStock(api, {})
      setRows(all)
    } catch (e) {
      console.error("LowStock load error:", e?.response?.data || e?.message || e)
      toast(e?.response?.data?.message || "Failed to load low stock", true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const adjust = async (it, delta) => {
    try {
      const d = parseInt(delta, 10)
      if (!Number.isFinite(d)) throw new Error("Invalid delta")
      const current = Number(it.quantity) || 0
      const nextQty = Math.max(0, current + d)
      await api.patch(`/inventory/${it._id}`, { quantity: nextQty })
      toast(d > 0 ? `+${d}` : `${d}`)
      load()
    } catch (e) {
      console.error("Adjust error:", e?.response?.data || e?.message || e)
      toast(e?.response?.data?.message || "Adjust failed", true)
    }
  }

  const exportCSV = () => {
    const headers = ["name", "quantity", "min_level", "status", "hostel_id"]
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const body = rows
      .map((i) =>
        [i.name, i.quantity, i.min_level, i.status, i.hostel_id].map(esc).join(",")
      )
      .join("\n")
    const csv = headers.join(",") + "\n" + body
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "low_stock.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = useMemo(() => {
    const out = rows.filter((i) => Number(i.quantity) === 0).length
    const critical = rows.filter((i) => Number(i.quantity) <= Number(i.min_level)).length
    return { total: rows.length, out, critical }
  }, [rows])

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Low Stock</h2>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Export CSV
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
          {ok && (
            <span className="rounded bg-emerald-100/20 px-3 py-1 text-sm text-emerald-300">
              {ok}
            </span>
          )}
          {err && (
            <span className="rounded bg-rose-100/20 px-3 py-1 text-sm text-rose-300">
              {err}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Low / critical" value={stats.critical} />
        <StatCard title="Out of stock" value={stats.out} />
        <StatCard title="Total flagged" value={stats.total} />
      </div>

      <div className="mt-6">
        <Section title="Needs attention">
          <DataTable
            columns={[
              { key: "name", header: "Item" },
              { key: "quantity", header: "Qty" },
              { key: "min_level", header: "Min" },
              {
                key: "status",
                header: "Status",
                render: (r) => badge(String(r.status || "—"), tone(r.status)),
              },
              {
                key: "hostel_id",
                header: "Hostel",
                render: (r) => (r.hostel_id ? String(r.hostel_id).slice(-6) : "—"),
              },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <div className="flex gap-2">
                    <button
                      onClick={() => adjust(r, +1)}
                      className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => adjust(r, +5)}
                      className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                    >
                      +5
                    </button>
                  </div>
                ),
              },
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "Nothing is low 🎉"}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
