// src/pages/owner/RevenueReports.jsx
import { useEffect, useMemo, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import StatCard from "../../components/StatCard"
import api from "../../services/api"
import { useAuth } from "../../context/AuthContext"

// ---------- helpers ----------
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []
const ymd = (d) => new Date(d).toISOString().slice(0, 10)
const startOfMonthISO = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10) }
const L = (s) => String(s || "").toLowerCase()
const isPaid = (s) => ["paid", "completed", "success"].includes(L(s))
const isRefund = (s) => L(s) === "refunded" || L(s).includes("refund")
const fmtCurrency = (n) => `LKR ${Number(n || 0).toLocaleString()}`

function groupBy(arr, keyFn, valFn = (x) => x) {
  const m = new Map()
  for (const item of arr) {
    const k = keyFn(item)
    const v = valFn(item)
    m.set(k, (m.get(k) || 0) + v)
  }
  return Array.from(m.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1))
}

// Bars for dark theme
function MiniBars({ data, max }) {
  if (!data?.length) return null
  const peak = max ?? Math.max(...data.map(([, v]) => Math.abs(v)), 1)
  return (
    <div className="mt-2 flex items-end gap-1">
      {data.map(([label, value]) => (
        <div key={label} className="flex flex-col items-center">
          <div
            className={`w-2 rounded ${value >= 0 ? "bg-white/80" : "bg-red-400"}`}
            style={{ height: Math.max(2, Math.round((Math.abs(value) / peak) * 60)) }}
            title={`${label}: ${fmtCurrency(value)}`}
          />
        </div>
      ))}
    </div>
  )
}

// Lightweight label cache for rendering IDs as names (no query params)
function useLabelCache(path, picks) {
  const [map, setMap] = useState({})
  const ensure = async (id) => {
    if (!id || map[id]) return
    try {
      const { data } = await api.get(`${path}/${id}`)
      const label = picks.map((k)=>data?.[k]).find(Boolean) || `${path.replace(/\//g, "").toUpperCase()} ${String(id).slice(-6)}`
      setMap((m)=>({ ...m, [id]: label }))
    } catch {
      setMap((m)=>({ ...m, [id]: `${path.replace(/\//g, "").toUpperCase()} ${String(id).slice(-6)}` }))
    }
  }
  return { label: (id) => map[id] || "—", ensure }
}

