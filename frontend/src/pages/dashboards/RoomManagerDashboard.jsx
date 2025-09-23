// src/pages/manager/RoomManagerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

// helpers
const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "--");
const todayYMD = () => {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];

// tiny label helpers
const idTail = (v) => String(v || "").slice(-6);

// THEME control styles (visual only)
const ctrl =
  "w-full rounded-lg bg-slate-800/60 border border-white/10 px-3 py-2 text-white placeholder-white/40 shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400/40";
const btnPrimary =
  "rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium px-4 py-2 shadow";
const btnGhost =
  "rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 px-4 py-2";

export default function RoomManagerDashboard() {
  // data
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [users, setUsers] = useState([]);

  // ui
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m);
    setErr(isErr ? m : "");
    setTimeout(() => {
      setOk("");
      setErr("");
    }, 2200);
  };

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  // forms
  const [createRoom, setCreateRoom] = useState({
    hostel_id: "",
    type: "",
    capacity: 1,
    rent: 0,
    availability_status: true,
  });
  const [editRoom, setEditRoom] = useState({
    id: "",
    hostel_id: "",
    type: "",
    capacity: 1,
    rent: 0,
    availability_status: true,
  });
  const [editBooking, setEditBooking] = useState({
    id: "",
    room_id: "",
    start_date: todayYMD(),
    end_date: todayYMD(),
  });
  const [ticketForm, setTicketForm] = useState({
    room: "",
    issueDetails: "",
    priority: "low",
  });

  // load data
  useEffect(() => {
    (async () => {
      try {
        const [r, b, h, u] = await Promise.all([
          api.get("/rooms", { params: { page: 1, limit: 100 } }),
          api.get("/bookings", { params: { page: 1, limit: 50 } }),
          api.get("/hostels", { params: { page: 1, limit: 100 } }),
          api.get("/users", { params: { page: 1, limit: 200 } }).catch(() => ({ data: [] })),
        ]);
        setRooms(getArr(r));
        setBookings(getArr(b));
        const hostelsArr = getArr(h);
        setHostels(hostelsArr);
        setUsers(getArr(u));
        setCreateRoom((f) => ({ ...f, hostel_id: hostelsArr[0]?._id || "" }));
      } catch (e) {
        toast(e?.response?.data?.message || "Failed to load data", true);
      }
    })();
  }, []);

  const refreshRooms = async () => {
    try {
      const r = await api.get("/rooms", { params: { page: 1, limit: 100 } });
      setRooms(getArr(r));
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to refresh rooms", true);
    }
  };
  const refreshBookings = async () => {
    try {
      const b = await api.get("/bookings", { params: { page: 1, limit: 50 } });
      setBookings(getArr(b));
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to refresh bookings", true);
    }
  };

  // label maps
  const hostelNameById = useMemo(() => {
    const m = new Map();
    hostels.forEach((h) => m.set(h._id, h.name || h.location || `Hostel • ${idTail(h._id)}`));
    return m;
  }, [hostels]);

  const userLabelById = useMemo(() => {
    const m = new Map();
    users.forEach((u) =>
      m.set(u._id, u.name || u.fullName || u.username || u.email || `User • ${idTail(u._id)}`)
    );
    return m;
  }, [users]);

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

  // stats (FIXED: "available" uses availability_status AND not currently occupied)
  const stats = useMemo(() => {
    const today = todayYMD();

    // rooms with active bookings (confirmed/checked_in) that overlap today
    const occupiedRoomIds = new Set(
      bookings
        .filter((b) => ["confirmed", "checked_in"].includes(b.status))
        .filter((b) => {
          const start = new Date(b.start_date).toISOString().slice(0, 10);
          const end = new Date(b.end_date).toISOString().slice(0, 10);
          return start <= today && today <= end;
        })
        .map((b) => (typeof b.room_id === "object" && b.room_id?._id ? b.room_id._id : b.room_id))
    );

    const occupied = occupiedRoomIds.size;
    const available = rooms.filter(
      (r) => !!r.availability_status && !occupiedRoomIds.has(r._id)
    ).length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const checkinsToday = bookings.filter((b) => {
      const checkinDate = new Date(b.start_date).toISOString().slice(0, 10);
      return b.status === "checked_in" && checkinDate === today;
    }).length;

    return { available, occupied, pending, checkinsToday };
  }, [rooms, bookings]);

  // ---- room actions
  const onToggleAvailability = async (room) => {
    const next = !room.availability_status;

    // optimistic UI so the stat card updates instantly
    setRooms((prev) =>
      prev.map((r) => (r._id === room._id ? { ...r, availability_status: next } : r))
    );

    try {
      await api.patch(`/rooms/${room._id}/availability`, { availability_status: next });
      toast("Availability updated");
      // optional: ensure consistency with backend
      await refreshRooms();
    } catch (e) {
      // revert on error
      setRooms((prev) =>
        prev.map((r) => (r._id === room._id ? { ...r, availability_status: !next } : r))
      );
      toast(e?.response?.data?.message || "Failed to update room", true);
    }
  };

  const onDeleteRoom = async (room) => {
    if (!confirm(`Delete room "${room.type}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/rooms/${room._id}`);
      toast("Room deleted");
      await refreshRooms();
    } catch (e) {
      toast(e?.response?.data?.message || "Delete failed", true);
    }
  };

  const openEditRoom = (room) => {
    setEditRoom({
      id: room._id,
      hostel_id: room.hostel_id || "",
      type: room.type || "",
      capacity: room.capacity ?? 1,
      rent: room.rent ?? 0,
      availability_status: !!room.availability_status,
    });
    setShowEditRoom(true);
  };

  const submitEditRoom = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        hostel_id: editRoom.hostel_id || undefined,
        type: editRoom.type,
        capacity: Number(editRoom.capacity),
        rent: Number(editRoom.rent),
        availability_status: !!editRoom.availability_status,
      };
      await api.patch(`/rooms/${editRoom.id}`, payload);
      setShowEditRoom(false);
      toast("Room updated");
      await refreshRooms();
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true);
    }
  };

  const submitCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        hostel_id: createRoom.hostel_id,
        type: createRoom.type,
        capacity: Number(createRoom.capacity),
        rent: Number(createRoom.rent),
        availability_status: !!createRoom.availability_status,
      };
      await api.post("/rooms", payload);
      setShowCreate(false);
      toast("Room created");
      await refreshRooms();
    } catch (e) {
      toast(e?.response?.data?.message || "Create failed", true);
    }
  };

  // ---- maintenance ticket
  const openTicket = (room) => {
    setTicketForm({ room: room._id, issueDetails: "", priority: "low" });
    setShowTicket(true);
  };
  const submitTicket = async (e) => {
    e.preventDefault();
    const room = rooms.find((r) => r._id === ticketForm.room);
    if (!room) return toast("Select a room", true);
    try {
      await api.post("/maintenance", {
        hostel: room.hostel_id,
        room: room._id,
        issueDetails: ticketForm.issueDetails,
        priority: ticketForm.priority,
      });
      setShowTicket(false);
      toast("Ticket created");
    } catch (e) {
      toast(e?.response?.data?.message || "Ticket failed", true);
    }
  };

  // ---- booking actions
  const openEditBooking = (bk) => {
    setEditBooking({
      id: bk._id,
      room_id: typeof bk.room_id === "object" && bk.room_id?._id ? bk.room_id._id : bk.room_id,
      start_date: bk.start_date ? new Date(bk.start_date).toISOString().slice(0, 10) : todayYMD(),
      end_date: bk.end_date ? new Date(bk.end_date).toISOString().slice(0, 10) : todayYMD(),
    });
    setShowEditBooking(true);
  };
  const submitEditBooking = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/bookings/${editBooking.id}`, {
        room_id: editBooking.room_id,
        start_date: editBooking.start_date,
        end_date: editBooking.end_date,
      });
      setShowEditBooking(false);
      toast("Booking updated");
      await refreshBookings();
    } catch (e) {
      toast(e?.response?.data?.message || "Update failed", true);
    }
  };
  const cancelBooking = async (bk) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.patch(`/bookings/${bk._id}/cancel`);
      toast("Booking cancelled");
      await refreshBookings();
    } catch (e) {
      toast(e?.response?.data?.message || "Cancel failed", true);
    }
  };

  // ------------- UI -------------
  return (
    <AppLayout>
      <h2 className="text-2xl font-semibold text-white/90">Room Manager</h2>
      {(ok || err) && (
        <div className="mt-3">
          {ok && (
            <span className="rounded bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300 border border-emerald-400/20">
              {ok}
            </span>
          )}
          {err && (
            <span className="ml-2 rounded bg-rose-400/15 px-3 py-1 text-sm text-rose-300 border border-rose-400/20">
              {err}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Available rooms" value={stats.available} />
        <StatCard title="Occupied rooms" value={stats.occupied} />
        <StatCard title="Pending bookings" value={stats.pending} />
        <StatCard title="Check-ins today" value={stats.checkinsToday} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Rooms */}
        <Section
          title="Rooms"
          actions={
            <button onClick={() => setShowCreate(true)} className={btnPrimary}>
              Add room
            </button>
          }
        >
          <DataTable
            columns={[
              { key: "type", header: "Type" },
              { key: "capacity", header: "Cap" },
              { key: "rent", header: "Rent", render: (r) => `LKR ${r.rent}` },
              {
                key: "hostel_id",
                header: "Hostel",
                render: (r) => hostelNameById.get(r.hostel_id) || `— ${idTail(r.hostel_id)}`,
              },
              {
                key: "availability_status",
                header: "Available",
                render: (r) => (
                  <input
                    type="checkbox"
                    checked={!!r.availability_status}
                    onChange={() => onToggleAvailability(r)}
                  />
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditRoom(r)}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openTicket(r)}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
                    >
                      Raise ticket
                    </button>
                    <button
                      onClick={() => onDeleteRoom(r)}
                      className="rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-400/15"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            rows={rooms}
            emptyText="No rooms."
          />
        </Section>

        {/* Bookings */}
        <Section title="Recent bookings">
          <DataTable
            columns={[
              {
                key: "user_id",
                header: "Student",
                render: (r) => {
                  const uid =
                    typeof r.user_id === "object" && r.user_id?._id ? r.user_id._id : r.user_id;
                  return userLabelById.get(uid) || `User • ${idTail(uid)}`;
                },
              },
              {
                key: "room_id",
                header: "Room",
                render: (r) => {
                  const rid =
                    typeof r.room_id === "object" && r.room_id?._id ? r.room_id._id : r.room_id;
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditBooking(r)}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => cancelBooking(r)}
                      className="rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-400/15"
                    >
                      Cancel
                    </button>
                  </div>
                ),
              },
            ]}
            rows={bookings}
            emptyText="No bookings."
          />
        </Section>
      </div>

      {/* ----- Create room ----- */}
      <Modal open={showCreate} title="Add room" onClose={() => setShowCreate(false)}>
        <form onSubmit={submitCreateRoom} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/80">Hostel</span>
            <select
              className={ctrl}
              value={createRoom.hostel_id}
              onChange={(e) => setCreateRoom((f) => ({ ...f, hostel_id: e.target.value }))}
              required
            >
              <option value="" disabled>
                Select a hostel…
              </option>
              {hostels.map((h) => (
                <option key={h._id} value={h._id}>
                  {hostelNameById.get(h._id)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Type</span>
              <input
                className={ctrl}
                value={createRoom.type}
                onChange={(e) => setCreateRoom((f) => ({ ...f, type: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Capacity</span>
              <input
                type="number"
                min="1"
                className={ctrl}
                value={createRoom.capacity}
                onChange={(e) => setCreateRoom((f) => ({ ...f, capacity: e.target.value }))}
                required
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-white/80">Rent (LKR)</span>
              <input
                type="number"
                min="0"
                className={ctrl}
                value={createRoom.rent}
                onChange={(e) => setCreateRoom((f) => ({ ...f, rent: e.target.value }))}
                required
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-white/80">
            <input
              type="checkbox"
              checked={createRoom.availability_status}
              onChange={(e) => setCreateRoom((f) => ({ ...f, availability_status: e.target.checked }))}
            />
            <span className="text-sm">Available</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className={btnGhost}>
              Close
            </button>
            <button className={btnPrimary}>Save</button>
          </div>
        </form>
      </Modal>

      {/* ----- Edit room ----- */}
      <Modal open={showEditRoom} title="Edit room" onClose={() => setShowEditRoom(false)}>
        <form onSubmit={submitEditRoom} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Type</span>
              <input
                className={ctrl}
                value={editRoom.type}
                onChange={(e) => setEditRoom((f) => ({ ...f, type: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Capacity</span>
              <input
                type="number"
                min="1"
                className={ctrl}
                value={editRoom.capacity}
                onChange={(e) => setEditRoom((f) => ({ ...f, capacity: e.target.value }))}
                required
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-white/80">Rent (LKR)</span>
              <input
                type="number"
                min="0"
                className={ctrl}
                value={editRoom.rent}
                onChange={(e) => setEditRoom((f) => ({ ...f, rent: e.target.value }))}
                required
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-white/80">
            <input
              type="checkbox"
              checked={editRoom.availability_status}
              onChange={(e) => setEditRoom((f) => ({ ...f, availability_status: e.target.checked }))}
            />
          <span className="text-sm">Available</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowEditRoom(false)} className={btnGhost}>
              Close
            </button>
            <button className={btnPrimary}>Save changes</button>
          </div>
        </form>
      </Modal>

      {/* ----- Edit booking ----- */}
      <Modal open={showEditBooking} title="Edit booking" onClose={() => setShowEditBooking(false)}>
        <form onSubmit={submitEditBooking} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Room</span>
              <select
                className={ctrl}
                value={editBooking.room_id}
                onChange={(e) => setEditBooking((f) => ({ ...f, room_id: e.target.value }))}
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
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Start date</span>
              <input
                type="date"
                className={ctrl}
                value={editBooking.start_date}
                onChange={(e) => setEditBooking((f) => ({ ...f, start_date: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">End date</span>
              <input
                type="date"
                className={ctrl}
                value={editBooking.end_date}
                onChange={(e) => setEditBooking((f) => ({ ...f, end_date: e.target.value }))}
                required
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowEditBooking(false)} className={btnGhost}>
              Close
            </button>
            <button className={btnPrimary}>Save</button>
          </div>
        </form>
      </Modal>

      {/* ----- Raise ticket ----- */}
      <Modal open={showTicket} title="Raise maintenance ticket" onClose={() => setShowTicket(false)}>
        <form onSubmit={submitTicket} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/80">Room</span>
            <select
              className={ctrl}
              value={ticketForm.room}
              onChange={(e) => setTicketForm((f) => ({ ...f, room: e.target.value }))}
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
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/80">Issue details</span>
            <textarea
              className={ctrl}
              value={ticketForm.issueDetails}
              onChange={(e) => setTicketForm((f) => ({ ...f, issueDetails: e.target.value }))}
              rows={4}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/80">Priority</span>
            <select
              className={ctrl}
              value={ticketForm.priority}
              onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowTicket(false)} className={btnGhost}>
              Close
            </button>
            <button className={btnPrimary}>Create ticket</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}

// Dark glass modal that matches the app theme
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-base font-semibold text-white/90">{title}</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-white/60 hover:bg-white/5"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
