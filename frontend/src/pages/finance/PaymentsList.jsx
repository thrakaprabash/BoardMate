// PaymentsList.jsx
import { useEffect, useState } from "react"
import AppLayout from "../../layouts/AppLayout"
import Section from "../../components/Section"
import DataTable from "../../components/DataTable"
import api from "../../services/api"
import { useAuth } from "../../context/AuthContext"

const fdt = (d) => (d ? new Date(d).toLocaleDateString() : "--")
const famt = (a) => (a == null ? "--" : `LKR ${Number(a).toLocaleString()}`)
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
        // Owners: keep broad view (owners may see everything / payouts)
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
        // Students: ONLY fetch *their* payments from the backend
        const variants = [
          { me: true, limit: 100, sort: "-date" },
          { user: "me", limit: 100, sort: "-date" },
          { user_id: "me", limit: 100, sort: "-date" },
          // ❌ no unscoped fallback here
        ]
        for (const params of variants) {
          try {
            const res = await api.get("/finance", { params })
            data = getArr(res)
            if (Array.isArray(data)) break
          } catch {}
        }

        // client-side guard (in case API ignored the filter)
        data = (data || []).filter(
          (x) => String(x.user_id || x.user || "").replace(/"/g, "") === String(userId)
        )

        // Students shouldn’t see payouts
        data = data.filter((x) => String(x.method || "").toLowerCase() !== "payout")
      }

      // Prime booking labels
      Array.from(new Set((data || []).map((x) => x.booking_id).filter(Boolean))).forEach(
        ensureBooking
      )

      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [role, userId])

  return (
    <AppLayout>
      <h2 className="text-2xl font-semibold">
        {role === "hostel_owner" ? "Payments & Payouts" : "My Payments"}
      </h2>

      <div className="mt-6">
        <Section title="History" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => fdt(r.date || r.createdAt) },
              { key: "amount", header: "Amount", render: (r) => famt(r.amount) },
              { key: "method", header: "Method" },
              { key: "status", header: "Status" },
              // readable booking label (room name/type when available)
              { key: "booking", header: "Booking", render: (r) => bookingLabel(r.booking_id) },
              // Owners can see the user column; students cannot
              ...(role === "hostel_owner"
                ? [{ key: "user_id", header: "User" }]
                : []),
            ]}
            rows={rows}
            emptyText={loading ? "Loading…" : "No payments found."}
          />
        </Section>
      </div>
    </AppLayout>
  )
}
