// PaymentsList.jsx
import { useEffect, useState, useMemo } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import api from "../../services/api"
import { useAuth } from "../../context/AuthContext"

const fdt = (d) => (d ? new Date(d).toLocaleDateString() : "--")
const unicodeMinus = /\u2212/g // handles “−”
// Detect if a row represents a refund
const isRefundRow = (r = {}) => {
  const s = String(r.status || r.type || r.method || "").toLowerCase()
  return s.includes("refund") || s.includes("chargeback")
}
// Robust numeric parser for amounts
const parseAmount = (raw, row) => {
  if (raw == null) return 0
  // strip currency & separators, normalize minus
  const s = String(raw)
    .replace(/lkr/gi, "")
    .replace(unicodeMinus, "-")
    .replace(/[,\s]/g, "")
  let n = parseFloat(s)
  if (!isFinite(n)) n = 0
  // If row is a refund and number is positive, flip sign
  if (isRefundRow(row) && n > 0) n = -n
  return n
}
// Amount formatter that preserves sign
const famt = (val) => {
  const n = Number(val || 0)
  const sign = n < 0 ? "-" : ""
  return `${sign}LKR ${Math.abs(n).toLocaleString()}`
}
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []

function useBookingLabels() {
  const [map, setMap] = useState({})
  const ensure = async (bookingId) => {
    if (!bookingId || map[bookingId]) return
    let label = `Booking ${String(bookingId).slice(-6)}`
    try {
      const { data: b } = await api.get(`/bookings/${bookingId}`)
      if (b?.room?.name || b?.room?.type) {
        label = b.room.name || b.room.type
      } else if (b?.room_id) {
        try {
          const { data: r } = await api.get(`/rooms/${b.room_id}`)
          label = r?.name || r?.type || label
        } catch {}
      }
    } catch {}
    setMap((m) => ({ ...m, [bookingId]: label }))
  }
  return { ensure, label: (id) => map[id] || "—" }
}

