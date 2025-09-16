import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import api from "../../services/api";

// ---- helpers
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const toLocalYMD = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = () => toLocalYMD(new Date());
const sameDay = (iso, day) => toLocalYMD(iso) === day;
const inRange = (start, end, day) => {
  const s = toLocalYMD(start);
  const e = toLocalYMD(end);
  if (!s || !e) return false;
  return s <= day && day <= e;
};
const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "--");
const idTail = (v) => String(v || "").slice(-6);

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-300 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function TodaysBookings() {
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [day, setDay] = useState(today());
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [edit, setEdit] = useState({
    id: "",
    room_id: "",
    start_date: today(),
    end_date: today(),
  });

  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m);
    setErr(isErr ? m : "");
    setTimeout(() => {
      setOk("");
      setErr("");
    }, 2200);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, rRes, hRes, uRes] = await Promise.all([
        api.get("/bookings", { params: { page: 1, limit: 50 } }),
        api.get("/rooms", { params: { page: 1, limit: 100 } }),
        api.get("/hostels", { params: { page: 1, limit: 100 } }),
        api.get("/users", { params: { page: 1, limit: 200 } }).catch(() => ({
          data: [],
        })),
      ]);
      const rawB = getArr(bRes).filter(
        (b) => b && b._id && b.room_id && b.start_date && b.end_date
      );
      setBookings(rawB);
      setRooms(getArr(rRes));
      setHostels(getArr(hRes));
      setUsers(getArr(uRes));
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // label maps
  const hostelNameById = useMemo(() => {
    const m = new Map();
    hostels.forEach((h) =>
      m.set(h._id, h.name || h.location || `Hostel • ${idTail(h._id)}`)
    );
    return m;
  }, [hostels]);

  const roomLabelById = useMemo(() => {
    const m = new Map();
    rooms.forEach((r) => {
      const hostelName = hostelNameById.get(r.hostel_id) || "";
      const base = r.type || "Room";
      const num = r.number ? ` #${r.number}` : "";
      const price = r.rent ? ` • LKR ${r.rent}` : "";
      const host = hostelName ? ` • ${hostelName}` : "";
      m.set(r._id, `${base}${num}${price}${host}`);
    });
    return m;
  }, [rooms, hostelNameById]);

  const userLabelById = useMemo(() => {
    const m = new Map();
    users.forEach((u) =>
      m.set(
        u._id,
        u.name || u.fullName || u.username || u.email || `User • ${idTail(u._id)}`
      )
    );
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const checkins = bookings.filter((b) => sameDay(b.start_date, day));
    const inStay = bookings.filter((b) => inRange(b.start_date, b.end_date, day));
    const checkouts = bookings.filter((b) => sameDay(b.end_date, day));
    return { checkins, inStay, checkouts };
  }, [bookings, day]);

  const stats = {
    checkins: filtered.checkins.length,
    inStay: filtered.inStay.length,
    checkouts: filtered.checkouts.length,
  };

  const openEdit = (bk) => {
    const rid =
      typeof bk.room_id === "object" && bk.room_id?._id
        ? bk.room_id._id
        : bk.room_id;
    setEdit({
      id: bk._id,
      room_id: rid || "",
      start_date: toLocalYMD(bk.start_date) || day,
      end_date: toLocalYMD(bk.end_date) || day,
    });
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!edit.room_id) return toast("Please select a room", true);
    if (edit.end_date < edit.start_date)
      return toast("End date cannot be before start date", true);
    try {
      await api.patch(`/bookings/${edit.id}`, {
        room_id: edit.room_id,
        start_date: edit.start_date,
        end_date: edit.end_date,
      });
      setShowEdit(false);
      toast("Booking updated");
      load();
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true);
    }
  };

  const cancelBooking = async (bk) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.patch(`/bookings/${bk._id}/cancel`);
      toast("Booking cancelled");
      load();
    } catch (e) {
      toast(e?.response?.data?.message || "Cancel failed", true);
    }
  };

  const bookingCols = [
    {
      key: "user_id",
      header: "Student",
      render: (r) => {
        const uid =
          typeof r.user_id === "object" && r.user_id?._id
            ? r.user_id._id
            : r.user_id;
        return userLabelById.get(uid) || `User • ${idTail(uid)}`;
      },
    },
    {
      key: "room_id",
      header: "Room",
      render: (r) => {
        const rid =
          typeof r.room_id === "object" && r.room_id?._id
            ? r.room_id._id
            : r.room_id;
        return roomLabelById.get(rid) || `Room • ${idTail(rid)}`;
      },
    },
    { key: "start_date", header: "Start", render: (r) => fmtD(r.start_date) },
    { key: "end_date", header: "End", render: (r) => fmtD(r.end_date) },
    { key: "status", header: "Status" },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openEdit(r)}
            className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
          >
            Edit
          </button>
          <button
            onClick={() => cancelBooking(r)}
            className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
          >
            Cancel
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Today’s Bookings</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <button
            onClick={load}
            className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-teal-400"
          >
            Refresh
          </button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && (
            <span className="rounded bg-green-500/20 px-3 py-1 text-sm text-green-300">
              {ok}
            </span>
          )}
          {err && (
            <span className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300">
              {err}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6">
        <Section title={`Check-ins (${stats.checkins})`}>
          <DataTable
            rows={filtered.checkins}
            columns={bookingCols}
            emptyText={loading ? "Loading…" : "No check-ins today."}
          />
        </Section>

        <Section title={`Staying Today (${stats.inStay})`}>
          <DataTable
            rows={filtered.inStay}
            columns={bookingCols}
            emptyText={loading ? "Loading…" : "No guests staying today."}
          />
        </Section>

        <Section title={`Check-outs (${stats.checkouts})`}>
          <DataTable
            rows={filtered.checkouts}
            columns={bookingCols}
            emptyText={loading ? "Loading…" : "No check-outs today."}
          />
        </Section>
      </div>

      {/* Edit booking modal */}
      <Modal open={showEdit} title="Edit booking" onClose={() => setShowEdit(false)}>
        <form onSubmit={submitEdit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Room</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={edit.room_id}
              onChange={(e) => setEdit((f) => ({ ...f, room_id: e.target.value }))}
              required
            >
              <option value="" disabled>
                Select a room…
              </option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  {roomLabelById.get(r._id)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Start</span>
              <input
                type="date"
                className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
                value={edit.start_date}
                max={edit.end_date || undefined}
                onChange={(e) =>
                  setEdit((f) => ({ ...f, start_date: e.target.value }))
                }
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">End</span>
              <input
                type="date"
                className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
                value={edit.end_date}
                min={edit.start_date || undefined}
                onChange={(e) =>
                  setEdit((f) => ({ ...f, end_date: e.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Close
            </button>
            <button className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-teal-400">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