export default function RevenueReports() {
  // --- local CSS shim for dark inputs/selects/buttons ---
  const LocalCss = () => (
    <style>{`
      button:empty { display:none; }
      .btn-primary { background:#111827; color:#fff; }
      .btn-primary:hover { background:#0f172a; }
      .btn-ghost  { border:1px solid rgba(255,255,255,.2); background:transparent; color:#fff; }
      .btn-ghost:hover { background:rgba(255,255,255,.08); }
      .input-dark { background:rgba(255,255,255,.10); color:#fff; border:1px solid rgba(255,255,255,.2); }
      .input-dark::placeholder { color:rgba(255,255,255,.7); }
      .table-dark thead { background:rgba(255,255,255,.06); color:#fff; }
      .table-dark td, .table-dark th { border-color: rgba(255,255,255,.08); }
    `}</style>
  )

  const { user } = useAuth()
  const ownerId = user?._id || user?.id

  // filters
  const [from, setFrom] = useState(startOfMonthISO())
  const [to, setTo] = useState(ymd(new Date()))
  const [method, setMethod] = useState("all")   // cash | bank | card | payout | all
  const [status, setStatus] = useState("paid")  // paid | pending | refunded | all

  // data
  const [txnsRaw, setTxnsRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState("")
  const [err, setErr] = useState("")

  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m); setErr(isErr ? m : "")
    setTimeout(() => { setOk(""); setErr("") }, 2200)
  }

  // load all finance (NO params to avoid 400s)
  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get("/finance")
      const arr = getArr(res)
      setTxnsRaw(Array.isArray(arr) ? arr : [])
    } catch {
      toast("Failed to load finance data", true)
      setTxnsRaw([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (ownerId) load() }, [ownerId])
  const applyFilters = (e) => { e?.preventDefault?.() }

  // ---------- label caches for table ----------
  const { label: bookingLabel, ensure: ensureBooking } = useLabelCache("/bookings", ["label","title"]) 
  const { label: userLabel, ensure: ensureUser } = useLabelCache("/users", ["name","fullName","email"]) 

  // Shared date-range + method filter (used by KPIs AND table)
  const baseFiltered = useMemo(() => {
    const f = new Date(from)
    const t = new Date(to)
    const inRange = (dStr) => {
      if (!dStr) return false
      const d = new Date(dStr)
      return d >= new Date(f.getFullYear(), f.getMonth(), f.getDate()) &&
             d <= new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999)
    }
    return (txnsRaw || []).filter((x) => {
      const dateStr = x.date || x.createdAt
      if (!inRange(dateStr)) return false
      if (method !== "all" && L(x.method) !== L(method)) return false
      return true
    })
  }, [txnsRaw, from, to, method])

  // ---------- KPIs & charts include PAID and REFUND rows ----------
  const kpiRows = useMemo(() => {
    return baseFiltered.filter((x) => isPaid(x.status) || isRefund(x.status))
  }, [baseFiltered])

  const signedAmount = (t) => {
    const amt = Number(t.amount) || 0
    if (isRefund(t.status)) return -amt
    if (isPaid(t.status) && L(t.method) === "payout") return -amt
    return amt
  }

  const sums = useMemo(() => {
    const income = kpiRows
      .filter(t => isPaid(t.status) && L(t.method) !== "payout")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)

    const payouts = kpiRows
      .filter(t => isPaid(t.status) && L(t.method) === "payout")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)

    const refunds = kpiRows
      .filter(t => isRefund(t.status))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)

    const net = income - payouts - refunds
    const countPaid = kpiRows.filter(t => isPaid(t.status)).length
    return { income, payouts, refunds, net, countPaid }
  }, [kpiRows])

  const byDay = useMemo(
    () => groupBy(kpiRows, (t) => (t.date || t.createdAt || "").slice(0, 10) || "—", (t) => signedAmount(t)),
    [kpiRows]
  )
  const byMethod = useMemo(
    () => groupBy(kpiRows, (t) => L(t.method || "unknown"), (t) => signedAmount(t)),
    [kpiRows]
  )

  // ---------- TABLE honors Status filter exactly as chosen ----------
  const txns = useMemo(() => {
    if (L(status) === "all") return baseFiltered
    if (L(status) === "paid") return baseFiltered.filter((x) => isPaid(x.status))
    if (L(status) === "refunded") return baseFiltered.filter((x) => isRefund(x.status))
    return baseFiltered.filter((x) => L(x.status) === L(status))
  }, [baseFiltered, status])

  // warm label cache based on filtered rows (table rows)
  useEffect(() => {
    const bids = Array.from(new Set((txns||[]).map(t=>t.booking_id).filter(Boolean)))
    const uids = Array.from(new Set((txns||[]).map(t=>t.user_id).filter(Boolean)))
    bids.forEach(ensureBooking)
    uids.forEach(ensureUser)
  }, [txns])

  const exportCSV = () => {
    const header = ["date", "amount", "method", "status", "booking", "user"]
    const rows = txns.map((t) => [
      (t.date || t.createdAt || "").slice(0, 10),
      t.amount ?? "",
      t.method ?? "",
      t.status ?? "",
      bookingLabel(t.booking_id),
      userLabel(t.user_id),
    ])
    const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `revenue_${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout>
      <LocalCss />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Revenue Reports</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-ghost rounded-lg px-3 py-1.5 text-sm">Export CSV</button>
          <button onClick={load} className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium">Refresh</button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-green-500/20 px-3 py-1 text-sm text-green-300">{ok}</span>}
          {err && <span className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300">{err}</span>}
        </div>
      )}

      {/* Filters (client-side) */}
      <form onSubmit={applyFilters} className="mt-6 grid gap-3 md:grid-cols-5 text-white">
        <div className="grid gap-1">
          <label className="text-sm">From</label>
          <input
            type="date"
            className="input-dark rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={from}
            onChange={(e)=>setFrom(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">To</label>
          <input
            type="date"
            className="input-dark rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={to}
            onChange={(e)=>setTo(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Method</label>
          <select
            className="input-dark rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={method}
            onChange={(e)=>setMethod(e.target.value)}
          >
            <option className="bg-gray-900 text-white" value="all">All</option>
            <option className="bg-gray-900 text-white" value="cash">Cash</option>
            <option className="bg-gray-900 text-white" value="bank">Bank</option>
            <option className="bg-gray-900 text-white" value="card">Card</option>
            <option className="bg-gray-900 text-white" value="payout">Payouts</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Status (table only)</label>
          <select
            className="input-dark rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={status}
            onChange={(e)=>setStatus(e.target.value)}
          >
            <option className="bg-gray-900 text-white" value="paid">Paid</option>
            <option className="bg-gray-900 text-white" value="pending">Pending</option>
            <option className="bg-gray-900 text-white" value="refunded">Refunded</option>
            <option className="bg-gray-900 text-white" value="all">All</option>
          </select>
        </div>
        <div className="grid items-end">
          <button className="rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/30">Apply</button>
        </div>
      </form>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Income (paid)" value={fmtCurrency(sums.income)} />
        <StatCard title="Payouts (paid)" value={fmtCurrency(sums.payouts)} />
        <StatCard title="Refunds" value={fmtCurrency(sums.refunds)} />
        <StatCard title="Net (paid − payouts − refunds)" value={fmtCurrency(sums.net)} />
        <StatCard title="Paid transactions" value={sums.countPaid} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Revenue by day">
          {byDay.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/80">
              {loading ? "Loading…" : "No revenue for the selected range."}
            </div>
          ) : (
            <>
              <MiniBars data={byDay} />
              <div className="mt-4 overflow-auto rounded-2xl border border-white/15 bg-white/5">
                <table className="table-dark w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Amount (net)</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/90">
                    {byDay.map(([d, amt]) => (
                      <tr key={d} className="border-t">
                        <td className="px-3 py-2">{d}</td>
                        <td className={`px-3 py-2 ${amt < 0 ? "text-red-400" : "text-white"}`}>{fmtCurrency(amt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        <Section title="Revenue by method">
          {byMethod.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/80">
              {loading ? "Loading…" : "No paid/refund transactions."}
            </div>
          ) : (
            <div className="grid gap-2">
              {byMethod.map(([m, amt]) => (
                <div key={m} className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white">
                  <div className="text-sm capitalize">{m}</div>
                  <div className={`font-medium ${amt < 0 ? "text-red-400" : "text-white"}`}>{fmtCurrency(amt)}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Transactions">
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => (r.date || r.createdAt ? new Date(r.date || r.createdAt).toLocaleDateString() : "--") },
              { key: "amount", header: "Amount", render: (r) => (r.amount == null ? "--" : fmtCurrency(r.amount)) },
              { key: "method", header: "Method" },
              { key: "status", header: "Status" },
              { key: "booking_id", header: "Booking", render: (r) => bookingLabel(r.booking_id) },
              { key: "user_id", header: "User", render: (r) => userLabel(r.user_id) },
            ]}
            rows={txns}
            emptyText={loading ? "Loading…" : "No transactions found."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
