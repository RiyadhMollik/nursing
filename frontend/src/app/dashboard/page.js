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
  const [routineTab, setRoutineTab] = useState("history");

  // restore session
  useEffect(() => {
    const saved = localStorage.getItem("aap_mobile");
    if (saved) {
      setMobile(saved);
      login(saved);
    }
  }, []);

  const login = useCallback(async (m) => {
    setLoading(true);
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
      setError(e.message);
      localStorage.removeItem("aap_mobile");
    }
    setLoading(false);
  }, []);

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

  // history (last 20 days around current)
  const historyDays = [];
  for (let i = Math.max(1, cd - 10); i <= Math.min(total, cd + 10); i++) {
    const r = routine.find((x) => x.day_number === i);
    let status = "pending";
    if (i < cd) status = r?._completed ? "done" : "missed";
    else if (i === cd) status = r?._completed ? "done" : "pending";
    historyDays.push({ ...r, day_number: i, status, _completed: r?._completed });
  }

  const today = student.today_routine;

  return (
    <div className="dash-page">
      {/* Topbar */}
      <div className="dash-topbar">
        <div className="container dash-topbar-inner">
          <a className="brand" href="/"><span className="brand-badge">ন</span> Nursing Challenge</a>
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
            <h3>🔥 আজকের চ্যালেঞ্জ</h3>
            <p className="today-sub">আপনি যেদিন Challenge শুরু করবেন, সেদিন থেকেই আপনার Day-1 গণনা শুরু হবে।</p>
            {today ? (
              <div className="today">
                <div className="today-main">
                  <span className="day-pill">DAY {String(student.current_day).padStart(2, "0")}</span>
                  <h3>{today.subject}</h3>
                  <div className="topic">{today.bsc_topic || today.diploma_topic || today.lecture || "—"}</div>
                  <div className="meta">
                    <span className="tag">{today.phase}</span>
                    {today.lecture && today.lecture !== "সকল" && <span className="tag">{today.lecture}</span>}
                    <span className="tag">{todayFullBn()}</span>
                    <span className="tag">{WEEKDAYS[new Date().getDay()]}</span>
                  </div>
                </div>
                <div className="today-side">
                  <div className="actions4">
                    <a className={`action ${!today.live_class_link ? "is-disabled" : ""}`} href={today.live_class_link || "#"} target="_blank" rel="noreferrer" onClick={(e) => !today.live_class_link && e.preventDefault()}>
                      <div className="emoji">🎥</div><b>ক্লাস করি</b><span>আজকের Topic-এর ক্লাস</span>
                    </a>
                    <a className={`action ${!today.exam_link ? "is-disabled" : ""}`} href={today.exam_link || "#"} target="_blank" rel="noreferrer" onClick={(e) => !today.exam_link && e.preventDefault()}>
                      <div className="emoji">📝</div><b>পরীক্ষা দেই</b><span>আজকের পড়া যাচাই</span>
                    </a>
                    <a className={`action ${!today.question_bank_link ? "is-disabled" : ""}`} href={today.question_bank_link || "#"} target="_blank" rel="noreferrer" onClick={(e) => !today.question_bank_link && e.preventDefault()}>
                      <div className="emoji">📚</div><b>প্রশ্ন সলভ করি</b><span>Topic ভিত্তিক অনুশীলন</span>
                    </a>
                    <a className={`action ${!today.book_link ? "is-disabled" : ""}`} href={today.book_link || "#"} target="_blank" rel="noreferrer" onClick={(e) => !today.book_link && e.preventDefault()}>
                      <div className="emoji">📖</div><b>বই পড়ি</b><span>আজকের Topic বই থেকে</span>
                    </a>
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
          <h3>🗓️ ১৫০ দিনের ক্যালেন্ডার</h3>
          <div className="heatmap">
            {cells.map((c) => (
              <div key={c.day} className={`heat-cell ${c.cls}`} title={`Day ${c.day}`} />
            ))}
          </div>
          <div className="heat-legend">
            <span className="lg"><span className="sw" style={{ background: "linear-gradient(135deg, var(--green), var(--green-2))" }} /> সম্পন্ন</span>
            <span className="lg"><span className="sw" style={{ background: "var(--red-light)", border: "1px solid var(--red-border)" }} /> মিস</span>
            <span className="lg"><span className="sw" style={{ background: "var(--blue)" }} /> আজ</span>
            <span className="lg"><span className="sw" style={{ background: "var(--surface-3)" }} /> আসছে</span>
          </div>
        </div>

        {/* Tabbed: History / Full Routine */}
        <div className="dash-panel">
          <div className="dash-tabs">
            <button className={`dash-tab ${routineTab === "history" ? "active" : ""}`} onClick={() => setRoutineTab("history")}>
              📋 সাম্প্রতিক হিস্ট্রি
            </button>
            <button className={`dash-tab ${routineTab === "routine" ? "active" : ""}`} onClick={() => setRoutineTab("routine")}>
              📅 পূর্ণাঙ্গ রুটিন
            </button>
          </div>

          {routineTab === "history" ? (
            <div style={{ overflowX: "auto" }}>
              <table className="dash-table">
                <thead>
                  <tr><th>দিন</th><th>সাবজেক্ট</th><th>লেকচার</th><th>স্ট্যাটাস</th><th>অ্যাকশন</th></tr>
                </thead>
                <tbody>
                  {historyDays.map((d) => (
                    <tr key={d.day_number}>
                      <td className="day-cell">Day-{BANGLA_DIGITS(d.day_number)}</td>
                      <td>{d.subject || "—"}</td>
                      <td>{d.lecture || "—"}</td>
                      <td>
                        {d.status === "done" && <span className="st-done">✓ সম্পন্ন</span>}
                        {d.status === "missed" && <span className="st-missed">✗ মিস</span>}
                        {d.status === "pending" && <span className="st-pending">○ বাকি</span>}
                      </td>
                      <td>
                        <button
                          className={`tick-btn ${d._completed ? "done" : ""}`}
                          onClick={() => toggleDay(d.day_number, d._completed)}
                        >
                          {d._completed ? "✓" : "○"} টগল
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
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
                        {r.live_class_link && <a className="link-btn" href={r.live_class_link} target="_blank" rel="noreferrer">ক্লাস</a>}
                        {r.exam_link && <a className="link-btn" href={r.exam_link} target="_blank" rel="noreferrer">পরীক্ষা</a>}
                        {r.book_link && <a className="link-btn" href={r.book_link} target="_blank" rel="noreferrer">বই</a>}
                        {r.question_bank_link && <a className="link-btn" href={r.question_bank_link} target="_blank" rel="noreferrer">প্রশ্ন</a>}
                        {!r.live_class_link && !r.exam_link && !r.book_link && !r.question_bank_link && <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        <button
                          className={`tick-btn ${r._completed ? "done" : ""}`}
                          onClick={() => toggleDay(r.day_number, r._completed)}
                        >
                          {r._completed ? "✓ সম্পন্ন" : "○ বাকি"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
