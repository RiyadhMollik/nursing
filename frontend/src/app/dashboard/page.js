"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API || "/api";
const BANGLA_DIGITS = (s) => String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const PHASES = [
  { key: "বেসিক টু এডভান্স", label: "বেসিক টু এডভান্স", days: 100, color: "#008643" },
  { key: "ফাইনাল রিভিশন", label: "ফাইনাল রিভিশন", days: 30, color: "#01542b" },
  { key: "কুইক রিভিশন", label: "কুইক রিভিশন", days: 10, color: "#fc465d" },
  { key: "মডেল টেস্ট", label: "মডেল টেস্ট", days: 10, color: "#667eea" },
];
const WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const RESOURCE_OPTIONS = [
  { key: "live_class_link", icon: "🎥", title: "ক্লাস করি", subtitle: "আজকের Topic-এর ক্লাস", tone: "green" },
  { key: "exam_link", icon: "📝", title: "পরীক্ষা দেই", subtitle: "আজকের পড়া যাচাই", tone: "red" },
  { key: "question_bank_link", icon: "📚", title: "প্রশ্ন সলভ করি", subtitle: "Topic ভিত্তিক অনুশীলন", tone: "blue" },
  { key: "book_link", icon: "📖", title: "বই পড়ি", subtitle: "আজকের Topic বই থেকে", tone: "purple" },
];
function todayFullBn() {
  const d = new Date();
  return `${BANGLA_DIGITS(d.getDate())} ${MONTHS_BN[d.getMonth()]}, ${BANGLA_DIGITS(d.getFullYear())}`;
}

