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

  const columns = useMemo(
    () => [
      { key: "title", header: "Title" },
      { key: "description", header: "Summary", render: (r) => excerpt(r.description, 100) },
      { key: "date_posted", header: "Posted", render: (r) => fdt(r.date_posted || r.createdAt) },
      {
        key: "postedBy",
        header: "By",
        render: (r) => {
          const pb = r?.postedBy;

          // If backend already populated object { _id, name }
          if (pb && typeof pb === "object") return pb.name || pb.username || "Staff";

          // If raw string:
          if (typeof pb === "string") {
            // If not a MongoId, it might already be a name-like string
            if (!isHex24(pb)) return pb;

            // If we CAN resolve (owner/maintenance), use cache or show a short placeholder
            if (canResolveUsers) {
              const name = nameCache[pb];
              if (name) return name;
              if (name === "") return "Staff"; // resolution failed due to perms
              // still loading a permitted lookup
              return "Resolving…";
            }

            // If we CAN'T resolve (e.g., student), never show ObjectId
            return "Staff";
          }
          return "—";
        },
      },
    ],
    [nameCache, canResolveUsers]
  );

  return (
    <AppLayout>
      <h2 className="text-2xl font-semibold">Notices</h2>
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
