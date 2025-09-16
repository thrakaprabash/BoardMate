// src/pages/owner/OwnerBookingsList.jsx
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import Section from "../../components/Section";
import DataTable from "../../components/DataTable";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// ---------- helpers ----------
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const getArr = (res) => res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
const sid = (v) => (v == null ? "" : String(v));
const isHexId = (v) => /^[0-9a-f]{24}$/i.test(sid(v));

// schema pickers (be liberal)
const pickOwner = (o) =>
  sid(o?.owner_id) || sid(o?.ownerId) || sid(o?.hostel_owner) || sid(o?.owner);

const pickHostelId = (o) =>
  sid(
    o?.hostel_id ??
      o?.hostelId ??
      o?.hostelID ??
      o?.hostel ??
      o?.hostel_ref ??
      o?.hostelRef ??
      o?.hostelObj ??
      o?.hostel_id_ref ??
      o?.hostel_id_fk ??
      o?.hostel?.id ??
      o?.hostel?._id
  );

const pickRoomId = (o) =>
  sid(
    o?.room_id ??
      o?.roomId ??
      o?.roomID ??
      o?.room ??
      o?.room_ref ??
      o?.roomRef ??
      o?.roomObj ??
      o?.room?.id ??
      o?.room?._id
  );

const pickUserId = (o) =>
  sid(o?.user_id ?? o?.userId ?? o?.user?.id ?? o?.user?._id ?? o?.user);

