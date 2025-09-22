// src/pages/owner/OwnerPaymentsList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// ---------- helpers ----------
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const ymdLocal = (d) => {
  const dt = new Date(d); const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const startOfMonthLocal = () => {
  const n = new Date(); return ymdLocal(new Date(n.getFullYear(), n.getMonth(), 1));
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "--");
const pickDate = (r) => r?.date || r?.createdAt || r?.paid_at || r?.timestamp;
const pickOwner = (r) =>
  r?.owner || r?.owner_id || r?.hostel_owner || r?.ownerId || r?.ownerID;

// --- refund-aware amount helpers ---
const unicodeMinus = /\u2212/g; // handle “−”
const looksRefund = (r = {}) => {
  const s = `${r.status ?? ""} ${r.type ?? ""} ${r.method ?? ""}`.toLowerCase();
  return s.includes("refund") || s.includes("chargeback");
};
const parseAmount = (raw, row) => {
  if (raw == null) return 0;
  const s = String(raw)
    .replace(/lkr/gi, "")
    .replace(unicodeMinus, "-")
    .replace(/[,\s]/g, "");
  let n = parseFloat(s);
  if (!isFinite(n)) n = 0;
  if (looksRefund(row) && n > 0) n = -n; // flip to negative for refunds
  return n;
};
const fmtAmtSigned = (n) => {
  const v = Number(n || 0);
  const sign = v < 0 ? "-" : "";
  return `${sign}LKR ${Math.abs(v).toLocaleString()}`;
};

function useLabelCache(path, picks) {
  const [map, setMap] = useState({});
  const ensure = async (id) => {
    if (!id || map[id]) return;
    const fallback = `${path.replace(/\//g, "").toUpperCase()} ${String(id).slice(-6)}`;
    try {
      const { data } = await api.get(`${path}/${id}`);
      const label = picks.map((k) => data?.[k]).find(Boolean) || fallback;
      setMap((m) => ({ ...m, [id]: label }));
    } catch {
      setMap((m) => ({ ...m, [id]: fallback }));
    }
  };
  return { label: (id) => map[id] || "—", ensure };
}

function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();
  const cls =
    v === "paid" || v === "completed" || v === "success"
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : v === "pending"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : v === "refunded"
      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
      : v === "failed" || v === "cancelled"
      ? "bg-red-500/20 text-red-300 border-red-500/30"
      : "bg-gray-500/20 text-gray-300 border-gray-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize ${cls}`}>
      {value || "—"}
    </span>
  );
}

function MethodBadge({ value }) {
  const v = String(value || "").toLowerCase();
  const cls =
    v === "cash"    ? "bg-stone-500/20 text-stone-200 border-stone-500/30"
    : v === "bank"  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
    : v === "card"  ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
    : v === "payout"? "bg-purple-500/20 text-purple-300 border-purple-500/30"
    : "bg-gray-500/20 text-gray-300 border-gray-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize ${cls}`}>
      {value || "—"}
    </span>
  );
}

