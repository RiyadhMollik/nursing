"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API || "/api";
const BANGLA_DIGITS = (s) => String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const PHASES = [
  "বেসিক টু এডভান্স", "ফাইনাল রিভিশন", "কুইক রিভিশন", "মডেল টেস্ট",
];

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
          <p className="sub">AAP Nursing Challenge — প্রশাসনিক নিয়ন্ত্রণ</p>
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
        <span className="admin-mobile-title">🛡️ AAP Admin</span>
      </div>
      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="admin-shell">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="as-brand">
            <div className="brand"><span className="brand-badge">ন</span> AAP Admin</div>
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
    bsc_topic: "", diploma_topic: "", live_class_link: "", question_bank_link: "", exam_link: "", book_link: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const body = { ...form, day_number: parseInt(form.day_number) };
      if (routine) {
        await authFetch(`/admin/routine/${routine.id}/`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await authFetch("/admin/routine/", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
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
          <div><label>BSc টপিক</label><textarea className="input" value={form.bsc_topic} onChange={(e) => setForm({ ...form, bsc_topic: e.target.value })} /></div>
          <div><label>ডিপ্লোমা টপিক</label><textarea className="input" value={form.diploma_topic} onChange={(e) => setForm({ ...form, diploma_topic: e.target.value })} /></div>
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

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/admin/routine/").then((r) => r.json()).then((d) => setRoutines(d.routines || [])).finally(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const withLinks = routines.filter((r) => r.live_class_link || r.question_bank_link || r.exam_link || r.book_link);

  return (
    <>
      <div className="admin-header">
        <div><h1>🔗 রিসোর্স লিংক ম্যানেজমেন্ট</h1><p>প্রতিদিনের ক্লাস/পরীক্ষা/প্রশ্ন/বই লিংক যোগ করুন</p></div>
      </div>
      <div className="admin-table-card" style={{ marginBottom: 24 }}>
        <div className="admin-table-head"><h3>📋 লিংক সহ রুটিন ({BANGLA_DIGITS(withLinks.length)})</h3></div>
        {loading ? <div className="admin-empty"><div className="em-ic">⏳</div></div> : withLinks.length === 0 ? <div className="admin-empty"><div className="em-ic">🔗</div><p>এখনও কোনো লিংক যোগ নেই। রুটিন সম্পাদনা করে লিংক যোগ করুন।</p></div> : (
          <table className="admin-table">
            <thead><tr><th>দিন</th><th>ক্লাস</th><th>পরীক্ষা</th><th>প্রশ্ন</th><th>বই</th><th>অ্যাকশন</th></tr></thead>
            <tbody>
              {withLinks.map((r) => (
                <tr key={r.id}>
                  <td className="day-cell">Day-{BANGLA_DIGITS(r.day_number)}</td>
                  <td>{r.live_class_link ? "✅" : "—"}</td>
                  <td>{r.exam_link ? "✅" : "—"}</td>
                  <td>{r.question_bank_link ? "✅" : "—"}</td>
                  <td>{r.book_link ? "✅" : "—"}</td>
                  <td><button className="action-btn" onClick={() => setEditing(r)}>✏️ সম্পাদনা</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="admin-table-card">
        <div className="admin-table-head"><h3>📚 সব রুটিন — দ্রুত লিংক যোগ</h3></div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          <table className="admin-table">
            <thead><tr><th>দিন</th><th>সাবজেক্ট</th><th>লিংক স্ট্যাটাস</th><th>অ্যাকশন</th></tr></thead>
            <tbody>
              {routines.map((r) => {
                const cnt = [r.live_class_link, r.question_bank_link, r.exam_link, r.book_link].filter(Boolean).length;
                return (
                  <tr key={r.id}>
                    <td className="day-cell">Day-{BANGLA_DIGITS(r.day_number)}</td>
                    <td>{r.subject || "—"}</td>
                    <td>{cnt === 0 ? <span style={{ color: "var(--muted)" }}>কোনো লিংক নেই</span> : <span style={{ color: "var(--green)", fontWeight: 700 }}>{BANGLA_DIGITS(cnt)}/৪ লিংক</span>}</td>
                    <td><button className="action-btn" onClick={() => setEditing(r)}>✏️ লিংক যোগ</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {editing && <RoutineForm routine={editing} authFetch={authFetch} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
