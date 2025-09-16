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
    try { const { data } = await api.get(`/rooms/${id}`); setMap(m=>({ ...m, [id]: data?.name || data?.type || `Room ${String(id).slice(-4)}` })) }
    catch { setMap(m=>({ ...m, [id]: `Room ${String(id).slice(-4)}` })) }
  }
  const label = (id) => map[id] || "—"
  return { ensure, label }
}

async function fetchFeedbackForMe() {
  const variants = [
    { me: true, limit: 50, sort: "-date" },
    { user: "me", limit: 50, sort: "-date" },
    { user_id: "me", limit: 50, sort: "-date" },
    { limit: 50, sort: "-date" },
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
      Array.from(new Set((data||[]).map(x => x.room_id).filter(Boolean))).forEach((id)=>ensure(id))
      setLoading(false)
    })()
  }, [])

  return (
    <AppLayout>
      <h2 className="text-2xl font-semibold">My Feedback</h2>
      <div className="mt-6">
        <Section title="All feedback" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => fdt(r.date || r.createdAt) },
              { key: "rating", header: "Rating" },
              { key: "comments", header: "Comments" },
              { key: "room", header: "Room", render: (r) => r.room?.name || label(r.room_id) },
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "No feedback found."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
