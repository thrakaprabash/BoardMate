import { useEffect, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import api from "../../services/api"

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—")
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? []

function useRoomNames() {
  const [map, setMap] = useState({})
  const ensure = async (id) => {
    if (!id || map[id]) return
    try {
      const { data } = await api.get(`/rooms/${id}`)
      const label = data?.name || data?.type || `Room ${String(id).slice(-4)}`
      setMap((m)=>({ ...m, [id]: label }))
    } catch {
      try {
        const r = await api.get("/rooms", { params: { id, limit: 1 } })
        const x = (getArr(r) || [])[0]
        if (x) setMap((m)=>({ ...m, [id]: x?.name || x?.type || `Room ${String(id).slice(-4)}` }))
      } catch {}
    }
  }
  const label = (id) => map[id] || "—"
  return { ensure, label }
}

async function fetchBookingsForMe() {
  const variants = [
    { me: true, limit: 50, sort: "-start_date" },
    { user: "me", limit: 50, sort: "-start_date" },
    { user_id: "me", limit: 50, sort: "-start_date" },
    { limit: 50, sort: "-start_date" },
  ]
  for (const params of variants) {
    try {
      const res = await api.get("/bookings", { params })
      return getArr(res)
    } catch {}
  }
  return []
}

export default function BookingsList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const { ensure, label } = useRoomNames()

  useEffect(() => {
    ;(async () => {
      const data = await fetchBookingsForMe()
      setRows(Array.isArray(data) ? data : [])
      // prime room names
      Array.from(new Set((data||[]).map(x => x.room_id).filter(Boolean))).forEach((id)=>ensure(id))
      setLoading(false)
    })()
  }, [])

  return (
    <AppLayout>
      <h2 className="text-2xl font-semibold">My Bookings</h2>
      <div className="mt-6">
        <Section title="All bookings" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "room", header: "Room", render: (r) => label(r.room_id) },
              { key: "start_date", header: "Start", render: (r) => fmt(r.start_date || r.startDate || r.start) },
              { key: "end_date", header: "End", render: (r) => fmt(r.end_date || r.endDate || r.end) },
              { key: "status", header: "Status" },
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "No bookings found."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
