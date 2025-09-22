import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import api from "../../services/api";

// Helpers
const getArr = (res) => res?.data?.items ?? res?.data?.data ?? res?.data ?? [];
const fdt = (d) => (d ? new Date(d).toLocaleString() : "—");

// Simple glass modal used for create/edit
function GlassModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function Technicians() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [activeF, setActiveF] = useState("all"); // "all" | "true" | "false"

  // create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [cForm, setCForm] = useState({
    name: "",
    email: "",
    phone: "",
    skills: "",
    active: true,
  });

  // edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [eForm, setEForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    skills: "",
    active: true,
  });

  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m);
    setErr(isErr ? m : "");
    window.clearTimeout((toast)._t);
    (toast)._t = window.setTimeout(() => {
      setOk("");
      setErr("");
    }, 2200);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(activeF !== "all" ? { active: activeF } : {}),
      };
      const res = await api.get("/technicians", { params });
      setItems(getArr(res));
    } catch (e) {
      toast(e?.response?.data?.message || "Failed to load technicians", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: cForm.name.trim(),
        email: cForm.email.trim() || undefined,
        phone: cForm.phone.trim() || undefined,
        skills: cForm.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        active: !!cForm.active,
      };
      const res = await api.post("/technicians", payload);
      const doc = res?.data?.data ?? res?.data;
      setItems((prev) => [doc, ...prev]);
      setOpenCreate(false);
      setCForm({ name: "", email: "", phone: "", skills: "", active: true });
      toast("Technician created");
    } catch (e2) {
      toast(e2?.response?.data?.message || "Create failed", true);
    }
  };

  const openEditModal = (row) => {
    setEForm({
      id: row._id,
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      skills: Array.isArray(row.skills) ? row.skills.join(", ") : "",
      active: !!row.active,
    });
    setOpenEdit(true);
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: eForm.name.trim(),
        email: eForm.email.trim() || undefined,
        phone: eForm.phone.trim() || undefined,
        skills: eForm.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        active: !!eForm.active,
      };
      const res = await api.patch(`/technicians/${eForm.id}`, payload);
      const upd = res?.data?.data ?? res?.data;
      setItems((prev) => prev.map((it) => (it._id === eForm.id ? upd : it)));
      setOpenEdit(false);
      toast("Technician updated");
    } catch (e2) {
      toast(e2?.response?.data?.message || "Update failed", true);
    }
  };

  const toggleActive = async (row) => {
    try {
      const res = await api.patch(`/technicians/${row._id}`, { active: !row.active });
      const upd = res?.data?.data ?? res?.data;
      setItems((prev) => prev.map((it) => (it._id === row._id ? upd : it)));
      toast(upd.active ? "Activated" : "Deactivated");
    } catch (e) {
      toast(e?.response?.data?.message || "Toggle failed", true);
    }
  };

  const onDelete = async (row) => {
    const yes = window.confirm(`Delete ${row.name || "technician"}? This cannot be undone.`);
    if (!yes) return;
    const prev = items;
    setItems(prev.filter((it) => it._id !== row._id));
    try {
      await api.delete(`/technicians/${row._id}`);
      toast("Deleted");
    } catch (e) {
      setItems(prev);
      toast(e?.response?.data?.message || "Delete failed", true);
    }
  };

  // ---------- Table columns ----------
  const columns = useMemo(
    () => [
      { key: "name", header: "Name", render: (x) => x.name || "—" },
      { key: "email", header: "Email", render: (x) => x.email || "—" },
      { key: "phone", header: "Phone", render: (x) => x.phone || "—" },
      {
        key: "skills",
        header: "Skills",
        render: (x) =>
          Array.isArray(x.skills) && x.skills.length ? x.skills.join(", ") : "—",
      },
      {
        key: "active",
        header: "Active",
        render: (x) =>
          x.active ? (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
              Yes
            </span>
          ) : (
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white">
              No
            </span>
          ),
      },
      { key: "created", header: "Created", render: (x) => fdt(x.createdAt) },
      {
        key: "actions",
        header: "Actions",
        render: (x) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => openEditModal(x)}
            >
              Edit
            </Button>
            <Button
              variant="subtle"
              className="px-2 py-1 text-xs"
              onClick={() => toggleActive(x)}
            >
              {x.active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              variant="danger"
              className="px-2 py-1 text-xs"
              onClick={() => onDelete(x)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  // ---------- Export helpers ----------
  const exportHeaders = ["Name", "Email", "Phone", "Skills", "Active", "Created"];
  const toRow = (x) => [
    x?.name ?? "",
    x?.email ?? "",
    x?.phone ?? "",
    Array.isArray(x?.skills) ? x.skills.join(", ") : "",
    x?.active ? "Yes" : "No",
    fdt(x?.createdAt),
  ];
  const filteredRows = items.map(toRow); // export what's loaded

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onExportCSV = () => {
    const lines = [
      exportHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...filteredRows.map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ];
    const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), "technicians.csv");
  };

  // Dynamic import version so autoTable is always defined regardless of bundler
  const onExportPDF = async () => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });

      const title = "Technicians";
      doc.setFontSize(16);
      doc.text(title, 40, 40);

      const filterNote = `Filters — Search: "${search || "-"}", Active: ${activeF}`;
      doc.setFontSize(10);
      doc.text(filterNote, 40, 58);

      autoTable(doc, {
        startY: 75,
        head: [exportHeaders],
        body: filteredRows,
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        headStyles: { fillColor: [33, 150, 243] },
        columnStyles: {
          0: { cellWidth: 180 }, // Name
          1: { cellWidth: 220 }, // Email
          2: { cellWidth: 120 }, // Phone
          3: { cellWidth: 240 }, // Skills
          4: { cellWidth: 80 },  // Active
          5: { cellWidth: 180 }, // Created
        },
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          const pageSize = doc.internal.pageSize;
          const pageWidth = pageSize.getWidth();
          const pageHeight = pageSize.getHeight();
          doc.setFontSize(9);
          doc.text(`Generated ${new Date().toLocaleString()}`, 40, pageHeight - 20);
          doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 60, pageHeight - 20, {
            align: "right",
          });
        },
      });

      doc.save("technicians.pdf");
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("PDF export failed. See console for details.");
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Technicians</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={onExportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" type="button" onClick={onExportPDF}>
            Export PDF
          </Button>
          <Button onClick={() => setOpenCreate(true)}>New technician</Button>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && (
            <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">
              {ok}
            </span>
          )}
          {err && (
            <span className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">
              {err}
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mt-6 grid items-end gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-white backdrop-blur sm:grid-cols-3"
      >
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-sm">Search</span>
          <input
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/70"
            placeholder="Name, email, phone, skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Active</span>
          <select
            className="dark-native rounded border border-white/20 px-3 py-2"
            value={activeF}
            onChange={(e) => setActiveF(e.target.value)}
          >
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit">Apply</Button>
        </div>
      </form>

      <div className="mt-6">
        <Section title="All technicians">
          <DataTable
            columns={columns}
            rows={items}
            emptyText={loading ? "Loading…" : "No technicians."}
          />
        </Section>
      </div>

      {/* Create */}
      <GlassModal open={openCreate} title="New technician" onClose={() => setOpenCreate(false)}>
        <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 block">
            <span className="mb-1 block text-sm">Name</span>
            <input
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={cForm.name}
              onChange={(e) => setCForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Email</span>
            <input
              type="email"
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={cForm.email}
              onChange={(e) => setCForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Phone</span>
            <input
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={cForm.phone}
              onChange={(e) => setCForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="md:col-span-2 block">
            <span className="mb-1 block text-sm">Skills (comma separated)</span>
            <input
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              placeholder="Plumbing, Electrical, HVAC"
              value={cForm.skills}
              onChange={(e) => setCForm((f) => ({ ...f, skills: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={cForm.active}
              onChange={(e) => setCForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span className="text-sm">Active</span>
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </GlassModal>

      {/* Edit */}
      <GlassModal open={openEdit} title="Edit technician" onClose={() => setOpenEdit(false)}>
        <form onSubmit={onUpdate} className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 block">
            <span className="mb-1 block text-sm">Name</span>
            <input
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={eForm.name}
              onChange={(e) => setEForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Email</span>
            <input
              type="email"
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={eForm.email}
              onChange={(e) => setEForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Phone</span>
            <input
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={eForm.phone}
              onChange={(e) => setEForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="md:col-span-2 block">
            <span className="mb-1 block text-sm">Skills (comma separated)</span>
            <input
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              value={eForm.skills}
              onChange={(e) => setEForm((f) => ({ ...f, skills: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={eForm.active}
              onChange={(e) => setEForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span className="text-sm">Active</span>
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setOpenEdit(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </GlassModal>
    </AppLayout>
  );
}
