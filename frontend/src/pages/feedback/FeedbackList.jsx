import { useEffect, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import api from "../../services/api"

const fdt = (d) => (d ? new Date(d).toLocaleDateString() : "—")
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []

function useRoomNames() {
  const [map, setMap] = useState({})
  const ensure = async (id) => {
    if (!id || map[id]) return
    try {
      const { data } = await api.get(`/rooms/${id}`)
      setMap((m) => ({
        ...m,
        [id]: data?.name || data?.type || `Room ${String(id).slice(-4)}`
      }))
    } catch {
      setMap((m) => ({ ...m, [id]: `Room ${String(id).slice(-4)}` }))
    }
  }
  const label = (id) => map[id] || "—"
  return { ensure, label }
}

async function fetchFeedbackForMe() {
  const variants = [
    { me: true, limit: 50, sort: "-date" },
    { user: "me", limit: 50, sort: "-date" },
    { user_id: "me", limit: 50, sort: "-date" },
    { limit: 50, sort: "-date" }
  ]
  for (const params of variants) {
    try {
      const res = await api.get("/feedback", { params })
      return getArr(res)
    } catch {}
  }
  return []
}

export default function FeedbackList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const { ensure, label } = useRoomNames()

  useEffect(() => {
    ;(async () => {
      const data = await fetchFeedbackForMe()
      setRows(Array.isArray(data) ? data : [])
      Array.from(new Set((data || []).map((x) => x.room_id).filter(Boolean))).forEach(
        (id) => ensure(id)
      )
      setLoading(false)
    })()
  }, [])

  // -------- Export to PDF --------
  const exportPdf = async () => {
    const headers = ["Date", "Rating", "Comments", "Room"]
    const body = (rows || []).map((r) => [
      fdt(r.date || r.createdAt),
      r.rating ?? "—",
      r.comments || r.note || "—",
      (r.room && (r.room.name || r.room.type)) || label(r.room_id)
    ])

    try {
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const marginX = 40

      // Title + meta
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text("My Feedback", marginX, 48)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      const meta = `Generated on ${new Date().toLocaleString()} • ${rows.length} item(s)`
      doc.text(meta, marginX, 66)

      autoTable(doc, {
        head: [headers],
        body,
        startY: 84,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 250, 252] },
        margin: { left: marginX, right: marginX },
        columnStyles: {
          0: { cellWidth: 90 },  // Date
          1: { cellWidth: 60, halign: "center" }, // Rating
          2: { cellWidth: 260 }, // Comments
          3: { cellWidth: 120 }  // Room
        }
      })

      doc.save("feedback.pdf")
    } catch {
      // Fallback: open printable HTML → user can Save as PDF
      const esc = (s) =>
        String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>My Feedback</title>
            <style>
              body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
              h1 { margin: 0 0 8px; font-size: 18px; }
              .muted { color: #555; margin-bottom: 16px; font-size: 12px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; vertical-align: top; }
              th { background: #111827; color: white; }
              tr:nth-child(even) td { background: #f8fafc; }
              @media print { @page { size: A4 portrait; margin: 12mm; } }
            </style>
          </head>
          <body>
            <h1>My Feedback</h1>
            <div class="muted">${esc(
              `Generated on ${new Date().toLocaleString()} • ${rows.length} item(s)`
            )}</div>
            <table>
              <thead>
                <tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>
              </thead>
              <tbody>
                ${body
                  .map(
                    (cells) =>
                      `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`
                  )
                  .join("")}
              </tbody>
            </table>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `
      const w = window.open("", "_blank")
      if (w) {
        w.document.open()
        w.document.write(html)
        w.document.close()
      } else {
        alert("Popup blocked. Please allow popups to export/print.")
      }
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">My Feedback</h2>
        <button
          onClick={exportPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
          title="Export PDF"
        >
          📄 <span className="hidden sm:inline">Export PDF</span>
        </button>
      </div>

      <div className="mt-6">
        <Section title="All feedback" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => fdt(r.date || r.createdAt) },
              { key: "rating", header: "Rating" },
              { key: "comments", header: "Comments" },
              { key: "room", header: "Room", render: (r) => r.room?.name || label(r.room_id) }
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "No feedback found."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
