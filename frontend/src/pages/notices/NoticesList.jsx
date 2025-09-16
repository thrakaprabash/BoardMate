import { useEffect, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import api from "../../services/api"

const fdt = (d) => (d ? new Date(d).toLocaleDateString() : "—")
const excerpt = (t, n=100) => (t?.length > n ? t.slice(0, n) + "…" : t || "—")
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []

async function fetchNotices() {
  const variants = [
    { limit: 50, sort: "-date_posted" },
    { limit: 50, sort: "-createdAt" },
    { limit: 50 },
  ]
  for (const params of variants) {
    try {
      const res = await api.get("/notices", { params })
      return getArr(res)
    } catch {}
  }
  return []
}

export default function NoticesList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const data = await fetchNotices()
      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [])

  return (
    <AppLayout>
      <h2 className="text-2xl font-semibold">Notices</h2>
      <div className="mt-6">
        <Section title="Latest announcements">
          <DataTable
            columns={[
              { key: "title", header: "Title" },
              { key: "description", header: "Summary", render: (r) => excerpt(r.description, 100) },
              { key: "date_posted", header: "Posted", render: (r) => fdt(r.date_posted || r.createdAt) },
              { key: "postedBy", header: "By", render: (r) => r.postedBy?.name || r.postedBy || "—" },
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "No notices found."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
