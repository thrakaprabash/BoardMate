import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import api from "../../services/api";

// helpers
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const fdt = (d) => (d ? new Date(d).toLocaleString() : "--");
const idTail = (v) => String(v || "").slice(-6);
const badge = (text, cls) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${cls}`}>
    {text}
  </span>
);
const toneForStatus = (s = "") => {
  const v = String(s || "").toLowerCase();
  if (v === "open") return "bg-yellow-100 text-yellow-700";
  if (v === "in_progress") return "bg-blue-100 text-blue-700";
  if (v === "resolved") return "bg-emerald-100 text-emerald-700";
  if (v === "closed") return "bg-gray-100 text-gray-700";
  if (v === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-white/10 text-white";
};
const uLabel = (u) =>
  [u?.name, u?.email].filter(Boolean).join(" ") +
  (u?._id ? ` • ${u._id.slice(-6)}` : "");
const roomPretty = (r) =>
  !r ? "—" : `${r.type || "Room"}${r.number ? ` #${r.number}` : ""} • ${idTail(r._id)}`;

function GlassModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-slate-900 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button
            variant="secondary"
            className="px-2 py-1 text-xs"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);

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

  // create form
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    hostel: "",
    room: "",
    issueDetails: "",
    priority: "medium",
    assignedTo: "",
  });

  const hostelName = useMemo(() => {
    const m = new Map();
    hostels.forEach((h) =>
      m.set(h._id, h.name || h.location || h._id?.slice(-6))
    );
    return m;
  }, [hostels]);
  const roomById = useMemo(() => {
    const m = new Map();
    rooms.forEach((r) => m.set(r._id, r));
    return m;
  }, [rooms]);

  const loadUsers = async () => {
    try {
      const tries = [
        () =>
          api.get("/users", {
            params: { page: 1, limit: 200, role: "technician" },
          }),
        () => api.get("/users", { params: { page: 1, limit: 200 } }),
        () => api.get("/staff", { params: { page: 1, limit: 200 } }),
        () => api.get("/technicians", { params: { page: 1, limit: 200 } }),
      ];
      for (const fn of tries) {
        try {
          const r = await fn();
          const arr = getArr(r);
          if (Array.isArray(arr) && arr.length) {
            setUsers(arr);
            break;
          }
        } catch {}
      }
    } catch {}
  };

  const load = async () => {
    try {
      const [t, h, r] = await Promise.all([
        api.get("/maintenance", { params: { page: 1, limit: 100 } }),
        api.get("/hostels", { params: { page: 1, limit: 100 } }),
        api.get("/rooms", { params: { page: 1, limit: 100 } }),
      ]);
      setTickets(getArr(t));
      setHostels(getArr(h));
      setRooms(getArr(r));
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load data", true);
    }
  };

  useEffect(() => {
    load();
    loadUsers();
  }, []);

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        hostel: form.hostel || undefined,
        room: form.room || undefined,
        issueDetails: form.issueDetails,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
      };
      const res = await api.post("/maintenance", payload);
      const created = res?.data?.data ?? res?.data;
      setTickets((prev) => [created, ...prev]);
      setForm({
        hostel: "",
        room: "",
        issueDetails: "",
        priority: "medium",
        assignedTo: "",
      });
      setOpenCreate(false);
      toast("Ticket created");
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to create ticket", true);
    }
  };

  const deleteTicket = async (row) => {
    const yes = window.confirm("Delete this ticket? This cannot be undone.");
    if (!yes) return;
    const prev = tickets;
    setTickets(prev.filter((t) => t._id !== row._id));
    try {
      await api.delete(`/maintenance/${row._id}`);
      toast("Ticket deleted");
    } catch (e) {
      setTickets(prev);
      toast(e?.response?.data?.message || "Failed to delete ticket", true);
    }
  };

  const columns = [
    {
      key: "issue",
      header: "Issue",
      render: (x) => (
        <div className="max-w-[22rem] truncate" title={x.issueDetails}>
          {x.issueDetails || "—"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (x) =>
        badge(
          String(x.status || "—").replaceAll("_", " "),
          toneForStatus(x.status)
        ),
    },
    {
      key: "hostel",
      header: "Hostel",
      render: (x) =>
        hostelName.get(x.hostel?._id || x.hostel) || "—",
    },
    {
      key: "room",
      header: "Room",
      render: (x) => {
        if (x.room && typeof x.room === "object" && x.room._id)
          return roomPretty(x.room);
        if (typeof x.room === "string" && x.room) {
          const r = roomById.get(x.room);
          return r ? roomPretty(r) : `Room • ${idTail(x.room)}`;
        }
        return "—";
      },
    },
    {
      key: "assignee",
      header: "Assignee",
      render: (x) =>
        x.assignedTo?.name ||
        x.assignedTo?.email ||
        x.assignedTo?._id?.slice(-6) ||
        (typeof x.assignedTo === "string"
          ? x.assignedTo.slice(-6)
          : "—"),
    },
    { key: "created", header: "Created", render: (x) => fdt(x.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (x) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            className="px-2 py-1 text-xs"
            onClick={() => deleteTicket(x)}
            title="Delete ticket"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
  <h2 className="text-2xl font-semibold text-white">Tickets</h2>
  <div className="flex gap-2">
    <Button onClick={() => setOpenCreate(true)}>Create ticket</Button>
    <Button variant="secondary" onClick={load}>Refresh</Button>
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

      <Section title="All tickets">
        <DataTable columns={columns} rows={tickets} emptyText={"No tickets."} />
      </Section>

      <GlassModal
        open={openCreate}
        title="Create maintenance ticket"
        onClose={() => setOpenCreate(false)}
      >
        <form onSubmit={createTicket} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm">Hostel</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.hostel}
              onChange={(e) =>
                setForm((f) => ({ ...f, hostel: e.target.value }))
              }
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h._id} value={h._id}>
                  {hostelName.get(h._id)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">Room</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.room}
              onChange={(e) =>
                setForm((f) => ({ ...f, room: e.target.value }))
              }
            >
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  {roomPretty(r)}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2 block">
            <span className="mb-1 block text-sm">Issue details</span>
            <textarea
              rows="3"
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.issueDetails}
              onChange={(e) =>
                setForm((f) => ({ ...f, issueDetails: e.target.value }))
              }
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">Priority</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">Assign to (optional)</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.assignedTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, assignedTo: e.target.value }))
              }
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {uLabel(u)}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setOpenCreate(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </GlassModal>
    </AppLayout>
  );
}
