"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API || "/api";
const BANGLA_DIGITS = (s) => String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const PHASES = [
  "বেসিক টু এডভান্স", "ফাইনাল রিভিশন", "কুইক রিভিশন", "মডেল টেস্ট",
];
// Same four keys, order and labels the dashboard renders as resource cards.
const RESOURCE_FIELDS = [
  { key: "live_class_link", icon: "🎥", label: "ক্লাস করি", hint: "লাইভ বা রেকর্ডেড ক্লাসের লিংক" },
  { key: "exam_link", icon: "📝", label: "পরীক্ষা দেই", hint: "আজকের পরীক্ষার লিংক" },
  { key: "question_bank_link", icon: "📚", label: "প্রশ্ন সলভ করি", hint: "প্রশ্ন ব্যাংক / অনুশীলনের লিংক" },
  { key: "book_link", icon: "📖", label: "বই পড়ি", hint: "বই বা PDF-এর লিংক" },
];
const linkCount = (r) => RESOURCE_FIELDS.filter((f) => r[f.key]).length;

/** Flatten a DRF error body into one readable line. */
const errText = (data, fallback = "সেভ ব্যর্থ হয়েছে") => {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  const parts = Object.entries(data).map(
    ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
  );
  return parts.join(" · ") || fallback;
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [tab, setTab] = useState("overview");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // restore token
  useEffect(() => {
    const t = localStorage.getItem("aap_admin_token");
    const u = localStorage.getItem("aap_admin_user");
    if (t && u) { setToken(t); setUsername(u); }
  }, []);

  const doLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErr("");
    try {
      const res = await fetch(`${API}/admin/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "লগইন ব্যর্থ");
      setToken(data.token);
      setUsername(data.username);
      localStorage.setItem("aap_admin_token", data.token);
      localStorage.setItem("aap_admin_user", data.username);
    } catch (err) {
      setLoginErr(err.message);
    }
    setLoginLoading(false);
  };

  const doLogout = () => {
    setToken("");
    setUsername("");
    localStorage.removeItem("aap_admin_token");
    localStorage.removeItem("aap_admin_user");
  };

  const authFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (res.status === 401) { doLogout(); throw new Error("সেশন মেয়াদোত্তীর্ণ"); }
    return res;
  }, [token]);

  // ===== Login screen =====
  if (!token) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <div className="al-ic">🛡️</div>
          <h2>অ্যাডমিন প্যানেল</h2>
          <p className="sub">নার্সিং পাঠশালা — প্রশাসনিক নিয়ন্ত্রণ</p>
          <form onSubmit={doLogin}>
            <input className="input" placeholder="ইউজারনেম" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required />
            <input className="input" type="password" placeholder="পাসওয়ার্ড" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
            {loginErr && <div className="err">{loginErr}</div>}
            <button type="submit" className="btn btn-primary" disabled={loginLoading}>
              {loginLoading ? "লগইন হচ্ছে..." : "🔐 লগইন করুন"}
            </button>
          </form>
          <a href="/" style={{ display: "inline-block", marginTop: 18, color: "var(--muted)", fontSize: 13 }}>← হোমপেজে ফিরুন</a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Mobile top bar */}
      <div className="admin-mobile-bar">
        <button className="admin-burger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="মেনু">
          <span></span><span></span><span></span>
        </button>
        <span className="admin-mobile-title">🛡️ নার্সিং পাঠশালা অ্যাডমিন</span>
      </div>
      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="admin-shell">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="as-brand">
            <div className="brand"><span className="brand-badge">ন</span> নার্সিং পাঠশালা</div>
            <div className="role">👋 {username}</div>
          </div>
          <nav className="as-nav">
            {[
              { k: "overview", ic: "📊", label: "ওভারভিউ" },
              { k: "students", ic: "👥", label: "শিক্ষার্থী" },
              { k: "routine", ic: "📋", label: "রুটিন" },
              { k: "resources", ic: "🔗", label: "রিসোর্স লিংক" },
            ].map((t) => (
              <button key={t.k} className={`as-item ${tab === t.k ? "active" : ""}`} onClick={() => { setTab(t.k); setSidebarOpen(false); }}>
                <span className="ic">{t.ic}</span> {t.label}
              </button>
            ))}
          </nav>
          <button className="as-logout" onClick={doLogout}>🚪 লগআউট</button>
        </aside>

        {/* Main */}
        <main className="admin-main">
          {tab === "overview" && <OverviewTab authFetch={authFetch} />}
          {tab === "students" && <StudentsTab authFetch={authFetch} />}
          {tab === "routine" && <RoutineTab authFetch={authFetch} />}
          {tab === "resources" && <ResourcesTab authFetch={authFetch} />}
        </main>
      </div>
    </div>
  );
}

/* ===== Overview Tab ===== */
function OverviewTab({ authFetch }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authFetch("/admin/stats/").then((r) => r.json()).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [authFetch]);

  if (loading) return <div className="admin-empty"><div className="em-ic">⏳</div><p>লোড হচ্ছে...</p></div>;
  if (!stats) return <div className="admin-empty"><div className="em-ic">⚠️</div><p>ডাটা লোড ব্যর্থ</p></div>;

  return (
    <>
      <div className="admin-header">
        <div><h1>📊 ওভারভিউ</h1><p>সম্পূর্ণ সিস্টেমের পরিসংখ্যান</p></div>
      </div>
      <div className="admin-stats">
        <div className="astat"><div className="ai" style={{ background: "var(--green-light)" }}>👥</div><b>{BANGLA_DIGITS(stats.total_students)}</b><span>মোট শিক্ষার্থী</span></div>
        <div className="astat"><div className="ai" style={{ background: "var(--blue-light)" }}>📋</div><b>{BANGLA_DIGITS(stats.total_routines)}</b><span>মোট রুটিন</span></div>
        <div className="astat"><div className="ai" style={{ background: "var(--purple-light)" }}>✅</div><b>{BANGLA_DIGITS(stats.total_completions)}</b><span>মোট কমপ্লিশন</span></div>
        <div className="astat"><div className="ai" style={{ background: "var(--red-light)" }}>📈</div><b>{BANGLA_DIGITS(stats.total_students ? Math.round(stats.total_completions / stats.total_students) : 0)}</b><span>গড় কমপ্লিশন/শিক্ষার্থী</span></div>
      </div>

      <div className="admin-table-card" style={{ marginBottom: 24 }}>
        <div className="admin-table-head"><h3>🔄 সাম্প্রতিক শিক্ষার্থী</h3></div>
        <table className="admin-table">
          <thead><tr><th>নাম</th><th>মোবাইল</th><th>বর্তমান দিন</th><th>সম্পন্ন</th><th>যোগ দিয়েছে</th></tr></thead>
          <tbody>
            {stats.recent_students.map((s) => (
              <tr key={s.id}>
                <td><span className="avatar-sm">{s.name.charAt(0)}</span>{s.name}</td>
                <td>{s.mobile}</td>
                <td>Day-{BANGLA_DIGITS(s.current_day)}</td>
                <td>{BANGLA_DIGITS(s.completed_days)}</td>
                <td>{new Date(s.started_at).toLocaleDateString("bn-BD")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-head"><h3>📚 ফেজ ব্রেকডাউন</h3></div>
        <table className="admin-table">
          <thead><tr><th>ফেজ</th><th>দিন সংখ্যা</th><th>রুটিন সংখ্যা</th></tr></thead>
          <tbody>
            {stats.phases.map((p) => (
              <tr key={p.key}>
                <td><span className="phase-pill" style={{ background: p.color }}>{p.label}</span></td>
                <td>{BANGLA_DIGITS(p.days)}</td>
                <td>{BANGLA_DIGITS(p.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ===== Students Tab ===== */
function StudentsTab({ authFetch }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback((q = "") => {
    setLoading(true);
    authFetch(`/admin/students/${q ? `?search=${encodeURIComponent(q)}` : ""}`).then((r) => r.json()).then((d) => setStudents(d.students || [])).finally(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm("এই শিক্ষার্থী মুছে ফেলতে চান?")) return;
    await authFetch("/admin/students/", { method: "DELETE", body: JSON.stringify({ id }) });
    load(search);
  };

  const downloadCSV = () => {
    const headers = ["নাম", "মোবাইল", "বর্তমান দিন", "সম্পন্ন দিন", "প্রগ্রেস (%)", "যোগ দিয়েছে"];
    const rows = students.map((s) => [
      s.name,
      s.mobile,
      s.current_day,
      s.completed_days,
      s.progress_pct,
      new Date(s.started_at).toLocaleDateString("en-CA"),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="admin-header">
        <div><h1>👥 শিক্ষার্থী ম্যানেজমেন্ট</h1><p>মোট {BANGLA_DIGITS(students.length)} জন শিক্ষার্থী</p></div>
        <button className="btn btn-soft btn-sm" onClick={downloadCSV} disabled={students.length === 0}>⬇️ CSV ডাউনলোড</button>
      </div>
      <div className="admin-table-card">
        <div className="admin-table-head">
          <h3>শিক্ষার্থী তালিকা</h3>
          <input className="admin-search" placeholder="🔍 নাম বা মোবাইল খুঁজুন..." value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} />
        </div>
        {loading ? <div className="admin-empty"><div className="em-ic">⏳</div></div> : students.length === 0 ? <div className="admin-empty"><div className="em-ic">📭</div><p>কোনো শিক্ষার্থী নেই</p></div> : (
          <table className="admin-table">
            <thead><tr><th>নাম</th><th>মোবাইল</th><th>দিন</th><th>সম্পন্ন</th><th>প্রগ্রেস</th><th>যোগ দিয়েছে</th><th>অ্যাকশন</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td><span className="avatar-sm">{s.name.charAt(0)}</span>{s.name}</td>
                  <td>{s.mobile}</td>
                  <td>Day-{BANGLA_DIGITS(s.current_day)}</td>
                  <td>{BANGLA_DIGITS(s.completed_days)}</td>
                  <td><span className="pct-bar"><span style={{ width: `${s.progress_pct}%` }} /></span>{BANGLA_DIGITS(s.progress_pct)}%</td>
                  <td>{new Date(s.started_at).toLocaleDateString("bn-BD")}</td>
                  <td>
                    <button className="action-btn" onClick={() => setSelected(s)}>👁️ দেখুন</button>
                    <button className="action-btn del" onClick={() => del(s.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && <StudentDetailModal student={selected} authFetch={authFetch} onClose={() => setSelected(null)} />}
    </>
  );
}

function StudentDetailModal({ student, authFetch, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    authFetch(`/admin/student/${student.id}/progress/`).then((r) => r.json()).then(setData).catch(() => {});
  }, [student.id, authFetch]);

  return (
    <div className="admin-modal" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>👤 {student.name} — প্রোগ্রেস বিস্তারিত</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>মোবাইল: {student.mobile} • Day-{BANGLA_DIGITS(student.current_day)}</p>
        {!data ? <div className="admin-empty"><div className="em-ic">⏳</div></div> : (
          <table className="admin-table">
            <thead><tr><th>দিন</th><th>স্ট্যাটাস</th><th>আপডেট হয়েছে</th></tr></thead>
            <tbody>
              {data.progress.map((p) => (
                <tr key={p.day_number}>
                  <td className="day-cell">Day-{BANGLA_DIGITS(p.day_number)}</td>
                  <td>{p.completed ? <span className="st-done">✓ সম্পন্ন</span> : <span className="st-pending">○ বাকি</span>}</td>
                  <td>{new Date(p.updated_at).toLocaleString("bn-BD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={onClose}>বন্ধ করুন</button>
      </div>
    </div>
  );
}

/* ===== Routine Tab ===== */
function RoutineTab({ authFetch }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/admin/routine/").then((r) => r.json()).then((d) => setRoutines(d.routines || [])).finally(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm("এই রুটিন মুছে ফেলতে চান?")) return;
    await authFetch(`/admin/routine/${id}/`, { method: "DELETE" });
    load();
  };

  return (
    <>
      <div className="admin-header">
        <div><h1>📋 রুটিন ম্যানেজমেন্ট</h1><p>১৫০ দিনের রুটিন যোগ/সম্পাদনা/মুছুন</p></div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ নতুন রুটিন</button>
      </div>
      <div className="admin-table-card">
        {loading ? <div className="admin-empty"><div className="em-ic">⏳</div></div> : (
          <table className="admin-table">
            <thead><tr><th>দিন</th><th>ফেজ</th><th>সাবজেক্ট</th><th>লেকচার</th><th>টপিক</th><th>অ্যাকশন</th></tr></thead>
            <tbody>
              {routines.map((r) => (
                <tr key={r.id}>
                  <td className="day-cell">Day-{BANGLA_DIGITS(r.day_number)}</td>
                  <td><span className="phase-pill" style={{ background: "var(--muted-2)" }}>{r.phase}</span></td>
                  <td>{r.subject || "—"}</td>
                  <td>{r.lecture || "—"}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.bsc_topic || r.diploma_topic || "—"}</td>
                  <td>
                    <button className="action-btn" onClick={() => { setEditing(r); setShowForm(true); }}>✏️ সম্পাদনা</button>
                    <button className="action-btn del" onClick={() => del(r.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showForm && <RoutineForm routine={editing} authFetch={authFetch} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function RoutineForm({ routine, authFetch, onClose, onSaved }) {
  const [form, setForm] = useState(routine || {
    day_number: "", phase: "বেসিক টু এডভান্স", subject: "", lecture: "",
    bsc_lecture: "", bsc_topic: "", diploma_lecture: "", diploma_topic: "", motivational_line: "",
    live_class_link: "", question_bank_link: "", exam_link: "", book_link: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const body = { ...form, day_number: parseInt(form.day_number) };
      const res = routine
        ? await authFetch(`/admin/routine/${routine.id}/`, { method: "PUT", body: JSON.stringify(body) })
        : await authFetch("/admin/routine/", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(errText(data));
      onSaved(data);
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div className="admin-modal" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{routine ? `✏️ Day-${BANGLA_DIGITS(routine.day_number)} সম্পাদনা` : "➕ নতুন রুটিন"}</h3>
        <form className="admin-form" onSubmit={save}>
          <div className="af-row">
            <div><label>দিন নাম্বার</label><input className="input" type="number" min="1" value={form.day_number} onChange={(e) => setForm({ ...form, day_number: e.target.value })} required /></div>
            <div><label>ফেজ</label><select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>{PHASES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div className="af-row">
            <div><label>সাবজেক্ট</label><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><label>লেকচার</label><input className="input" value={form.lecture} onChange={(e) => setForm({ ...form, lecture: e.target.value })} /></div>
          </div>
          <div><label>BSc লেকচার</label><input className="input" value={form.bsc_lecture || ""} onChange={(e) => setForm({ ...form, bsc_lecture: e.target.value })} /></div>
          <div><label>BSc টপিক</label><textarea className="input" value={form.bsc_topic} onChange={(e) => setForm({ ...form, bsc_topic: e.target.value })} /></div>
          <div><label>ডিপ্লোমা লেকচার</label><input className="input" value={form.diploma_lecture || ""} onChange={(e) => setForm({ ...form, diploma_lecture: e.target.value })} /></div>
          <div><label>ডিপ্লোমা টপিক</label><textarea className="input" value={form.diploma_topic} onChange={(e) => setForm({ ...form, diploma_topic: e.target.value })} /></div>
          <div><label>মোটিভেশনাল লাইন</label><textarea className="input" value={form.motivational_line || ""} onChange={(e) => setForm({ ...form, motivational_line: e.target.value })} /></div>
          <div className="af-row">
            <div><label>লাইভ ক্লাস লিংক</label><input className="input" value={form.live_class_link} onChange={(e) => setForm({ ...form, live_class_link: e.target.value })} /></div>
            <div><label>প্রশ্ন ব্যাংক লিংক</label><input className="input" value={form.question_bank_link} onChange={(e) => setForm({ ...form, question_bank_link: e.target.value })} /></div>
          </div>
          <div className="af-row">
            <div><label>পরীক্ষা লিংক</label><input className="input" value={form.exam_link} onChange={(e) => setForm({ ...form, exam_link: e.target.value })} /></div>
            <div><label>বই লিংক</label><input className="input" value={form.book_link} onChange={(e) => setForm({ ...form, book_link: e.target.value })} /></div>
          </div>
          {err && <div style={{ color: "var(--red)", fontSize: 13 }}>{err}</div>}
          <div className="af-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "সেভ হচ্ছে..." : "💾 সেভ করুন"}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>বাতিল</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===== Resources Tab ===== */
function ResourcesTab({ authFetch }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [flash, setFlash] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/admin/routine/")
      .then((r) => r.json())
      .then((d) => setRoutines(d.routines || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const daysWithLinks = routines.filter((r) => linkCount(r) > 0).length;
  const totalLinks = routines.reduce((n, r) => n + linkCount(r), 0);

  const q = search.trim().toLowerCase();
  const visible = routines.filter((r) => {
    const cnt = linkCount(r);
    if (filter === "with" && cnt === 0) return false;
    if (filter === "without" && cnt > 0) return false;
    if (!q) return true;
    return (
      String(r.day_number).includes(q) ||
      (r.subject || "").toLowerCase().includes(q) ||
      (r.lecture || "").toLowerCase().includes(q)
    );
  });

  // Replace the saved row in place so the table matches the dashboard immediately.
  const onSaved = (updated) => {
    setEditing(null);
    if (updated && updated.id) {
      setRoutines((rows) => rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setFlash(`Day-${BANGLA_DIGITS(updated.day_number)} এর লিংক সেভ হয়েছে — শিক্ষার্থীর ড্যাশবোর্ডে দেখা যাবে।`);
      setTimeout(() => setFlash(""), 4000);
    } else {
      load();
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>🔗 রিসোর্স লিংক ম্যানেজমেন্ট</h1>
          <p>এখানে যোগ করা লিংকই শিক্ষার্থীর ড্যাশবোর্ডের “আজকের রিসোর্স” কার্ডে দেখা যায়</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>🔄 রিফ্রেশ</button>
      </div>

      {flash && <div className="res-flash">✅ {flash}</div>}

      <div className="admin-stats" style={{ marginBottom: 20 }}>
        <div className="astat"><div className="ai" style={{ background: "var(--blue-light)" }}>📋</div><b>{BANGLA_DIGITS(routines.length)}</b><span>মোট রুটিন</span></div>
        <div className="astat"><div className="ai" style={{ background: "var(--green-light)" }}>🔗</div><b>{BANGLA_DIGITS(daysWithLinks)}</b><span>লিংক আছে এমন দিন</span></div>
        <div className="astat"><div className="ai" style={{ background: "var(--purple-light)" }}>📦</div><b>{BANGLA_DIGITS(totalLinks)}</b><span>মোট লিংক</span></div>
        <div className="astat"><div className="ai" style={{ background: "var(--red-light)" }}>⚠️</div><b>{BANGLA_DIGITS(Math.max(0, routines.length - daysWithLinks))}</b><span>লিংক বাকি</span></div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-head res-toolbar">
          <h3>📚 দিন অনুযায়ী রিসোর্স ({BANGLA_DIGITS(visible.length)})</h3>
          <div className="res-toolbar-controls">
            <input
              className="input res-search"
              placeholder="🔍 দিন নাম্বার বা সাবজেক্ট খুঁজুন"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="res-filters">
              {[
                { k: "all", label: "সব" },
                { k: "with", label: "লিংক আছে" },
                { k: "without", label: "লিংক নেই" },
              ].map((f) => (
                <button
                  key={f.k}
                  type="button"
                  className={`res-filter ${filter === f.k ? "active" : ""}`}
                  onClick={() => setFilter(f.k)}
                >{f.label}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty"><div className="em-ic">⏳</div><p>লোড হচ্ছে...</p></div>
        ) : visible.length === 0 ? (
          <div className="admin-empty"><div className="em-ic">🔗</div><p>কোনো রুটিন মেলেনি।</p></div>
        ) : (
          <div style={{ maxHeight: 620, overflowY: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr><th>দিন</th><th>সাবজেক্ট</th><th>রিসোর্স লিংক</th><th>অ্যাকশন</th></tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className="day-cell">Day-{BANGLA_DIGITS(r.day_number)}</td>
                    <td>{r.subject || "—"}</td>
                    <td>
                      <div className="res-chips">
                        {RESOURCE_FIELDS.map((f) => (r[f.key] ? (
                          <a key={f.key} className="res-chip on" href={r[f.key]} target="_blank" rel="noreferrer" title={r[f.key]}>
                            <span aria-hidden="true">{f.icon}</span> {f.label}
                          </a>
                        ) : (
                          <span key={f.key} className="res-chip" title="লিংক যোগ হয়নি">
                            <span aria-hidden="true">{f.icon}</span> {f.label}
                          </span>
                        )))}
                      </div>
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => setEditing(r)}>
                        ✏️ {linkCount(r) ? "সম্পাদনা" : "লিংক যোগ"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ResourceLinkForm
          routine={editing}
          authFetch={authFetch}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

/* Link-only editor: saves just the four dashboard resource links for one day. */
function ResourceLinkForm({ routine, authFetch, onClose, onSaved }) {
  const [links, setLinks] = useState(() =>
    Object.fromEntries(RESOURCE_FIELDS.map((f) => [f.key, routine[f.key] || ""]))
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const res = await authFetch(`/admin/routine/${routine.id}/`, {
        method: "PUT",
        body: JSON.stringify(links),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(errText(data));
      onSaved(data);
    } catch (e2) {
      setErr(e2.message || "সেভ ব্যর্থ হয়েছে");
    }
    setSaving(false);
  };

  return (
    <div className="admin-modal" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>🔗 Day-{BANGLA_DIGITS(routine.day_number)} — রিসোর্স লিংক</h3>
        <p className="rl-sub">
          {routine.subject || routine.lecture || "আজকের পড়াশোনার লিংক"} · লিংক খালি রাখলে ড্যাশবোর্ডে কার্ডটি নিষ্ক্রিয় থাকবে
        </p>
        <form className="admin-form" onSubmit={save}>
          {RESOURCE_FIELDS.map((f) => (
            <div className="rl-row" key={f.key}>
              <label htmlFor={`rl-${f.key}`}>
                <span className="rl-ic" aria-hidden="true">{f.icon}</span> {f.label}
                <em>{f.hint}</em>
              </label>
              <div className="rl-input">
                <input
                  id={`rl-${f.key}`}
                  className="input"
                  inputMode="url"
                  placeholder="https://..."
                  value={links[f.key]}
                  onChange={(e) => setLinks({ ...links, [f.key]: e.target.value })}
                />
                {links[f.key] ? (
                  <>
                    <a className="action-btn" href={links[f.key]} target="_blank" rel="noreferrer">↗ টেস্ট</a>
                    <button type="button" className="action-btn del" onClick={() => setLinks({ ...links, [f.key]: "" })}>✕</button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {err && <div className="res-error">⚠️ {err}</div>}
          <div className="af-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "সেভ হচ্ছে..." : "💾 লিংক সেভ করুন"}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>বাতিল</button>
          </div>
        </form>
      </div>
    </div>
  );
}