// generic “list with no params”
const safeList = async (path) => {
  try {
    const res = await api.get(path);
    const arr = getArr(res);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

// small label cache (swallows 404s)
function useLabelCache(path, fields, fallbackPrefix) {
  const [map, setMap] = useState(() => new Map());
  const set = (id, label) =>
    setMap((m) => (m.get(id) === label ? m : new Map(m).set(id, label)));

  const ensure = async (id) => {
    const key = sid(id);
    if (!isHexId(key) || map.has(key)) return;
    try {
      const { data } = await api.get(`${path}/${key}`);
      const label =
        fields.map((f) => data?.[f]).find(Boolean) ||
        `${fallbackPrefix} ${key.slice(-6)}`;
      set(key, label);
    } catch {
      set(key, `${fallbackPrefix} ${key.slice(-6)}`);
    }
  };

  const primeMany = (arr, picker, namePicker) => {
    const next = new Map(map);
    for (const item of arr) {
      const id = picker(item);
      if (!isHexId(id)) continue;
      if (next.has(id)) continue;
      const label =
        (typeof namePicker === "function" ? namePicker(item) : null) ||
        `${fallbackPrefix} ${id.slice(-6)}`;
      next.set(id, label);
    }
    setMap(next);
  };

  return {
    label: (id) => map.get(sid(id)) || "—",
    ensure,
    primeMany,
    has: (id) => map.has(sid(id)),
  };
}

// ---------- component ----------
export default function OwnerBookingsList() {
  // local CSS only (dark inputs/buttons like the rest of the app)
  const LocalCss = () => (
    <style>{`
      button:empty { display:none; }
      .btn-primary { background:#111827; color:#fff; }
      .btn-primary:hover { background:#0f172a; }
      .btn-ghost  { border:1px solid rgba(255,255,255,.2); background:transparent; color:#fff; }
      .btn-ghost:hover { background:rgba(255,255,255,.08); }
    `}</style>
  );

  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const ownerId = sid(user?._id || user?.id);

  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // label caches
  const {
    label: hostelLabel,
    ensure: ensureHostel,
    primeMany: primeHostels,
  } = useLabelCache("/hostels", ["name", "hostel_name", "title"], "Hostel");

  const {
    label: roomLabel,
    ensure: ensureRoom,
    primeMany: primeRooms,
  } = useLabelCache("/rooms", ["name", "type", "label"], "Room");

  const {
    label: userLabel,
    ensure: ensureUser,
    primeMany: primeUsers,
  } = useLabelCache("/users", ["name", "fullName", "email"], "User");

  // roomId -> hostelId
  const [roomToHostel, setRoomToHostel] = useState(new Map());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, r, b] = await Promise.all([
        safeList("/hostels"),
        safeList("/rooms"),
        safeList("/bookings"),
      ]);

      setHostels(h);
      setRooms(r);
      setBookings(b);

      // prime caches
      primeHostels(h, (x) => sid(x?._id || x?.id), (x) =>
        x?.name || x?.hostel_name || x?.title
      );
      primeRooms(r, (x) => sid(x?._id || x?.id), (x) => x?.name || x?.type);
      primeUsers(b, (x) => pickUserId(x), null);

      // build room -> hostel map
      const m = new Map();
      r.forEach((room) => {
        const rid = sid(room?._id || room?.id);
        const hid = pickHostelId(room);
        if (rid && hid) m.set(rid, hid);
      });
      setRoomToHostel(m);
    } catch {
      setError("Failed to load. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, role]);

  // Fill any missing labels lazily
  useEffect(() => {
    const needHostel = new Set();
    const needRoom = new Set();
    const needUser = new Set();

    bookings.forEach((bk) => {
      const rid = pickRoomId(bk);
      const hid = pickHostelId(bk) || (rid && roomToHostel.get(rid));
      const uid = pickUserId(bk);
      if (isHexId(hid)) needHostel.add(hid);
      if (isHexId(rid)) needRoom.add(rid);
      if (isHexId(uid)) needUser.add(uid);
    });

    [...needHostel].forEach(ensureHostel);
    [...needRoom].forEach(ensureRoom);
    [...needUser].forEach(ensureUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, roomToHostel]);

  // owner-scoped rows (same logic as before)
  const scopedRows = useMemo(() => {
    if (role !== "hostel_owner" || !ownerId) return bookings;

    const myHostelIds = new Set(
      hostels.filter((h) => pickOwner(h) === ownerId).map((h) => sid(h._id))
    );
    rooms.forEach((r) => {
      if (pickOwner(r) === ownerId) {
        const hid = pickHostelId(r);
        if (hid) myHostelIds.add(hid);
      }
    });

    let filtered = bookings.filter((bk) => {
      if (pickOwner(bk) === ownerId) return true;
      const hid =
        pickHostelId(bk) || roomToHostel.get(pickRoomId(bk)) || "";
      return hid && myHostelIds.has(hid);
    });

    if (filtered.length === 0 && bookings.length > 0) filtered = bookings;

    filtered.sort((a, b) =>
      String(b.start_date || b.start || "").localeCompare(
        String(a.start_date || a.start || "")
      )
    );
    return filtered;
  }, [role, ownerId, bookings, hostels, rooms, roomToHostel]);

  useEffect(() => setRows(scopedRows), [scopedRows]);

  // render helpers that return names instead of ids
  const renderHostel = (bk) => {
    const rid = pickRoomId(bk);
    const hid = pickHostelId(bk) || (rid && roomToHostel.get(rid));
    return hid ? hostelLabel(hid) : "—";
  };
  const renderRoom = (bk) => {
    const rid = pickRoomId(bk);
    return rid ? roomLabel(rid) : "—";
  };
  const renderStudent = (bk) => {
    const uid = pickUserId(bk);
    return uid ? userLabel(uid) : "—";
  };

  return (
    <AppLayout>
      <LocalCss />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">
          {role === "hostel_owner" ? "All Bookings (My Hostels)" : "My Bookings"}
        </h2>
        <button
          onClick={load}
          className="btn-primary rounded px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6">
        <Section title="All bookings" subtitle="Newest first">
          <DataTable
            columns={[
              { key: "hostel_id", header: "Hostel", render: renderHostel },
              { key: "room_id", header: "Room", render: renderRoom },
              {
                key: "start_date",
                header: "Start",
                render: (r) => fmt(r.start_date || r.startDate || r.start),
              },
              {
                key: "end_date",
                header: "End",
                render: (r) => fmt(r.end_date || r.endDate || r.end),
              },
              { key: "status", header: "Status" },
              {
                key: "user_id",
                header: role === "hostel_owner" ? "Student" : undefined,
                render: (r) =>
                  role === "hostel_owner" ? renderStudent(r) : undefined,
              },
            ]}
            rows={rows}
            emptyText={error || (loading ? "Loading…" : "No bookings found.")}
          />
        </Section>
      </div>
    </AppLayout>
  );
}
