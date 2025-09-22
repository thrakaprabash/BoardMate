import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import api from "../../services/api";

const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const fdt = (d) => (d ? new Date(d).toLocaleString() : "--");
const idTail = (v) => String(v || "").slice(-6);
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
const neat = (s) => String(s ?? "—").replace(/_/g, " ");
const uLabel = (u) =>
  [u?.name, u?.email].filter(Boolean).join(" ") + (u?._id ? ` • ${String(u._id).slice(-6)}` : "");
const roomPretty = (r) =>
  !r ? "—" : `${r.type || "Room"}${r.number ? ` #${r.number}` : ""} • ${idTail(r._id)}`;

// Resolve ID -> user via usersMap
const makeAssigneeText = (usersMap) => (x) => {
  if (x.assignedTo?.name || x.assignedTo?.email) return uLabel(x.assignedTo);
  const id = typeof x.assignedTo === "string" ? x.assignedTo : x.assignedTo?._id;
  if (!id) return "—";
  const u = usersMap.get(id);
  return u ? uLabel(u) : `…${String(id).slice(-6)}`;
};

// Try to discover current user id for `requester` without changing backend
async function discoverMyUserId() {
  const tryEndpoints = ["/auth/me", "/users/me", "/me"];
  for (const path of tryEndpoints) {
    try {
      const r = await api.get(path);
      const me = r?.data?.data ?? r?.data;
      const id = me?._id || me?.id;
      if (id) return String(id);
    } catch { /* continue */ }
  }
  // Try reading JWT from localStorage and decoding
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (token && token.split(".").length === 3) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const id = payload?.id || payload?._id || payload?.sub || payload?.userId || payload?.uid;
      if (id) return String(id);
    }
  } catch { /* ignore */ }
  return null;
}

function GlassModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-slate-900 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={onClose}>Close</Button>
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
  const [meId, setMeId] = useState(null);             // NEW: my user id (for requester)

  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m);
    setErr(isErr ? m : "");
    setTimeout(() => { setOk(""); setErr(""); }, 2400);
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
    hostels.forEach((h) => m.set(h._id, h.name || h.location || h._id?.slice(-6)));
    return m;
  }, [hostels]);

  const roomById = useMemo(() => {
    const m = new Map();
    rooms.forEach((r) => m.set(r._id, r));
    return m;
  }, [rooms]);

  const usersMap = useMemo(() => {
    const m = new Map();
    users.forEach((u) => m.set(u._id, u));
    return m;
  }, [users]);

  const loadUsers = async () => {
    try {
      const tries = [
        () => api.get("/users", { params: { page: 1, limit: 200, role: "technician" } }),
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
    // discover my id but don't interrupt UI if it fails
    (async () => setMeId(await discoverMyUserId()))();
  }, []);

  const createTicket = async (e) => {
    e.preventDefault();

    // Front-end guard for required fields
    if (!form.hostel || !form.room || !form.issueDetails.trim()) {
      return toast("Hostel, Room and Issue details are required.", true);
    }

    try {
      const payload = {
        requester: meId || undefined,                 // NEW: send requester if we found it
        hostel: form.hostel || undefined,
        room: form.room || undefined,
        issueDetails: form.issueDetails,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
      };

      const res = await api.post("/maintenance", payload);
      const created = res?.data?.data ?? res?.data;
      setTickets((prev) => [created, ...prev]);
      setForm({ hostel: "", room: "", issueDetails: "", priority: "medium", assignedTo: "" });
      setOpenCreate(false);
      toast("Ticket created");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to create ticket";

      // Helpful hint if backend complains about requester specifically
      if (/requester/i.test(String(msg))) {
        toast("Create failed: backend requires 'requester'. Please ensure you are logged in; if issue persists, make sure your token is stored as 'token' or 'accessToken'.", true);
      } else {
        toast(msg, true);
      }
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

  const assigneeText = useMemo(() => makeAssigneeText(usersMap), [usersMap]);

  // ---------- Printable table HTML (no inline JS) ----------
  const printableHtmlTickets = (list) => {
    const rowsHtml = list.map((t) => {
      const hostelStr = hostelName.get(t.hostel?._id || t.hostel) || "—";
      const roomStr =
        t.room && typeof t.room === "object" && t.room._id
          ? roomPretty(t.room)
          : typeof t.room === "string" && t.room
          ? (roomById.get(t.room) ? roomPretty(roomById.get(t.room)) : `Room • ${idTail(t.room)}`)
          : "—";
      const requesterStr =
        t.requester?.name || t.requester?.email || (t.requester?._id ? "…" + idTail(t.requester._id) : "—");

      let assigneeStr = "—";
      if (t.assignedTo && (t.assignedTo.name || t.assignedTo.email)) {
        assigneeStr =
          (t.assignedTo.name || t.assignedTo.email) +
          (t.assignedTo._id ? ` • ${String(t.assignedTo._id).slice(-6)}` : "");
      } else {
        const id2 =
          typeof t.assignedTo === "string"
            ? t.assignedTo
            : (t.assignedTo && t.assignedTo._id ? String(t.assignedTo._id) : "");
        if (id2) {
          const tech = usersMap.get(id2);
          assigneeStr = tech
            ? (tech.name || tech.email) + (tech._id ? ` • ${String(tech._id).slice(-6)}` : "")
            : "…" + idTail(id2);
        }
      }

      const issue = (t.issueDetails || "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");

      return `
        <tr>
          <td>${t._id}</td>
          <td>${neat(t.status)}</td>
          <td>${neat(t.priority)}</td>
          <td>${hostelStr}</td>
          <td>${roomStr}</td>
          <td>${requesterStr}</td>
          <td>${assigneeStr}</td>
          <td>${fdt(t.createdAt)}</td>
          <td>${fdt(t.resolvedAt)}</td>
          <td>${issue}</td>
        </tr>
      `;
    }).join("");

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Tickets Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 { margin: 0 0 16px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Tickets Export (${list.length}) • ${new Date().toLocaleString()}</h1>
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Hostel</th>
                <th>Room</th>
                <th>Requester</th>
                <th>Assignee</th>
                <th>Created</th>
                <th>Resolved</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `;
  };

  // ---------- Bulk PDF export (organized table) ----------
  const exportTicketsPDF = async () => {
    if (!tickets.length) return toast("No tickets to export", true);

    let mod = null, autoTable = null;
    try {
      mod = await import("jspdf");
      autoTable = (await import("jspdf-autotable")).default;
    } catch { /* fallback below */ }

    const headers = [
      "Ticket ID","Status","Priority","Hostel","Room","Requester","Assignee","Created","Resolved","Issue"
    ];

    const rows = tickets.map((t) => {
      const hostelStr = hostelName.get(t.hostel?._id || t.hostel) || "—";
      const roomStr =
        t.room && typeof t.room === "object" && t.room._id
          ? roomPretty(t.room)
          : typeof t.room === "string" && t.room
          ? (roomById.get(t.room) ? roomPretty(roomById.get(t.room)) : `Room • ${idTail(t.room)}`)
          : "—";
      const requesterStr = t.requester?.name || t.requester?.email || (t.requester?._id ? "…" + idTail(t.requester._id) : "—");
      const assigneeStr = assigneeText(t);
      const issue = (t.issueDetails || "").replace(/\s+/g, " ").trim();

      return [
        t._id, neat(t.status), neat(t.priority), hostelStr, roomStr,
        requesterStr, assigneeStr, fdt(t.createdAt), fdt(t.resolvedAt), issue
      ];
    });

    if (mod?.jsPDF && typeof autoTable === "function") {
      const { jsPDF } = mod;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      const margin = { left: 28, right: 28, top: 56, bottom: 32 };

      autoTable(doc, {
        head: [headers],
        body: rows,
        margin,
        theme: "grid",
        styles: {
          font: "helvetica", fontSize: 9, cellPadding: 6,
          overflow: "linebreak", lineColor: [226,232,240], lineWidth: 0.8,
          textColor: [15,23,42], valign: "top",
        },
        headStyles: { fillColor: [30,41,59], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248,250,252] },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "left" },
          4: { halign: "left" },
          5: { halign: "left" },
          6: { halign: "left" },
          7: { halign: "center" },
          8: { halign: "center" },
          9: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            if (data.column.index === 1) {
              const v = String(data.cell.raw).toLowerCase();
              if (v === "resolved") data.cell.styles.textColor = [16,185,129];
              else if (v === "closed") data.cell.styles.textColor = [100,116,139];
              else if (v === "in progress") data.cell.styles.textColor = [37,99,235];
              else if (v === "cancelled") data.cell.styles.textColor = [244,63,94];
              else if (v === "open") data.cell.styles.textColor = [202,138,4];
            }
            if (data.column.index === 2) {
              const v = String(data.cell.raw).toLowerCase();
              if (v === "urgent") data.cell.styles.textColor = [220,38,38];
              else if (v === "high") data.cell.styles.textColor = [217,119,6];
              else if (v === "medium") data.cell.styles.textColor = [5,150,105];
            }
          }
        },
        didDrawPage: (data) => {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(15,23,42);
          doc.text(`Tickets Export (${tickets.length})`, data.settings.margin.left, 28);
          doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(100,116,139);
          doc.text(new Date().toLocaleString(), data.settings.margin.left, 42);
          const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
          const pageCount = doc.internal.getNumberOfPages();
          const footer = `Page ${pageNumber} of ${pageCount}`;
          doc.text(footer, pageWidth - data.settings.margin.right - doc.getTextWidth(footer), pageHeight - 12);
        },
      });

      doc.setProperties({ title: `Tickets_${new Date().toISOString().slice(0,10)}` });
      doc.save(`tickets_${new Date().toISOString().slice(0, 10)}.pdf`);
      return;
    }

    const html = printableHtmlTickets(tickets);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return toast("Popup blocked: enable popups to print/save PDF", true);
    w.document.write(html);
    w.document.close();
  };

  // ---------- Single ticket PDF (kept from earlier) ----------
  const downloadTicketPdf = async (t) => {
    try {
      let mod = null, autoTable = null;
      try {
        mod = await import("jspdf");
        autoTable = (await import("jspdf-autotable")).default;
      } catch { /* fallback below */ }

      const hostelStr = hostelName.get(t.hostel?._id || t.hostel) || "—";
      const roomStr =
        t.room && typeof t.room === "object" && t.room._id
          ? roomPretty(t.room)
          : typeof t.room === "string" && t.room
          ? (roomById.get(t.room) ? roomPretty(roomById.get(t.room)) : `Room • ${idTail(t.room)}`)
          : "—";
      const requesterStr = t.requester?.name || t.requester?.email || (t.requester?._id ? "…" + idTail(t.requester._id) : "—");
      const assigneeStr = assigneeText(t);

      if (mod?.jsPDF && typeof autoTable === "function") {
        const { jsPDF } = mod;
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const margin = { left: 36, right: 36, top: 64, bottom: 32 };

        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.text(`Ticket ${idTail(t._id)}`, margin.left, 32);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100,116,139);
        doc.text(new Date().toLocaleString(), margin.left, 48);
        doc.setTextColor(15,23,42);

        const body = [
          ["Ticket ID", t._id],
          ["Status", neat(t.status)],
          ["Priority", neat(t.priority)],
          ["Hostel", hostelStr],
          ["Room", roomStr],
          ["Requester", requesterStr],
          ["Assignee", assigneeStr],
          ["Created", fdt(t.createdAt)],
          ["Resolved", fdt(t.resolvedAt)],
          ["Issue", (t.issueDetails || "").replace(/\s+/g, " ").trim()],
        ];

        autoTable(doc, {
          head: [["Field", "Value"]],
          body,
          startY: margin.top,
          margin,
          theme: "grid",
          styles: { font: "helvetica", fontSize: 10, cellPadding: 6, overflow: "linebreak", lineColor: [226,232,240], lineWidth: 0.8, valign: "top" },
          headStyles: { fillColor: [30,41,59], textColor: 255, fontStyle: "bold" },
          columnStyles: { 0: { cellWidth: 120, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
        });

        doc.save(`ticket_${idTail(t._id)}.pdf`);
        return;
      }

      const html = printableHtmlTickets([t]);
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) return toast("Popup blocked: enable popups to print/save PDF", true);
      w.document.write(html);
      w.document.close();
    } catch {
      toast("Could not generate PDF", true);
    }
  };

  const columns = [
    { key: "issue", header: "Issue", render: (x) => <div className="max-w-[22rem] truncate" title={x.issueDetails}>{x.issueDetails || "—"}</div> },
    { key: "status", header: "Status", render: (x) => badge(neat(x.status), toneForStatus(x.status)) },
    { key: "hostel", header: "Hostel", render: (x) => hostelName.get(x.hostel?._id || x.hostel) || "—" },
    {
      key: "room", header: "Room",
      render: (x) => {
        if (x.room && typeof x.room === "object" && x.room._id) return roomPretty(x.room);
        if (typeof x.room === "string" && x.room) {
          const r = roomById.get(x.room);
          return r ? roomPretty(r) : `Room • ${idTail(x.room)}`;
        }
        return "—";
      },
    },
    { key: "assignee", header: "Assignee", render: (x) => assigneeText(x) },
    { key: "created", header: "Created", render: (x) => fdt(x.createdAt) },
    {
      key: "actions", header: "Actions",
      render: (x) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => downloadTicketPdf(x)} title="Download PDF">PDF</Button>
          <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => deleteTicket(x)} title="Delete ticket">Delete</Button>
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
          <Button variant="secondary" onClick={exportTicketsPDF}>Export PDF</Button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-green-500/20 px-3 py-1 text-sm text-green-300">{ok}</span>}
          {err && <span className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300">{err}</span>}
        </div>
      )}

      <Section title="All tickets">
        <DataTable columns={columns} rows={tickets} emptyText={"No tickets."} />
      </Section>

      <GlassModal open={openCreate} title="Create maintenance ticket" onClose={() => setOpenCreate(false)}>
        <form onSubmit={createTicket} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm">Hostel</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.hostel}
              onChange={(e) => setForm((f) => ({ ...f, hostel: e.target.value }))}
              required                                     // NEW
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => <option key={h._id} value={h._id}>{hostelName.get(h._id)}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">Room</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.room}
              onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
              required                                     // NEW
            >
              <option value="">Select room</option>
              {rooms.map((r) => <option key={r._id} value={r._id}>{roomPretty(r)}</option>)}
            </select>
          </label>

          <label className="md:col-span-2 block">
            <span className="mb-1 block text-sm">Issue details</span>
            <textarea
              rows="3"
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.issueDetails}
              onChange={(e) => setForm((f) => ({ ...f, issueDetails: e.target.value }))}
              required                                     // already required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">Priority</span>
            <select
              className="w-full rounded-lg bg-slate-800/70 border border-white/10 px-3 py-2 text-white"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u._id} value={u._id}>{uLabel(u)}</option>)}
            </select>
          </label>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </GlassModal>
    </AppLayout>
  );
}