export default function DashboardPage() {
  const [mobile, setMobile] = useState("");
  const [student, setStudent] = useState(null);
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resourceDay, setResourceDay] = useState(null);

  useEffect(() => {
    if (!resourceDay) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setResourceDay(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [resourceDay]);

  // restore session
  useEffect(() => {
    const saved = localStorage.getItem("aap_mobile");
    if (saved) {
      setMobile(saved);
      login(saved);
    }
  }, []);

  // `silent` re-fetches in the background so links added in the admin panel
  // show up without the student having to log in again.
  const login = useCallback(async (m, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/student/?mobile=${encodeURIComponent(m)}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "অ্যাকাউন্ট পাওয়া যায়নি।");
      }
      const data = await res.json();
      setStudent(data);
      localStorage.setItem("aap_mobile", m);
      // load full routine + merge completed status from student data
      const rr = await fetch(`${API}/routine/`).then((r) => r.json());
      const rows = Array.isArray(rr) ? rr : rr.results || [];
      const doneSet = new Set(data.completed_day_numbers || []);
      setRoutine(rows.map((r) => ({ ...r, _completed: doneSet.has(r.day_number) })));
    } catch (e) {
      if (!silent) {
        setError(e.message);
        localStorage.removeItem("aap_mobile");
      }
    }
    if (!silent) setLoading(false);
  }, []);

  // Pick up newly added resource links when the tab regains focus.
  const activeMobile = student?.mobile;
  useEffect(() => {
    if (!activeMobile) return undefined;
    const refresh = () => {
      if (document.visibilityState === "visible") login(activeMobile, { silent: true });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [activeMobile, login]);

  const logout = () => {
    localStorage.removeItem("aap_mobile");
    setStudent(null);
    setMobile("");
  };

  const toggleDay = async (dayNumber, currentCompleted) => {
    if (!student) return;
    const newCompleted = !currentCompleted;
    // optimistic update
    setStudent((s) => s ? ({
      ...s,
      completed_days: s.completed_days + (currentCompleted ? -1 : 1),
      today_completed: s.today_routine?.day_number === dayNumber ? newCompleted : s.today_completed,
      completed_day_numbers: currentCompleted
        ? (s.completed_day_numbers || []).filter((d) => d !== dayNumber)
        : [...(s.completed_day_numbers || []), dayNumber],
    }) : s);
    setRoutine((rows) => rows.map((r) => (r.day_number === dayNumber ? { ...r, _completed: newCompleted } : r)));
    try {
      const res = await fetch(`${API}/progress/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: student.mobile, day_number: dayNumber, completed: newCompleted }),
      });
      if (!res.ok) throw new Error("সেভ ব্যর্থ");
    } catch (e) {
      // rollback on failure
      setStudent((s) => s ? ({
        ...s,
        completed_days: s.completed_days + (currentCompleted ? 1 : -1),
        today_completed: s.today_routine?.day_number === dayNumber ? currentCompleted : s.today_completed,
        completed_day_numbers: currentCompleted
          ? [...(s.completed_day_numbers || []), dayNumber]
          : (s.completed_day_numbers || []).filter((d) => d !== dayNumber),
      }) : s);
      setRoutine((rows) => rows.map((r) => (r.day_number === dayNumber ? { ...r, _completed: currentCompleted } : r)));
    }
  };

  // ===== Login gate =====
  if (!student) {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="gate-ic">🏥</div>
          <h2>ড্যাশবোর্ডে প্রবেশ</h2>
          <p>আপনার মোবাইল নাম্বার দিন ড্যাশবোর্ড দেখতে। এখনও রেজিস্ট্রেশন না করলে <a href="/" style={{ color: "var(--green)", fontWeight: 700 }}>হোমপেজে</a> যান।</p>
          <form onSubmit={(e) => { e.preventDefault(); if (mobile.trim()) login(mobile.trim()); }}>
            <input className="input" placeholder="আপনার মোবাইল নাম্বার" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            {error && <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, marginTop: 8 }}>{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={loading}>
              {loading ? "লোড হচ্ছে..." : "🚀 ড্যাশবোর্ডে যান"}
            </button>
          </form>
          <a href="/" style={{ display: "inline-block", marginTop: 16, color: "var(--muted)", fontSize: 13 }}>← হোমপেজে ফিরুন</a>
        </div>
      </div>
    );
  }

  const cd = student.current_day;
  const total = student.total_days;
  const completed = student.completed_days;
  const remaining = student.remaining_days;
  const missed = Math.max(0, cd - 1 - completed);
  const pct = Math.round(completed / total * 100);

  // phase progress
  const phaseProgress = PHASES.map((p, i) => {
    let start = 1;
    for (let j = 0; j < i; j++) start += PHASES[j].days;
    const end = start + p.days - 1;
    const phaseDone = routine.filter((r) => r.day_number >= start && r.day_number <= end && r._completed).length;
    return { ...p, start, end, done: phaseDone, pct: Math.round(phaseDone / p.days * 100) };
  });

  // heatmap cells
  const cells = [];
  for (let i = 1; i <= total; i++) {
    const r = routine.find((x) => x.day_number === i);
    let cls = "future";
    if (i < cd) cls = r?._completed ? "done" : "missed";
    else if (i === cd) cls = r?._completed ? "done" : "today";
    else if (r?._completed) cls = "done";
    cells.push({ day: i, cls });
  }

  const today = student.today_routine;

  return (
    <div className="dash-page">
      {/* Topbar */}
      <div className="dash-topbar">
        <div className="container dash-topbar-inner">
          <a className="brand" href="/"><span className="brand-badge">ন</span> নার্সিং পাঠশালা</a>
          <div className="dash-user">
            <div className="avatar">{student.name.charAt(0)}</div>
            <div className="info">
              <b>{student.name}</b>
              <span>Day {String(cd).padStart(2, "0")} / {BANGLA_DIGITS(total)}</span>
            </div>
            <button className="dash-logout" onClick={logout}>লগআউট</button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stat cards */}
        <div className="dash-grid">
          <div className="dash-card">
            <div className="dc-ic g">📅</div>
            <b>{BANGLA_DIGITS(cd)}</b>
            <span>বর্তমান দিন</span>
          </div>
          <div className="dash-card">
            <div className="dc-ic b">✅</div>
            <b>{BANGLA_DIGITS(completed)}</b>
            <span>সম্পন্ন দিন</span>
          </div>
          <div className="dash-card">
            <div className="dc-ic r">⏰</div>
            <b>{BANGLA_DIGITS(remaining)}</b>
            <span>বাকি দিন</span>
          </div>
          <div className="dash-card">
            <div className="dc-ic p">📊</div>
            <b>{BANGLA_DIGITS(pct)}%</b>
            <span>মোট প্রগ্রেস</span>
          </div>
        </div>

        {/* Today + phase progress */}
        <div className="dash-row">
          <div className="dash-panel today-panel">
            <h3>🔥 আজকের পড়াশুনা</h3>
            {today ? (
              <div className="today">
                <div className="today-main">
                  <div className="today-card-head">
                    <span className="day-pill">DAY {String(student.current_day).padStart(2, "0")}</span>
                    <span className="today-card-date">{todayFullBn()} {WEEKDAYS[new Date().getDay()]}</span>
                  </div>
                  <h3>{today.subject}</h3>
                  <div className="topic">{today.bsc_topic || today.diploma_topic || today.lecture || "—"}</div>
                </div>
                <div className="today-side">
                  <div className="actions4">
                    {RESOURCE_OPTIONS.map((item) => {
                      const link = today[item.key];
                      return (
                        <a
                          key={item.key}
                          className={`action ${!link ? "is-disabled" : ""}`}
                          href={link || "#"}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => !link && e.preventDefault()}
                        >
                          <div className="emoji">{item.icon}</div>
                          <b>{item.title}</b>
                          <span>{link ? item.subtitle : "লিংক এখনো যোগ হয়নি"}</span>
                        </a>
                      );
                    })}
                  </div>
                  <button
                    className={`btn ${student.today_completed ? "btn-soft" : "btn-primary"}`}
                    style={{ marginTop: 16, width: "100%" }}
                    onClick={() => toggleDay(today.day_number, student.today_completed)}
                  >
                    {student.today_completed ? "✓ আজকের দিন সম্পন্ন" : "○ আজকের দিন সম্পন্ন করুন"}
                  </button>
                </div>
              </div>
            ) : <div className="admin-empty"><div className="em-ic">📭</div><p>আজকের রুটিন পাওয়া যায়নি।</p></div>}
          </div>

          <div className="dash-panel">
            <h3>📈 ফেজ অনুযায়ী অগ্রগতি</h3>
            {phaseProgress.map((p) => (
              <div className="phase-bar" key={p.key}>
                <div className="pb-head">
                  <span>{p.label}</span>
                  <span className="pct">{BANGLA_DIGITS(p.done)}/{BANGLA_DIGITS(p.days)} ({BANGLA_DIGITS(p.pct)}%)</span>
                </div>
                <div className="pb-track">
                  <div className="pb-fill" style={{ width: `${p.pct}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)` }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 18, padding: 14, background: "var(--green-light)", borderRadius: 12, fontSize: 13, color: "var(--green-dark)", fontWeight: 600 }}>
              {missed > 0 ? `⚠️ ${BANGLA_DIGITS(missed)} দিন মিস হয়েছে — এখনই ধরে নিন!` : "🎉 কোনো দিন মিস নেই — চালিয়ে যান!"}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="dash-panel" style={{ marginBottom: 24 }}>
          <h3>🗓️ ১৫০ দিনের পড়াশুনার ক্যালেন্ডার</h3>
          <div className="heatmap">
            {cells.map((c) => (
              <div key={c.day} className={`heat-cell ${c.cls}`} title={`Day ${c.day}`}>
                <strong>{BANGLA_DIGITS(c.day)}</strong>
                <span>DAY</span>
              </div>
            ))}
          </div>
          <div className="heat-legend">
            <span className="lg"><span className="sw" style={{ background: "linear-gradient(135deg, var(--green), var(--green-2))" }} /> সম্পন্ন</span>
            <span className="lg"><span className="sw" style={{ background: "var(--red-light)", border: "1px solid var(--red-border)" }} /> মিস</span>
            <span className="lg"><span className="sw" style={{ background: "var(--blue)" }} /> আজ</span>
            <span className="lg"><span className="sw" style={{ background: "var(--surface-3)" }} /> আসছে</span>
          </div>
        </div>

        {/* Full routine */}
        <div className="dash-panel">
          <h3>📅 ১৫০ দিনের পূর্ণাঙ্গ রুটিন</h3>
            <div style={{ overflowX: "auto", maxHeight: 600 }}>
              <table className="dash-table">
                <thead>
                  <tr><th>দিন</th><th>লেকচার</th><th>টপিক</th><th>রিসোর্স</th><th>স্ট্যাটাস</th></tr>
                </thead>
                <tbody>
                  {routine.map((r) => (
                    <tr key={r.day_number} className={r.day_number === cd ? "current-row" : ""}>
                      <td className="day-cell">
                        Day-{BANGLA_DIGITS(r.day_number)}
                        {r.day_number === cd && <span style={{ fontSize: 10, color: "var(--green)" }}> ● আজ</span>}
                      </td>
                      <td>{r.lecture || "—"}</td>
                      <td style={{ whiteSpace: "pre-line", maxWidth: 220, color: "var(--muted-2)", lineHeight: 1.5 }}>{r.bsc_topic || r.diploma_topic || "—"}</td>
                      <td>
                        <button className="resource-open-btn" type="button" onClick={() => setResourceDay(r)}>
                          <span aria-hidden="true">🔗</span> রিসোর্স
                        </button>
                      </td>
                      <td>
                        <button
                          className={`status-switch ${r._completed ? "is-on" : ""}`}
                          onClick={() => toggleDay(r.day_number, r._completed)}
                          role="switch"
                          aria-checked={r._completed}
                          aria-label={r._completed ? "সম্পন্ন—বাকি হিসেবে চিহ্নিত করুন" : "সম্পন্ন হিসেবে চিহ্নিত করুন"}
                          title={r._completed ? "সম্পন্ন" : "সম্পন্ন হিসেবে চিহ্নিত করুন"}
                        >
                          <span className="status-switch-track" aria-hidden="true"><span /></span>
                          {r._completed && <span>সম্পন্ন</span>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      {resourceDay && (
        <div className="resource-modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setResourceDay(null)}>
          <section className="resource-modal" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title">
            <button className="resource-modal-close" type="button" onClick={() => setResourceDay(null)} aria-label="বন্ধ করুন">×</button>
            <span className="resource-modal-kicker">DAY {String(resourceDay.day_number).padStart(2, "0")}</span>
            <h2 id="resource-modal-title">আজকের রিসোর্স</h2>
            <p>{resourceDay.subject || resourceDay.lecture || "পড়াশোনার প্রয়োজনীয় লিংক"}</p>
            <div className="resource-grid">
              {RESOURCE_OPTIONS.map((item) => {
                const link = resourceDay[item.key];
                const content = (
                  <>
                    <span className="resource-icon" aria-hidden="true">{item.icon}</span>
                    <strong>{item.title}</strong>
                    <small>{link ? item.subtitle : "লিংক এখনো যোগ হয়নি"}</small>
                  </>
                );
                return link ? (
                  <a key={item.key} className={`resource-card ${item.tone}`} href={link} target="_blank" rel="noreferrer">{content}</a>
                ) : (
                  <div key={item.key} className={`resource-card ${item.tone} is-unavailable`} aria-disabled="true">{content}</div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
