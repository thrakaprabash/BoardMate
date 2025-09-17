// InventoryReports.jsx
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
  if (v === "inactive") return "bg-gray-100/20 text-gray-300"
  return "bg-gray-100/20 text-gray-300"
}

const MiniBars = ({ data }) => {
  if (!data?.length) return null
  const max = Math.max(...data.map(([, v]) => v), 1)
  return (
    <div className="mt-2 flex items-end gap-1">
      {data.map(([label, value]) => (
        <div key={label} className="flex flex-col items-center">
          <div
            className="w-2 rounded bg-white/70"
            style={{ height: Math.max(2, Math.round((value / max) * 60)) }}
            title={`${label}: ${value}`}
          />
        </div>
      ))}
    </div>
  )
}

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

async function fetchHostels(apiInstance) {
  const res = await apiInstance.get("/hostels", { params: { page: 1, limit: 100 } })
  return getArr(res)
}

const hostelLabel = (h) => (h?.name ? `${h.name}${h.code ? ` (${h.code})` : ""}` : h?._id ?? "Hostel")

export default function InventoryReports() {
  const [items, setItems] = useState([])
  const [hostels, setHostels] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const all = await fetchAllInventory(api, {})
      setItems(all)
      const hostelList = await fetchHostels(api)
      setHostels(hostelList)
    } catch (e) {
      console.error("Inventory reports load error:", e?.response?.data || e?.message || e)
      setErr(e?.response?.data?.message || "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const kpi = useMemo(() => {
    const total = items.length
    const qtyTotal = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
    const minSum = items.reduce((s, i) => s + (Number(i.min_level) || 0), 0)
    const low = items.filter((i) => Number(i.quantity) <= Number(i.min_level)).length
    const out = items.filter((i) => Number(i.quantity) === 0).length
    return { total, qtyTotal, minSum, low, out }
  }, [items])

  const byStatus = useMemo(() => {
    const m = new Map()
    for (const i of items) {
      const k = String(i.status || "unknown").toLowerCase()
      m.set(k, (m.get(k) || 0) + 1)
    }
    return Array.from(m.entries()).sort()
  }, [items])

  const byHostel = useMemo(() => {
    const m = new Map()
    for (const i of items) {
      const hostel = i.hostel_id ? hostels.find(h => h._id === i.hostel_id) : null
      const k = hostel ? hostelLabel(hostel) : "—"
      m.set(k, (m.get(k) || 0) + (Number(i.quantity) || 0))
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [items, hostels])

  const worst = useMemo(() => {
    const scored = items
      .map((i) => {
        const q = Number(i.quantity) || 0,
          min = Number(i.min_level) || 0
        const ratio = q / (min + 1)
        return { ...i, ratio }
      })
      .sort((a, b) => a.ratio - b.ratio)
    return scored.slice(0, 10)
  }, [items])

  const exportSummary = () => {
    const rows = [
      ["total_items", kpi.total],
      ["total_quantity", kpi.qtyTotal],
      ["sum_min_levels", kpi.minSum],
      ["low_count", kpi.low],
      ["out_count", kpi.out],
    ]
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "inventory_summary.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Inventory Reports</h2>
        <div className="flex gap-2">
          <button
            onClick={exportSummary}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Export summary
          </button>
          <button
            onClick={load}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-3 rounded border border-rose-300/30 bg-rose-100/10 px-3 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total items" value={kpi.total} />
        <StatCard title="Total quantity" value={kpi.qtyTotal} />
        <StatCard title="Low items" value={kpi.low} />
        <StatCard title="Out of stock" value={kpi.out} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Items by status">
          <MiniBars data={byStatus} />
          <div className="mt-4 overflow-auto rounded border border-white/15">
            <table className="w-full text-left text-sm text-white">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Items</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.map(([s, c]) => (
                  <tr key={s} className="border-t border-white/10">
                    <td className="px-3 py-2">{badge(s, tone(s))}</td>
                    <td className="px-3 py-2">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Quantity by hostel">
          <MiniBars data={byHostel} />
          <div className="mt-4 overflow-auto rounded border border-white/15">
            <table className="w-full text-left text-sm text-white">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-3 py-2 font-medium">Hostel</th>
                  <th className="px-3 py-2 font-medium">Total qty</th>
                </tr>
              </thead>
              <tbody>
                {byHostel.map(([h, sum]) => (
                  <tr key={h} className="border-t border-white/10">
                    <td className="px-3 py-2">{h}</td>
                    <td className="px-3 py-2">{sum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Most critical (lowest stock ratio)">
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
                render: (r) => {
                  const hostel = hostels.find(h => h._id === r.hostel_id)
                  return hostel ? hostelLabel(hostel) : "—"
                },
              },
            ]}
            rows={worst}
            emptyText={loading ? "Loading…" : "No data."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
