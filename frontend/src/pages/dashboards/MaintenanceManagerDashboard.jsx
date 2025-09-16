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
  if (v === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-white/10 text-white";
};
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

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="secondary" onClick={onClose} className="px-2 py-1 text-xs">Close</Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Drawer({ open, title, onClose, children }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="secondary" onClick={onClose} className="px-2 py-1 text-xs">Close</Button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export default function MaintenanceManagerDashboard() {
  // component-local CSS fixes (select & empty button)
  // put in global CSS if you prefer: index.css
  const SelectFix = () => (
    <style>{`
      button:empty { display: none; }                    /* hide stray empty buttons (white pills) */
      select.dark-native,
      select.dark-native option,
      select.dark-native optgroup {
        background-color: #0f172a;
        color: #ffffff;
      }
      select.dark-native:focus { outline: none; }
    `}</style>
  );

  // data
  const [tickets, setTickets] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [techs, setTechs] = useState([]);

  // build id -> technician map
  const techMap = useMemo(() => {
    const m = new Map();
    techs.forEach((t) => m.set(t._id, t));
    return m;
  }, [techs]);

  const assigneeText = (row) => {
    if (row?.assignedTo?.name || row?.assignedTo?.email) return tLabel(row.assignedTo);
    const id = typeof row?.assignedTo === "string" ? row.assignedTo : row?.assignedTo?._id;
    const t = id ? techMap.get(id) : null;
    if (t) return tLabel(t);
    return id ? `…${String(id).slice(-6)}` : "—";
  };

  // filters
  const [statusF, setStatusF] = useState("all");
  const [hostelF, setHostelF] = useState("all");
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

  // assign + comment modals
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ id: "", assignedTo: "" });
  const [showComment, setShowComment] = useState(false);
  const [commentForm, setCommentForm] = useState({ id: "", note: "" });

  // details
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [inlineNote, setInlineNote] = useState("");
  const [inlineAssign, setInlineAssign] = useState("");

  const hostelName = useMemo(() => {
    const m = new Map();
    hostels.forEach((h) => m.set(h._id, h.name || h.location || h._id?.slice(-6)));
    return m;
  }, [hostels]);

  const stats = useMemo(() => {
    const t = tickets,
      by = (fn) => t.filter(fn).length;
    return {
      total: t.length,
      open: by((x) => String(x.status).toLowerCase() === "open"),
      inprog: by((x) => String(x.status).toLowerCase() === "in_progress"),
      resolved: by((x) => String(x.status).toLowerCase() === "resolved"),
      urgent: by((x) => String(x.priority).toLowerCase() === "urgent"),
    };
  }, [tickets]);

  const loadTechs = async () => {
    try {
      const r = await api.get("/technicians", { params: { page: 1, limit: 200 } });
      setTechs(getArr(r));
    } catch {}
  };
  const load = async () => {
    setLoading(true);
    setOk("");
    setErr("");
    const params = {
      page: 1,
      limit: 100,
      ...(statusF !== "all" ? { status: statusF } : {}),
      ...(hostelF !== "all" ? { hostel: hostelF } : {}),
      ...(assignedF !== "all" ? { assignedTo: assignedF } : {}),
      ...(searchF.trim() ? { search: searchF.trim() } : {}),
    };
    try {
      const [t, h] = await Promise.all([
        api.get("/maintenance", { params }),
        api.get("/hostels", { params: { page: 1, limit: 100 } }),
      ]);
      setTickets(getArr(t));
      setHostels(getArr(h));
    } catch (e) {
      setTickets([]);
      toast(e?.response?.data?.message || "Failed to load tickets", true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    loadTechs();
  }, []);

  const setStatus = async (row, status) => {
    try {
      await api.patch(`/maintenance/${row._id}/status`, { status });
      toast(`Status → ${status}`);
      await load();
      if (detailsId === row._id) await fetchDetails(detailsId);
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to update status", true);
    }
  };

  const openAssign = (row) => {
    setAssignForm({ id: row._id, assignedTo: row.assignedTo?._id || "" });
    setShowAssign(true);
  };
  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.assignedTo) return toast("Select a technician", true);
    try {
      await api.patch(`/maintenance/${assignForm.id}/assign`, { assignedTo: assignForm.assignedTo });
      setShowAssign(false);
      toast("Assignee updated");
      await load();
      if (detailsId === assignForm.id) await fetchDetails(detailsId);
    } catch (e) {
      toast(e?.response?.data?.message || "Assign failed", true);
    }
  };

  const openComment = (row) => {
    setCommentForm({ id: row._id, note: "" });
    setShowComment(true);
  };
  const submitComment = async (e) => {
    e.preventDefault();
    const note = (commentForm.note || "").trim();
    if (!note) return toast("Comment is required", true);
    try {
      await api.post(`/maintenance/${commentForm.id}/comments`, { note });
      setShowComment(false);
      toast("Comment added");
      if (detailsId === commentForm.id) await fetchDetails(detailsId);
    } catch (e) {
      toast(e?.response?.data?.message || "Comment failed", true);
    }
  };

  const openDetails = async (id) => {
    setDetailsId(id);
    setDetailsOpen(true);
    await fetchDetails(id);
  };
  const fetchDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const r = await api.get(`/maintenance/${id}`);
      const d = r?.data?.data ?? r?.data;
      setDetails(d);
      setInlineAssign(d?.assignedTo?._id || "");
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load ticket", true);
    } finally {
      setDetailsLoading(false);
    }
  };
  const inlineAssignSave = async () => {
    if (!detailsId) return;
    try {
      await api.patch(`/maintenance/${detailsId}/assign`, {
        assignedTo: inlineAssign || undefined,
      });
      toast("Assignee updated");
      await fetchDetails(detailsId);
      await load();
    } catch (e) {
      toast(e?.response?.data?.message || "Assign failed", true);
    }
  };
  const inlineAddNote = async () => {
    const note = (inlineNote || "").trim();
    if (!note) return toast("Comment is required", true);
    try {
      await api.post(`/maintenance/${detailsId}/comments`, { note });
      setInlineNote("");
      toast("Comment added");
      await fetchDetails(detailsId);
    } catch (e) {
      toast(e?.response?.data?.message || "Comment failed", true);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "issue",
        header: "Issue",
        render: (x) => (
          <div className="max-w-[24rem] truncate" title={x.issueDetails}>
            {x.issueDetails || "—"}
          </div>
        ),
      },
      { key: "status", header: "Status", render: (x) => badge(String(x.status || "—").replace("_", " "), toneForStatus(x.status)) },
      { key: "priority", header: "Priority", render: (x) => badge(String(x.priority || "—"), toneForPrio(x.priority)) },
      { key: "hostel", header: "Hostel", render: (x) => hostelName.get(x.hostel?._id || x.hostel) || "—" },
      { key: "requester", header: "Requester", render: (x) => x.requester?.name || x.requester?.email || x.requester?._id?.slice(-6) || "—" },
      { key: "assignee", header: "Assignee", render: (x) => assigneeText(x) },
      { key: "created", header: "Created", render: (x) => fdt(x.createdAt) },
      {
        key: "actions",
        header: "Actions",
        render: (x) => (
          <div className="flex flex-wrap gap-1">
            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openDetails(x._id)}>View</Button>
            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openAssign(x)}>Assign</Button>
            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openComment(x)}>Comment</Button>
            <Button variant="success" className="px-2 py-1 text-xs" onClick={() => setStatus(x, "resolved")}>Resolve</Button>
          </div>
        ),
      },
    ],
    [hostelName, techMap]
  );

  return (
    <AppLayout>
      <SelectFix />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Maintenance Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>Refresh</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setStatusF("all"); setHostelF("all"); setAssignedF("all"); setSearchF(""); load();
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

      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        <StatCard title="Total tickets" value={stats.total} />
        <StatCard title="Open" value={stats.open} />
        <StatCard title="In progress" value={stats.inprog} />
        <StatCard title="Resolved" value={stats.resolved} />
        <StatCard title="Urgent" value={stats.urgent} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mt-6 space-y-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-white backdrop-blur"
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <select
            value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
            className="dark-native rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/40"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={hostelF}
            onChange={(e) => setHostelF(e.target.value)}
            className="dark-native rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/40"
          >
            <option value="all">All hostels</option>
            {hostels.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name || h.location || h._id?.slice(-6)}
              </option>
            ))}
          </select>

          <select
            value={assignedF}
            onChange={(e) => setAssignedF(e.target.value)}
            className="dark-native rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/40"
          >
            <option value="all">All assignees</option>
            {techs.map((t) => (
              <option key={t._id} value={t._id}>
                {tLabel(t)}
              </option>
            ))}
          </select>

          <input
            value={searchF}
            onChange={(e) => setSearchF(e.target.value)}
            placeholder="Search issues"
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" variant="primary">Filter</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setStatusF("all"); setHostelF("all"); setAssignedF("all"); setSearchF(""); load();
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <Section title="Tickets">
          <DataTable
            columns={columns}
            rows={tickets}
            emptyText={loading ? "Loading…" : "No tickets found."}
          />
        </Section>
      </div>

      {/* Assign modal */}
      <Modal open={showAssign} title="Assign technician" onClose={() => setShowAssign(false)}>
        <form onSubmit={submitAssign} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm">Technician</span>
            <select
              className="dark-native w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={assignForm.assignedTo}
              onChange={(e) => setAssignForm((f) => ({ ...f, assignedTo: e.target.value }))}
              required
            >
              <option value="">Select technician</option>
              {techs.map((t) => (
                <option key={t._id} value={t._id}>
                  {tLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>
              Close
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Comment modal */}
      <Modal open={showComment} title="Add comment" onClose={() => setShowComment(false)}>
        <form onSubmit={submitComment} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm">Note</span>
            <textarea
              rows="4"
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={commentForm.note}
              onChange={(e) => setCommentForm((f) => ({ ...f, note: e.target.value }))}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowComment(false)}>
              Close
            </Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>

      {/* Details drawer */}
      <Drawer open={detailsOpen} title="Ticket details" onClose={() => setDetailsOpen(false)}>
        {detailsLoading ? (
          <div className="text-sm text-white/70">Loading…</div>
        ) : !details ? (
          <div className="text-sm text-white/70">No data.</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {badge(String(details.status || "—").replace("_", " "), toneForStatus(details.status))}
              {badge(String(details.priority || "—"), toneForPrio(details.priority))}
              <span className="text-xs text-white/70">Created {fdt(details.createdAt)}</span>
            </div>

            <div>
              <div className="text-sm text-white/70">Issue</div>
              <div className="mt-1 whitespace-pre-wrap">{details.issueDetails || "—"}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/15 bg-white/5 p-3 backdrop-blur">
                <div className="text-xs text-white/70">Hostel</div>
                <div className="font-medium">
                  {hostelName.get(details.hostel?._id || details.hostel) || "—"}
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3 backdrop-blur">
                <div className="text-xs text-white/70">Room</div>
                <div className="font-medium">
                  {details.room?.type ||
                    (typeof details.room === "string"
                      ? `…${details.room.slice(-6)}`
                      : details.room?._id
                      ? `…${String(details.room._id).slice(-6)}`
                      : "—")}
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3 backdrop-blur">
                <div className="text-xs text-white/70">Requester</div>
                <div className="font-medium">
                  {details.requester?.name ||
                    details.requester?.email ||
                    details.requester?._id?.slice(-6) ||
                    "—"}
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3 backdrop-blur">
                <div className="text-xs text-white/70">Assignee</div>
                <div className="flex items-center gap-2">
                  <select
                    className="dark-native w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-sm text-white"
                    value={inlineAssign}
                    onChange={(e) => setInlineAssign(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {techs.map((t) => (
                      <option key={t._id} value={t._id}>
                        {tLabel(t)}
                      </option>
                    ))}
                  </select>
                  <Button variant="primary" className="px-2 py-1 text-xs" onClick={inlineAssignSave}>
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-white/80">Quick status</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(details, "open")}>
                  Open
                </Button>
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(details, "in_progress")}>
                  In progress
                </Button>
                <Button variant="success" className="px-2 py-1 text-xs" onClick={() => setStatus(details, "resolved")}>
                  Resolve
                </Button>
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(details, "closed")}>
                  Close
                </Button>
                <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => setStatus(details, "cancelled")}>
                  Cancel
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-white/80">Comments</div>
              {Array.isArray(details.comments) && details.comments.length > 0 ? (
                <div className="space-y-2">
                  {details.comments.map((c, i) => (
                    <div key={i} className="rounded-lg border border-white/15 bg-white/5 p-3 backdrop-blur">
                      <div className="text-xs text-white/70">
                        {(c.by?.name || c.by?.email || (typeof c.by === "string" ? c.by.slice(-6) : "—"))} · {fdt(c.at)}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{c.note || ""}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/20 p-4 text-sm text-white/60">
                  No comments yet.
                </div>
              )}
              <div className="mt-3 flex items-end gap-2">
                <textarea
                  rows="2"
                  className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                  placeholder="Add a note…"
                  value={inlineNote}
                  onChange={(e) => setInlineNote(e.target.value)}
                />
                <Button className="h-[38px]" onClick={inlineAddNote}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppLayout>
  );
}
