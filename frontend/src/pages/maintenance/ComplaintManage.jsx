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
const toneForStatus = (s = "") => {
  const v = String(s || "").toLowerCase();
  if (v === "open") return "bg-yellow-100 text-yellow-700";
  if (v === "in_progress") return "bg-blue-100 text-blue-700";
  if (v === "resolved") return "bg-emerald-100 text-emerald-700";
  if (v === "closed") return "bg-gray-100 text-gray-700";
  if (v === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-white/10 text-white";
};
const tLabel = (t) =>
  [t?.name, t?.email].filter(Boolean).join(" ") + (t?._id ? ` • ${t._id.slice(-6)}` : "");

function GlassModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={onClose}>Close</Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ComplaintManage() {
  // small CSS helpers (hide stray empty buttons + dark selects)
  const SelectFix = () => (
    <style>{`
      button:empty { display:none; }
      select.dark-native, select.dark-native option, select.dark-native optgroup { background:#0f172a; color:#fff; }
      select.dark-native:focus { outline:none; }
      input.input-dark, textarea.input-dark { background:rgba(255,255,255,.08); color:#fff; border-color:rgba(255,255,255,.2); }
      input.input-dark::placeholder, textarea.input-dark::placeholder { color:rgba(255,255,255,.7) }
    `}</style>
  );

  // data
  const [rows, setRows] = useState([]);
  const [techs, setTechs] = useState([]);

  // filters
  const [statusF, setStatusF] = useState("all");
  const [assignedF, setAssignedF] = useState("all");
  const [searchF, setSearchF] = useState("");

  // ui
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m);
    setErr(isErr ? m : "");
    setTimeout(() => {
      setOk(""); setErr("");
    }, 2200);
  };

  // assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [assignTech, setAssignTech] = useState("");

  // stats
  const stats = useMemo(() => {
    const by = (s) => rows.filter((r) => String(r.status).toLowerCase() === s).length;
    return { total: rows.length, open: by("open"), inprog: by("in_progress"), resolved: by("resolved") };
  }, [rows]);

  const loadTechs = async () => {
    try {
      const res = await api.get("/technicians", { params: { page: 1, limit: 200, active: "true" } });
      setTechs(getArr(res));
    } catch {}
  };
  const load = async () => {
    try {
      const params = {
        page: 1, limit: 100,
        ...(statusF !== "all" ? { status: statusF } : {}),
        ...(assignedF !== "all" ? { assignedTo: assignedF } : {}),
        ...(searchF.trim() ? { search: searchF.trim() } : {}),
      };
      const res = await api.get("/complaints", { params });
      setRows(getArr(res));
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load complaints", true);
    }
  };

  useEffect(() => { load(); loadTechs(); }, []);

  const setStatus = async (row, status) => {
    try {
      await api.patch(`/complaints/${row._id}/status`, { status });
      toast(`Status → ${status}`);
      load();
    } catch (e) { toast(e?.response?.data?.message || "Failed to update status", true); }
  };

  const openAssign = (row) => { setAssignId(row._id); setAssignTech(row.assignedTo?._id || ""); setShowAssign(true); };
  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assignTech) return toast("Select a technician", true);
    try {
      await api.patch(`/complaints/${assignId}/assign`, { assignedTo: assignTech });
      setShowAssign(false); toast("Assignee updated"); load();
    } catch (e) { toast(e?.response?.data?.message || "Assign failed", true); }
  };

  const columns = [
    { key: "subject", header: "Subject",  render: (r) => r.subject || r.title || "—" },
    { key: "status",  header: "Status",   render: (r) => badge(String(r.status || "—").replace("_", " "), toneForStatus(r.status)) },
    { key: "by",      header: "By",       render: (r) => r.user?.name || r.user?.email || r.user?._id?.slice(-6) || "—" },
    { key: "created", header: "Created",  render: (r) => fdt(r.createdAt) },
    {
      key: "actions", header: "Actions", render: (r) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(r, "in_progress")}>Start</Button>
          <Button variant="success"   className="px-2 py-1 text-xs" onClick={() => setStatus(r, "resolved")}>Resolve</Button>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(r, "closed")}>Close</Button>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openAssign(r)}>Assign</Button>
        </div>
      )
    },
  ];

  return (
    <AppLayout>
      <SelectFix />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Complaint Manage</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>Refresh</Button>
          <Button variant="secondary" onClick={() => { setStatusF("all"); setAssignedF("all"); setSearchF(""); load(); }}>Clear</Button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok &&  <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{ok}</span>}
          {err && <span className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">{err}</span>}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Total complaints" value={stats.total} />
        <StatCard title="Open"            value={stats.open} />
        <StatCard title="In progress"     value={stats.inprog} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mt-6 grid items-end gap-3 md:grid-cols-5 rounded-2xl border border-white/15 bg-white/5 p-4 text-white backdrop-blur">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm">Search</span>
          <input className="input-dark rounded border px-3 py-2" placeholder="Subject/description…" value={searchF} onChange={(e) => setSearchF(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Status</span>
          <select className="dark-native rounded border border-white/20 px-3 py-2" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm">Assigned to</span>
          <select className="dark-native rounded border border-white/20 px-3 py-2" value={assignedF} onChange={(e) => setAssignedF(e.target.value)}>
            <option value="all">All</option>
            {techs.map((t) => <option key={t._id} value={t._id}>{tLabel(t)}</option>)}
          </select>
        </label>
        <div className="md:col-span-5 flex justify-end gap-2">
          <Button type="submit">Apply</Button>
          <Button variant="secondary" type="button" onClick={() => { setStatusF("all"); setAssignedF("all"); setSearchF(""); load(); }}>Clear</Button>
        </div>
      </form>

      <div className="mt-6">
        <Section title="Complaints">
          <DataTable columns={columns} rows={rows} emptyText={"No complaints."} />
        </Section>
      </div>

      <GlassModal open={showAssign} title="Assign complaint" onClose={() => setShowAssign(false)}>
        <form onSubmit={submitAssign} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm">Technician</span>
            <select className="dark-native w-full rounded border border-white/20 px-3 py-2" value={assignTech} onChange={(e) => setAssignTech(e.target.value)} required>
              <option value="">Select</option>
              {techs.map((t) => <option key={t._id} value={t._id}>{tLabel(t)}</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </GlassModal>
    </AppLayout>
  );
}
