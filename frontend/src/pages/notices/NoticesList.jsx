// src/pages/notices/NoticesList.jsx
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext"; // <-- we use this to check role

const fdt = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const excerpt = (t, n = 100) => (t?.length > n ? t.slice(0, n) + "…" : t || "—");
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const sid = (v) => (v == null ? "" : String(v));
const isHex24 = (v) => /^[0-9a-f]{24}$/i.test(sid(v));

async function fetchNotices() {
  const variants = [
    { limit: 50, sort: "-date_posted" },
    { limit: 50, sort: "-createdAt" },
    { limit: 50 },
  ];
  for (const params of variants) {
    try {
      const res = await api.get("/notices", { params });
      return getArr(res);
    } catch {}
  }
  return [];
}

async function fetchUserName(id) {
  try {
    const res = await api.get(`/users/${id}`);
    const u = res?.data?.data ?? res?.data ?? {};
    return u.name || u.username || "";
  } catch {
    return ""; // blocked by role or not found
  }
}

export default function NoticesList() {
  const { user } = useAuth?.() || { user: null };
  const role = user?.role;
  const canResolveUsers = role === "hostel_owner" || role === "maintenance_manager";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameCache, setNameCache] = useState({}); // { [id]: "Name" | "" (failed) }

  useEffect(() => {
    (async () => {
      const data = await fetchNotices();
      setRows(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  // Resolve names only if the current role has permission
  useEffect(() => {
    if (!canResolveUsers) return;

    const pendingIds = new Set();
    for (const r of rows) {
      const pb = r?.postedBy;
      if (pb && typeof pb === "object") {
        if (pb._id && pb.name && !nameCache[pb._id]) pendingIds.add(pb._id);
        continue;
      }
      if (typeof pb === "string" && isHex24(pb) && !nameCache[pb]) {
        pendingIds.add(pb);
      }
    }
    if (pendingIds.size === 0) return;

    (async () => {
      const ids = Array.from(pendingIds);
      const chunkSize = 5;
      const next = { ...nameCache };
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const results = await Promise.allSettled(chunk.map((id) => fetchUserName(id)));
        results.forEach((res, idx) => {
          const id = chunk[idx];
          next[id] = res.status === "fulfilled" ? (res.value || "") : "";
        });
      }
      setNameCache(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, canResolveUsers]);

  // ----- helpers to mirror table rendering for "By" -----
  const postedByText = (r) => {
    const pb = r?.postedBy;

    if (pb && typeof pb === "object") return pb.name || pb.username || "Staff";

    if (typeof pb === "string") {
      if (!isHex24(pb)) return pb; // already a readable string
      if (canResolveUsers) {
        const name = nameCache[pb];
        if (name) return name;
        if (name === "") return "Staff"; // failed or not permitted by backend
        return "Resolving…";
      }
      return "Staff";
    }
    return "—";
  };

  // ----- Export to PDF -----
  const exportPdf = async () => {
    const headers = ["Title", "Summary", "Posted", "By"];
    const body = (rows || []).map((r) => [
      r.title || r.name || "—",
      excerpt(r.description, 160), // a bit longer for PDF
      fdt(r.date_posted || r.createdAt),
      postedByText(r),
    ]);

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const marginX = 40;

      // Title + meta
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Notices", marginX, 48);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const meta = `Generated on ${new Date().toLocaleString()} • ${rows.length} item(s)`;
      doc.text(meta, marginX, 66);

      autoTable(doc, {
        head: [headers],
        body,
        startY: 84,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 250, 252] },
        margin: { left: marginX, right: marginX },
        columnStyles: {
          0: { cellWidth: 160 }, // Title
          1: { cellWidth: 230 }, // Summary
          2: { cellWidth: 90 },  // Posted
          3: { cellWidth: 120 }, // By
        },
      });

      doc.save("notices.pdf");
    } catch {
      // Fallback: print-friendly window
      const esc = (s) =>
        String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Notices</title>
            <style>
              body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
              h1 { margin: 0 0 8px; font-size: 18px; }
              .muted { color: #555; margin-bottom: 16px; font-size: 12px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; vertical-align: top; }
              th { background: #111827; color: white; }
              tr:nth-child(even) td { background: #f8fafc; }
              @media print { @page { size: A4 portrait; margin: 12mm; } }
            </style>
          </head>
          <body>
            <h1>Notices</h1>
            <div class="muted">${esc(
              `Generated on ${new Date().toLocaleString()} • ${rows.length} item(s)`
            )}</div>
            <table>
              <thead>
                <tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>
              </thead>
              <tbody>
                ${(rows || [])
                  .map((r) => {
                    const t0 = esc(r.title || r.name || "—");
                    const t1 = esc(excerpt(r.description, 160));
                    const t2 = esc(fdt(r.date_posted || r.createdAt));
                    const t3 = esc(postedByText(r));
                    return `<tr><td>${t0}</td><td>${t1}</td><td>${t2}</td><td>${t3}</td></tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `;
      const w = window.open("", "_blank");
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
      } else {
        alert("Popup blocked. Please allow popups to export/print.");
      }
    }
  };

  const columns = useMemo(
    () => [
      { key: "title", header: "Title" },
      { key: "description", header: "Summary", render: (r) => excerpt(r.description, 100) },
      { key: "date_posted", header: "Posted", render: (r) => fdt(r.date_posted || r.createdAt) },
      {
        key: "postedBy",
        header: "By",
        render: (r) => postedByText(r),
      },
    ],
    [nameCache, canResolveUsers]
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Notices</h2>
        <button
          onClick={exportPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
          title="Export PDF"
        >
          📄 <span className="hidden sm:inline">Export PDF</span>
        </button>
      </div>

      <div className="mt-6">
        <Section title="Latest announcements">
          <DataTable
            columns={columns}
            rows={rows}
            emptyText={loading ? "Loading…" : "No notices found."}
          />
        </Section>
      </div>
    </AppLayout>
  );
}
