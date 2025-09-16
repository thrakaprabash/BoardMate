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
const fmtAmt = (n) => (n == null ? "--" : `LKR ${Number(n).toLocaleString()}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "--");

const pickDate = (r) => r?.date || r?.createdAt || r?.paid_at || r?.timestamp;
const pickOwner = (r) =>
  r?.owner || r?.owner_id || r?.hostel_owner || r?.ownerId || r?.ownerID;

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

  const totals = useMemo(() => {
    const t = filteredRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { count: filteredRows.length, amount: t };
  }, [filteredRows]);

  const exportCSV = () => {
    const header = ["date", "amount", "method", "status", "booking", "user"];
    const data = filteredRows.map((r) => [
      (pickDate(r) || "").slice(0, 10),
      r.amount ?? "",
      r.method ?? "",
      r.status ?? "",
      bookingLabel(r.booking_id),
      userLabel(r.user_id),
    ]);
    const csv = [header, ...data].map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owner_payments_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div>{totals.count} records • {fmtAmt(totals.amount)}</div>
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
              { key: "amount", header: "Amount", render: (r) => fmtAmt(r.amount) },
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