// --- export helpers ---
const makeCsv = (rows, headers) => {
  const esc = (v) => {
    const s = String(v ?? "");
    const needs = /[",\n]/.test(s);
    const inner = s.replace(/"/g, '""');
    return needs ? `"${inner}"` : inner;
  };
  const head = headers.map((h) => esc(h.header)).join(",");
  const body = rows.map((r) => headers.map((h) => esc(h.value(r))).join(",")).join("\n");
  return head + "\n" + body;
};

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const openPrintHtml = (title, tableHtml, note = "") => {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${title}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; padding: 24px; }
        h1 { font-size: 20px; margin: 0 0 12px; }
        .meta { color:#555; font-size: 12px; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f3f4f6; text-align: left; }
        tfoot td { font-weight: 600; }
        .note { margin-top: 12px; color:#666; font-size: 11px; }
        .neg { color: #b91c1c; }
        @media print { a { display: none; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generated on ${new Date().toLocaleString()}</div>
      ${tableHtml}
      ${note ? `<div class="note">${note}</div>` : ""}
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
};

export default function OwnerPaymentsList() {
  const { user } = useAuth();
  const ownerId = user?._id || user?.id;

  const [from, setFrom] = useState(startOfMonthLocal());
  const [to, setTo] = useState(ymdLocal(new Date()));
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [usedEndpoint, setUsedEndpoint] = useState("");
  const [usedParams, setUsedParams] = useState(null);
  const reqSeq = useRef(0);

  const toast = (m, isErr = false) => {
    setOk(isErr ? "" : m); setErr(isErr ? m : "");
    setTimeout(() => { setOk(""); setErr(""); }, 2200);
  };

  const { label: bookingLabel, ensure: ensureBooking } = useLabelCache("/bookings", ["label", "title"]);
  const { label: userLabel, ensure: ensureUser } = useLabelCache("/users", ["name", "fullName", "email"]);

  // tolerant loader (unchanged)
  const tolerantLoad = async () => {
    if (!from || !to || from > to) { toast("Invalid date range", true); return []; }
    const endPoints = ["/finance", "/finances", "/payments", "/transactions", "/owner/finance", "/owner/payments"];
    const baseVariants = [{ limit: 1000, sort: "-date" }, { limit: 1000 }, {}];
    const dateVariants = [{ from, to }, { date_from: from, date_to: to }, { start: from, end: to }, {}];
    const ownerVariants = [ownerId ? { owner: ownerId } : {}, ownerId ? { owner_id: ownerId } : {}, ownerId ? { hostel_owner: ownerId } : {}, {}];
    const methodVariants = method === "all" ? [{}] : [{ method }, { payment_method: method }];
    const statusVariants = status === "all" ? [{}] : [{ status }, { payment_status: status }];
    for (const ep of endPoints) {
      for (const base of baseVariants) {
        for (const dv of dateVariants) {
          for (const ov of ownerVariants) {
            for (const mv of methodVariants) {
              for (const sv of statusVariants) {
                try {
                  const params = { ...base, ...dv, ...ov, ...mv, ...sv };
                  const res = await api.get(ep, { params });
                  const arr = getArr(res);
                  if (Array.isArray(arr)) { setUsedEndpoint(ep); setUsedParams(params); return arr; }
                } catch {}
              }
            }
          }
        }
      }
    }
    return [];
  };

  const load = async () => {
    const mySeq = ++reqSeq.current;
    setLoading(true);
    try {
      const data = await tolerantLoad();
      if (mySeq !== reqSeq.current) return;
      setRows(Array.isArray(data) ? data : []);
      const bookings = Array.from(new Set((data || []).map((x) => x.booking_id).filter(Boolean)));
      const users = Array.from(new Set((data || []).map((x) => x.user_id).filter(Boolean)));
      bookings.forEach(ensureBooking); users.forEach(ensureUser);
      if (!data?.length) toast("No payments found", false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load payments";
      toast(msg, true); setRows([]);
    } finally {
      if (mySeq === reqSeq.current) setLoading(false);
    }
  };

  useEffect(() => { if (ownerId) load(); }, [ownerId]); // eslint-disable-line

  const apply = (e) => { e?.preventDefault?.(); load(); };

  const filteredRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    const fromTs = new Date(from + "T00:00:00").getTime();
    const toTs = new Date(to + "T23:59:59.999").getTime();
    const mth = method.toLowerCase();
    const st = status.toLowerCase();

    return rows.filter((r) => {
      const d = pickDate(r);
      const t = d ? new Date(d).getTime() : NaN;
      if (!Number.isNaN(fromTs) && !Number.isNaN(toTs)) {
        if (Number.isNaN(t) || t < fromTs || t > toTs) return false;
      }
      if (mth !== "all" && String(r.method || "").toLowerCase() !== mth) return false;
      if (st !== "all" && String(r.status || "").toLowerCase() !== st) return false;
      const o = String(pickOwner(r) || "");
      if (ownerId && o && o !== String(ownerId)) return false;
      return true;
    });
  }, [rows, from, to, method, status, ownerId]);

  // --- refund-aware totals ---
  const totals = useMemo(() => {
    const t = filteredRows.reduce((s, r) => s + parseAmount(r.amount, r), 0);
    return { count: filteredRows.length, amount: t };
  }, [filteredRows]);

  // --- Export: CSV (signed numeric amount) ---
  const exportCSV = () => {
    const headers = [
      { header: "date",   value: (r) => (pickDate(r) || "").slice(0, 10) },
      { header: "amount", value: (r) => parseAmount(r.amount, r) }, // signed
      { header: "method", value: (r) => r.method ?? "" },
      { header: "status", value: (r) => r.status ?? "" },
      { header: "booking", value: (r) => bookingLabel(r.booking_id) },
      { header: "user", value: (r) => userLabel(r.user_id) },
    ];
    const csv = makeCsv(filteredRows, headers);
    downloadBlob("\ufeff" + csv, `owner_payments_${from}_to_${to}.csv`, "text/csv;charset=utf-8;");
  };

  // --- Export: PDF / Printable view ---
  const exportPDF = () => {
    const headers = [
      { header: "Date",   value: (r) => (pickDate(r) ? fmtDate(pickDate(r)) : "") },
      { header: "Amount", value: (r) => fmtAmtSigned(parseAmount(r.amount, r)) },
      { header: "Method", value: (r) => r.method ?? "" },
      { header: "Status", value: (r) => r.status ?? "" },
      { header: "Booking", value: (r) => bookingLabel(r.booking_id) },
      { header: "User", value: (r) => userLabel(r.user_id) },
    ];
    const thead = `<tr>${headers.map((h) => `<th>${h.header}</th>`).join("")}</tr>`;
    const tbody = filteredRows.map((r) => {
      const amt = parseAmount(r.amount, r);
      return `<tr>${headers.map((h) => {
        const val = String(h.value(r) ?? "");
        const isAmt = h.header === "Amount";
        return `<td${isAmt && amt < 0 ? ' class="neg"' : ""}>${val}</td>`;
      }).join("")}</tr>`;
    }).join("");
    const total = totals.amount;
    const tfoot = `<tr>${[
      `<td colspan="1"><strong>Total</strong></td>`,
      `<td${total < 0 ? ' class="neg"' : ""}><strong>${fmtAmtSigned(total)}</strong></td>`,
      ...Array(Math.max(0, headers.length - 2)).fill("<td></td>"),
    ].join("")}</tr>`;
    const tableHtml = `<table><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>`;
    openPrintHtml("Owner Payments & Payouts", tableHtml, "Tip: In the print dialog, choose “Save as PDF”.");
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Payments &amp; Payouts</h2>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <button
            onClick={exportCSV}
            className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-white hover:bg-white/20"
          >
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-white hover:bg-white/20"
            title="Open printable view (Save as PDF)"
          >
            Export PDF
          </button>
          <div>{totals.count} records • {fmtAmtSigned(totals.amount)}</div>
        </div>
      </div>

      {(ok || err) && (
        <div className="mt-3">
          {ok && <span className="rounded bg-green-500/20 px-3 py-1 text-sm text-green-300">{ok}</span>}
          {err && <span className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300">{err}</span>}
        </div>
      )}

      {/* Filters */}
      <form onSubmit={apply} className="mt-6 grid gap-3 md:grid-cols-5 text-white">
        <div className="grid gap-1">
          <label className="text-sm">From</label>
          <input
            type="date"
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">To</label>
          <input
            type="date"
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Method</label>
          <select
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option className="bg-gray-900 text-white" value="all">All</option>
            <option className="bg-gray-900 text-white" value="cash">Cash</option>
            <option className="bg-gray-900 text-white" value="bank">Bank</option>
            <option className="bg-gray-900 text-white" value="card">Card</option>
            <option className="bg-gray-900 text-white" value="payout">Payouts</option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Status</label>
          <select
            className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option className="bg-gray-900 text-white" value="all">All</option>
            <option className="bg-gray-900 text-white" value="paid">Paid</option>
            <option className="bg-gray-900 text-white" value="pending">Pending</option>
            <option className="bg-gray-900 text-white" value="refunded">Refunded</option>
          </select>
        </div>

        <div className="grid items-end">
          <button className="rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/30">
            Apply
          </button>
        </div>
      </form>

      {usedEndpoint && (
        <div className="mt-3 text-xs text-gray-400">
          Source:&nbsp;
          <code className="rounded bg-black/40 px-1 py-0.5 border border-white/10">{usedEndpoint}</code>
          {usedParams && (
            <>
              &nbsp;with params&nbsp;
              <code className="rounded bg-black/40 px-1 py-0.5 border border-white/10">{JSON.stringify(usedParams)}</code>
              &nbsp;(client-side filters applied)
            </>
          )}
        </div>
      )}

      <div className="mt-6">
        <Section title="Payments list" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "date", header: "Date", render: (r) => fmtDate(pickDate(r)) },
              {
                key: "amount",
                header: "Amount",
                render: (r) => {
                  const v = parseAmount(r.amount, r);
                  return (
                    <span className={v < 0 ? "text-red-400" : ""}>
                      {fmtAmtSigned(v)}
                    </span>
                  );
                },
              },
              { key: "method", header: "Method", render: (r) => <MethodBadge value={r.method} /> },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "booking_id", header: "Booking", render: (r) => bookingLabel(r.booking_id) },
              { key: "user_id", header: "User", render: (r) => userLabel(r.user_id) },
            ]}
            rows={filteredRows}
            emptyText={loading ? "Loading…" : "No payments found."}
          />
        </Section>
      </div>
    </AppLayout>
  );
}
