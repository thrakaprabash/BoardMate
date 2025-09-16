// src/pages/maintenance/OpenTickets.jsx
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import StatCard from "../../components/StatCard";
import Button from "../../components/Button";
import api from "../../services/api";

// helpers
const getArr = (res) => res?.data?.items ?? res?.data?.data ?? res?.data ?? [];
const fdt = (d) => (d ? new Date(d).toLocaleString() : "—");
const badge = (text, cls) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${cls}`}>{text}</span>
);
const toneForPrio = (p = "") => {
  const v = String(p || "").toLowerCase();
  if (v === "urgent") return "bg-red-100 text-red-700";
  if (v === "high") return "bg-orange-100 text-orange-700";
  if (v === "medium") return "bg-amber-100 text-amber-700";
  if (v === "low") return "bg-green-100 text-green-700";
  return "bg-white/10 text-white";
};
const tLabel = (t) =>
  [t?.name, t?.email].filter(Boolean).join(" ") + (t?._id ? ` • ${t._id.slice(-6)}` : "");

export default function OpenTickets() {
  // tiny CSS shim (dark native selects + hide stray empty buttons)
  const SelectFix = () => (
    <style>{`
      button:empty { display:none; }
      select.dark-native, select.dark-native option, select.dark-native optgroup { background:#0f172a; color:#fff; }
      select.dark-native:focus { outline:none; }
      input.input-dark { background:rgba(255,255,255,.08); color:#fff; border-color:rgba(255,255,255,.2); }
      input.input-dark::placeholder { color:rgba(255,255,255,.7) }
    `}</style>
  );

  // data
  const [tickets, setTickets] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [techs, setTechs] = useState([]);

  // id -> technician map
  const techMap = useMemo(() => {
    const m = new Map();
    techs.forEach((t) => m.set(t._id, t));
    return m;
  }, [techs]);

  const assigneeText = (row) => {
    if (row?.assignedTo?.name || row?.assignedTo?.email) return tLabel(row.assignedTo);
    const id = typeof row?.assignedTo === "string" ? row.assignedTo : row?.assignedTo?._id;
    const t = id ? techMap.get(id) : null;
    return t ? tLabel(t) : id ? `…${String(id).slice(-6)}` : "—";
  };

  // filters
  const [hostelF, setHostelF] = useState("all");
  const [roomF, setRoomF] = useState("all");
  const [assignedF, setAssignedF] = useState("all");
  const [searchF, setSearchF] = useState("");

  // ui
  const [loading, setLoading] = useState(true);
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

  // assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignTicket, setAssignTicket] = useState(null);
  const [assignTech, setAssignTech] = useState("");

  const hostelName = useMemo(() => {
    const m = new Map();
    hostels.forEach((h) => m.set(h._id, h.name || h.location || h._id?.slice(-6)));
    return m;
  }, [hostels]);

  const roomName = useMemo(() => {
    const m = new Map();
    rooms.forEach((r) =>
      m.set(r._id, `${r.type || "Room"}${r.number ? ` #${r.number}` : ""} • ${r._id?.slice(-6)}`)
    );
    return m;
  }, [rooms]);

  const loadTechs = async () => {
    try {
      const r = await api.get("/technicians", { params: { page: 1, limit: 200, active: "true" } });
      setTechs(getArr(r));
    } catch {}
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 100,
        status: "open",
        ...(hostelF !== "all" ? { hostel: hostelF } : {}),
        ...(roomF !== "all" ? { room: roomF } : {}),
        ...(assignedF !== "all" ? { assignedTo: assignedF } : {}),
        ...(searchF.trim() ? { search: searchF.trim() } : {}),
      };
      const [t, h, r] = await Promise.all([
        api.get("/maintenance", { params }),
        api.get("/hostels", { params: { page: 1, limit: 100 } }),
        api.get("/rooms", { params: { page: 1, limit: 100 } }),
      ]);
      setTickets(getArr(t));
      setHostels(getArr(h));
      setRooms(getArr(r));
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load open tickets", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadTechs();
  }, []);

  const urgentCount = useMemo(
    () => tickets.filter((t) => String(t.priority).toLowerCase() === "urgent").length,
    [tickets]
  );

  const setStatus = async (row, status) => {
    setTickets((prev) => prev.filter((x) => x._id !== row._id)); // optimistic
    try {
      await api.patch(`/maintenance/${row._id}/status`, { status });
      toast(`Status → ${status}`);
    } catch (e) {
      setTickets((prev) => [row, ...prev]); // revert
      toast(e?.response?.data?.message || "Failed to update status", true);
    }
  };

  const openAssign = (row) => {
    setAssignTicket(row);
    setAssignTech(row.assignedTo?._id || "");
    setShowAssign(true);
  };

  const saveAssign = async (e) => {
    e.preventDefault();
    if (!assignTech) return toast("Select a technician", true);
    const orig = assignTicket;
    setTickets((prev) =>
      prev.map((r) => (r._id === orig._id ? { ...r, assignedTo: { ...(r.assignedTo || {}), _id: assignTech } } : r))
    );
    try {
      await api.patch(`/maintenance/${orig._id}/assign`, { assignedTo: assignTech });
      toast("Assignee updated");
      setShowAssign(false);
    } catch (err) {
      setTickets((prev) => prev.map((r) => (r._id === orig._id ? orig : r)));
      toast(err?.response?.data?.message || "Assign failed", true);
    }
  };

  const columns = [
    {
      key: "issue",
      header: "Issue",
      render: (t) => (
        <div className="max-w-[22rem] truncate" title={t.issueDetails}>
          {t.issueDetails || "—"}
        </div>
      ),
    },
    { key: "hostel", header: "Hostel", render: (t) => hostelName.get(t.hostel?._id || t.hostel) || "—" },
    { key: "room", header: "Room", render: (t) => roomName.get(t.room?._id || t.room) || (t.room?._id || t.room || "—") },
    { key: "priority", header: "Priority", render: (t) => badge(String(t.priority || "—"), toneForPrio(t.priority)) },
    { key: "assignee", header: "Assignee", render: (t) => assigneeText(t) },
    { key: "created", header: "Created", render: (t) => fdt(t.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (t) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(t, "in_progress")}>
            Start
          </Button>
          <Button variant="success" className="px-2 py-1 text-xs" onClick={() => setStatus(t, "resolved")}>
            Resolve
          </Button>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(t, "closed")}>
            Close
          </Button>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openAssign(t)}>
            Assign
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <SelectFix />

      {/* header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Open Tickets</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setHostelF("all");
              setRoomF("all");
              setAssignedF("all");
              setSearchF("");
              load();
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{ok}</span>}
          {err && <span className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">{err}</span>}
        </div>
      )}

      {/* stats row — slightly elevated and spaced from next block */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-[1]">
        <StatCard title="Open tickets" value={tickets.length} />
        <StatCard title="Urgent" value={urgentCount} />
        <StatCard title="Unassigned" value={tickets.filter((t) => !t.assignedTo).length} />
      </div>

      {/* section below — extra top margin + lower z to avoid visual blending */}
      <Section title="Open tickets" className="mt-8 relative z-0">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <select
            className="dark-native rounded border border-white/20 px-3 py-2 text-white"
            value={hostelF}
            onChange={(e) => setHostelF(e.target.value)}
          >
            <option value="all">All hostels</option>
            {hostels.map((h) => (
              <option key={h._id} value={h._id}>
                {hostelName.get(h._id)}
              </option>
            ))}
          </select>

          <select
            className="dark-native rounded border border-white/20 px-3 py-2 text-white"
            value={roomF}
            onChange={(e) => setRoomF(e.target.value)}
          >
            <option value="all">All rooms</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>
                {roomName.get(r._id)}
              </option>
            ))}
          </select>

          <select
            className="dark-native rounded border border-white/20 px-3 py-2 text-white"
            value={assignedF}
            onChange={(e) => setAssignedF(e.target.value)}
          >
            <option value="all">All assignees</option>
            {techs.map((t) => (
              <option key={t._id} value={t._id}>
                {tLabel(t)}
              </option>
            ))}
          </select>

          <input
            className="input-dark rounded border px-3 py-2"
            placeholder="Search issues"
            value={searchF}
            onChange={(e) => setSearchF(e.target.value)}
          />
        </div>

        <div className="mb-4 flex justify-end gap-2">
          <Button onClick={load}>Apply</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setHostelF("all");
              setRoomF("all");
              setAssignedF("all");
              setSearchF("");
              load();
            }}
          >
            Clear
          </Button>
        </div>

        <DataTable
          columns={columns}
          rows={tickets}
          emptyText={loading ? "Loading…" : "No open tickets."}
        />
      </Section>

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-lg font-semibold">Assign ticket</h3>
              <Button
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() => setShowAssign(false)}
              >
                Close
              </Button>
            </div>
            <form onSubmit={saveAssign} className="p-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm">Technician</span>
                <select
                  className="dark-native w-full rounded border border-white/20 px-3 py-2"
                  value={assignTech}
                  onChange={(e) => setAssignTech(e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  {techs.map((t) => (
                    <option key={t._id} value={t._id}>
                      {tLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setShowAssign(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