// --- export helpers ---
function toCsv(rows, headers) {
  const esc = (v) => {
    const s = String(v ?? "")
    const needsQuotes = /[",\n]/.test(s)
    const inner = s.replace(/"/g, '""')
    return needsQuotes ? `"${inner}"` : inner
  }
  const head = headers.map((h) => esc(h.header)).join(",")
  const body = rows
    .map((r) => headers.map((h) => esc(h.accessor(r))).join(","))
    .join("\n")
  return head + "\n" + body
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function openPrintHtml(title, tableHtml, note = "") {
  const win = window.open("", "_blank")
  if (!win) return
  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${title}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; padding: 24px; }
        h1 { font-size: 20px; margin: 0 0 12px; }
        .meta { color:#555; font-size: 12px; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f3f4f6; text-align: left; }
        tfoot td { font-weight: 600; }
        .note { margin-top: 12px; color:#666; font-size: 11px; }
        .neg { color: #b91c1c; } /* red for negatives */
        @media print { a { display: none; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generated on ${new Date().toLocaleString()}</div>
      ${tableHtml}
      ${note ? `<div class="note">${note}</div>` : ""}
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `)
  win.document.close()
}

export default function PaymentsList() {
  const { user } = useAuth()
  const role = String(user?.role || "").toLowerCase()
  const userId = user?._id || user?.id

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const { ensure: ensureBooking, label: bookingLabel } = useBookingLabels()

  useEffect(() => {
    ;(async () => {
      let data = []
      if (role === "hostel_owner") {
        const variants = [
          { owner: userId, limit: 200, sort: "-date" },
          { owner_id: userId, limit: 200, sort: "-date" },
          { hostel_owner: userId, limit: 200, sort: "-date" },
        ]
        for (const params of variants) {
          try {
            const res = await api.get("/finance", { params })
            data = getArr(res)
            if (Array.isArray(data)) break
          } catch {}
        }
      } else {
        const variants = [
          { me: true, limit: 100, sort: "-date" },
          { user: "me", limit: 100, sort: "-date" },
          { user_id: "me", limit: 100, sort: "-date" },
        ]
        for (const params of variants) {
          try {
            const res = await api.get("/finance", { params })
            data = getArr(res)
            if (Array.isArray(data)) break
          } catch {}
        }
        data = (data || []).filter(
          (x) => String(x.user_id || x.user || "").replace(/"/g, "") === String(userId)
        )
        data = data.filter((x) => String(x.method || "").toLowerCase() !== "payout")
      }

      Array.from(new Set((data || []).map((x) => x.booking_id).filter(Boolean))).forEach(
        ensureBooking
      )

      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [role, userId])

  // Export schemas
  const exportSchemaCsv = useMemo(() => {
    const base = [
      { header: "Date", accessor: (r) => fdt(r.date || r.createdAt) },
      // CSV uses raw numeric with sign for Amount
      { header: "Amount", accessor: (r) => parseAmount(r.amount, r) },
      { header: "Method", accessor: (r) => r.method ?? "" },
      { header: "Status", accessor: (r) => r.status ?? "" },
      { header: "Booking", accessor: (r) => bookingLabel(r.booking_id) },
    ]
    if (role === "hostel_owner") {
      base.push({ header: "User", accessor: (r) => r.user_id ?? r.user ?? "" })
    }
    return base
  }, [role, bookingLabel])

  const exportSchemaPdf = useMemo(() => {
    const base = [
      { header: "Date", accessor: (r) => fdt(r.date || r.createdAt) },
      // PDF shows formatted with LKR and sign
      { header: "Amount", accessor: (r) => famt(parseAmount(r.amount, r)) },
      { header: "Method", accessor: (r) => r.method ?? "" },
      { header: "Status", accessor: (r) => r.status ?? "" },
      { header: "Booking", accessor: (r) => bookingLabel(r.booking_id) },
    ]
    if (role === "hostel_owner") {
      base.push({ header: "User", accessor: (r) => r.user_id ?? r.user ?? "" })
    }
    return base
  }, [role, bookingLabel])

  const handleExportCsv = () => {
    const csv = toCsv(rows, exportSchemaCsv)
    const filename = role === "hostel_owner" ? "payments_and_payouts.csv" : "my_payments.csv"
    downloadBlob(csv, filename, "text/csv;charset=utf-8")
  }

  const handleExportPdf = () => {
    const headers = exportSchemaPdf
    const thead = `<tr>${headers.map((h) => `<th>${h.header}</th>`).join("")}</tr>`
    const tbody = rows
      .map((r) => {
        return `<tr>${headers
          .map((h) => {
            const val = String(h.accessor(r) ?? "")
            const isAmt = h.header === "Amount"
            const isNeg = parseAmount(r.amount, r) < 0
            return `<td${isAmt && isNeg ? ' class="neg"' : ""}>${val}</td>`
          })
          .join("")}</tr>`
      })
      .join("")
    const total = rows.reduce((s, r) => s + parseAmount(r.amount, r), 0)
    const tfoot = `<tr>${[
      `<td colspan="1"><strong>Total</strong></td>`,
      `<td${total < 0 ? ' class="neg"' : ""}><strong>${famt(total)}</strong></td>`,
      ...Array(Math.max(0, exportSchemaPdf.length - 2)).fill("<td></td>"),
    ].join("")}</tr>`

    const tableHtml = `<table><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>`
    const title = role === "hostel_owner" ? "Payments & Payouts" : "My Payments"
    openPrintHtml(title, tableHtml, "Tip: In the print dialog, choose “Save as PDF”.")
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {role === "hostel_owner" ? "Payments & Payouts" : "My Payments"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Download as CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M8 21h8M12 17V3m0 14-4-4m4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center rounded-md bg-black text-white px-3 py-1.5 text-sm hover:opacity-90 dark:bg-white dark:text-black"
            title="Open printable view (Save as PDF)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="4" width="18" height="14" rx="2" strokeWidth="1.5"/>
              <path d="M7 8h10M7 12h6" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            PDF
          </button>
        </div>
      </div>

      <div className="mt-6">
        <Section title="History" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => fdt(r.date || r.createdAt) },
              {
                key: "amount",
                header: "Amount",
                render: (r) => famt(parseAmount(r.amount, r)), // ← shows negatives correctly
              },
              { key: "method", header: "Method" },
              { key: "status", header: "Status" },
              { key: "booking", header: "Booking", render: (r) => bookingLabel(r.booking_id) },
              ...(role === "hostel_owner" ? [{ key: "user_id", header: "User" }] : []),
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "No payments found."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
