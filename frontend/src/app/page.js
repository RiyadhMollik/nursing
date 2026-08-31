"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API || "/api";

const PHASE_COLORS = {
  "বেসিক টু এডভান্স": "#008643",
  "ফাইনাল রিভিশন": "#01542b",
  "কুইক রিভিশন": "#fc465d",
  "মডেল টেস্ট": "#667eea",
};

const BANGLA_DIGITS = (s) =>
  String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

const WEEKDAYS = ["রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার"];

function todayBn() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${BANGLA_DIGITS(d.getFullYear())}-${BANGLA_DIGITS(mm)}-${BANGLA_DIGITS(dd)}`;
}

function todayFullBn() {
  return new Date().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
}

/* ============ Hooks ============ */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

function useCountUp(target, duration = 1000, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return val;
}

/* ============ Toast system ============ */
let toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "info", ttl = 3200) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 320);
    }, ttl);
  }, []);
  return { toasts, push };
}

/* ============ Confetti ============ */
function fireConfetti() {
  const colors = ["#008643", "#01542b", "#16a34a", "#fc465d", "#667eea", "#764ba2"];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
    p.style.animationDelay = Math.random() * 0.3 + "s";
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    if (Math.random() > 0.5) p.style.borderRadius = "50%";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }
}

export default function Home() {
  const [meta, setMeta] = useState(null);
  const [student, setStudent] = useState(null);
  const [routine, setRoutine] = useState([]);
  const [filters, setFilters] = useState({ phases: [], subjects: [] });
  const [phaseFilter, setPhaseFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showResource, setShowResource] = useState(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [dashReady, setDashReady] = useState(false);
  const tableRef = useRef(null);
  const { toasts, push } = useToasts();

  useReveal();

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch(`${API}/meta/`).then((r) => r.json()).then(setMeta).catch(() => push("ব্যাকএন্ড সার্ভার চালু নেই।", "warn", 5000));
    loadRoutine();
    loadFilters();
    const saved = localStorage.getItem("aap_mobile");
    if (saved) loadStudent(saved);
  }, []);

  const loadRoutine = useCallback(async () => {
    const res = await fetch(`${API}/routine/`);
    const data = await res.json();
    setRoutine(data);
  }, []);

  const loadFilters = useCallback(async () => {
    const res = await fetch(`${API}/routine/filters/`);
    const data = await res.json();
    setFilters(data);
  }, []);

  const loadStudent = useCallback(async (mobile) => {
    try {
      const res = await fetch(`${API}/student/?mobile=${encodeURIComponent(mobile)}`);
      if (!res.ok) {
        localStorage.removeItem("aap_mobile");
        setStudent(null);
        return;
      }
      const data = await res.json();
      setStudent(data);
      setDashReady(false);
      setTimeout(() => setDashReady(true), 80);
      localStorage.setItem("aap_mobile", mobile);
    } catch {}
  }, []);

  const handleRegister = async (name, mobile) => {
    const res = await fetch(`${API}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mobile }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "রেজিস্ট্রেশন ব্যর্থ হয়েছে।");
    }
    const data = await res.json();
    await loadStudent(data.mobile);
    setShowRegister(false);
    push(`স্বাগতম ${data.name}! তোমার Day-1 শুরু হলো 🎉`, "success");
    fireConfetti();
    setTimeout(() => {
      document.getElementById("progress")?.scrollIntoView({ behavior: "smooth" });
    }, 600);
  };

  const toggleProgress = async (dayNumber, currentCompleted) => {
    if (!student) return;
    const newCompleted = !currentCompleted;
    setStudent((s) => ({
      ...s,
      completed_days: s.completed_days + (currentCompleted ? -1 : 1),
      today_completed: s.today_routine?.day_number === dayNumber ? newCompleted : s.today_completed,
      completed_day_numbers: currentCompleted
        ? (s.completed_day_numbers || []).filter((d) => d !== dayNumber)
        : [...(s.completed_day_numbers || []), dayNumber],
    }));
    setRoutine((rows) => rows.map((r) => (r.day_number === dayNumber ? { ...r, _completed: newCompleted } : r)));
    await fetch(`${API}/progress/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: student.mobile, day_number: dayNumber, completed: newCompleted }),
    });
    if (newCompleted) {
      push(`Day-${BANGLA_DIGITS(dayNumber)} সম্পন্ন! চালিয়ে যাও 💪`, "success");
      fireConfetti();
    } else {
      push(`Day-${BANGLA_DIGITS(dayNumber)} আনটিক করা হলো`, "info", 2000);
    }
  };

  const scrollToTable = () => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const startChallenge = () => (student ? scrollToTable() : setShowRegister(true));
  const logout = () => {
    localStorage.removeItem("aap_mobile");
    setStudent(null);
    push("লগআউট হয়েছে।", "info", 2000);
  };
  const resetFilters = () => { setPhaseFilter(""); setSubjectFilter(""); };

  const routineWithProgress = routine.map((r) => {
    if (student) {
      const doneSet = new Set(student.completed_day_numbers || []);
      if (r.day_number === student.today_routine?.day_number) {
        return { ...r, _completed: student.today_completed };
      }
      return { ...r, _completed: doneSet.has(r.day_number) };
    }
    return r;
  });

  const filteredRoutine = routineWithProgress.filter((r) => {
    if (phaseFilter && r.phase !== phaseFilter) return false;
    if (subjectFilter && r.subject !== subjectFilter) return false;
    return true;
  });

  const totalDays = meta?.total_days || 150;
  const phases = meta?.phases || [];

  return (
    <>
      <Nav student={student} onLogout={logout} onStart={startChallenge} scrolled={navScrolled} />

      {/* ===== Hero ===== */}
      <Hero meta={meta} totalDays={totalDays} phases={phases} onStart={startChallenge} onSeeRoutine={scrollToTable} student={student} />

      {/* ===== Dashboard ===== */}
      <section className="section" id="progress" style={{ paddingTop: student ? 64 : 0 }}>
        <div className="container">
          <div className="dashboard reveal">
            <Dashboard student={student} totalDays={totalDays} animate={dashReady} />
          </div>
        </div>
      </section>

      {/* ===== Routine table ===== */}
      <section className="section" id="routine" ref={tableRef}>
        <div className="container">
          <div className="section-head reveal">
            <h2>{BANGLA_DIGITS(totalDays)} দিনের পূর্ণাঙ্গ রুটিন</h2>
            <p>কোন দিন কোন Course, Subject, Lecture ও Topic—সব এক জায়গায়।</p>
          </div>
          <div className="reveal reveal-delay-1">
            <RoutineTable
              rows={filteredRoutine}
              filters={filters}
              phaseFilter={phaseFilter}
              subjectFilter={subjectFilter}
              setPhaseFilter={setPhaseFilter}
              setSubjectFilter={setSubjectFilter}
              onReset={resetFilters}
              todayDay={student?.current_day}
              canTick={!!student}
              onTick={toggleProgress}
              onOpenResource={setShowResource}
              push={push}
            />
          </div>
        </div>
      </section>

      {/* ===== Course section ===== */}
      <CourseSection push={push} />

      {/* ===== How it works ===== */}
      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <h2>কীভাবে Challenge কাজ করবে?</h2>
            <p>চারটি সহজ ধাপে প্রতিদিনের পড়াশোনাকে একটি ধারাবাহিকতায় আনুন।</p>
          </div>
          <div className="steps">
            {[
              { num: "STEP 01", title: "চ্যালেঞ্জ শুরু করুন", desc: "নাম ও মোবাইল নম্বর দিয়ে Join করুন।" },
              { num: "STEP 02", title: "Day-1 থেকে শুরু", desc: "আপনি যেদিন Join করবেন, সেদিনই আপনার Day-1।" },
              { num: "STEP 03", title: "Daily Target", desc: "ক্লাস → পরীক্ষা → প্রশ্ন ব্যাংক → বই—আজকের কাজ সম্পন্ন করুন।" },
              { num: "STEP 04", title: `Day-${BANGLA_DIGITS(totalDays)}`, desc: "ধারাবাহিকভাবে Roadmap অনুসরণ করে Challenge শেষ করুন।" },
            ].map((s, i) => (
              <div className={`step reveal reveal-delay-${i + 1}`} key={i}>
                <span className="step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta">
        <div className="container">
          <div className="cta-box reveal">
            <h2>নার্স হওয়ার স্বপ্ন শুধু স্বপ্ন নয়—এটা একটি লক্ষ্য।</h2>
            <p>আজ শুরু করুন। প্রতিদিনের একটি Target সম্পন্ন করুন। একদিন একদিন করে এগিয়ে যান আপনার Nursing Admission Goal-এর দিকে।</p>
            <button className="btn btn-white" onClick={startChallenge}>
              🔥 আজ থেকেই Day-1 শুরু করুন
            </button>
          </div>
        </div>
      </section>

      <Footer onToast={push} totalDays={totalDays} />

      {/* ===== Sticky CTA (mobile) ===== */}
      {!student && (
        <div className="sticky-cta">
          <button className="btn btn-primary" onClick={startChallenge}>
            🔥 আজকের Challenge শুরু করুন
          </button>
        </div>
      )}

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onRegister={handleRegister} />}
      {showResource && <ResourceModal resource={showResource} onClose={() => setShowResource(null)} />}

      <ToastStack toasts={toasts} />
    </>
  );
}

/* ============ Nav ============ */
function Nav({ student, onLogout, onStart, scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-inner">
        <a className="brand" href="#"><span className="brand-badge">ন</span> <span className="brand-text">Nursing Challenge</span></a>
        <nav className={`navlinks ${menuOpen ? "open" : ""}`}>
          <a href="#challenge" onClick={() => setMenuOpen(false)}>চ্যালেঞ্জ</a>
          <a href="#routine" onClick={() => setMenuOpen(false)}>রুটিন</a>
          <a href="/dashboard" onClick={() => setMenuOpen(false)}>ড্যাশবোর্ড</a>
          <a href="/admin" onClick={() => setMenuOpen(false)}>Admin</a>
        </nav>
        <div className="nav-right">
          {student ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a href="/dashboard" className="nav-user" title="আপনার ড্যাশবোর্ড">
                <span>👋 {student.name}</span>
              </a>
              <button className="dash-logout" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onLogout}>লগআউট</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onStart}>🚀 শুরু</button>
          )}
          <button className={`nav-burger ${menuOpen ? "active" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="মেনু">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============ Hero ============ */
function Hero({ meta, totalDays, phases, onStart, onSeeRoutine, student }) {
  const ringPct = student ? Math.round((student.current_day / totalDays) * 100) : 0;
  // Build phase segments with cumulative ranges
  let start = 1;
  const segs = (phases && phases.length ? phases : [
    { key: "বেসিক টু এডভান্স", label: "বেসিক টু এডভান্স", days: 100, color: "#008643" },
    { key: "ফাইনাল রিভিশন", label: "ফাইনাল রিভিশন", days: 30, color: "#01542b" },
    { key: "কুইক রিভিশন", label: "কুইক রিভিশন", days: 10, color: "#fc465d" },
    { key: "মডেল টেস্ট", label: "মডেল টেস্ট", days: 10, color: "#667eea" },
  ]).map((p) => {
    const end = start + p.days - 1;
    const seg = { ...p, start, end };
    start = end + 1;
    return seg;
  });
  const currentDay = student?.current_day || 0;

  return (
    <section className="hero">
      <div className="hero-blob b1" />
      <div className="hero-blob b2" />
      <div className="hero-blob b3" />
      <div className="container hero-grid">
        <div>
          <span className="kicker">🔥 {BANGLA_DIGITS(totalDays)} DAYS • DAILY ACTION PLAN</span>
          <h1>{BANGLA_DIGITS(totalDays)} দিনে <br /><span className="grad">নার্স স্বপ্ন পূরণের</span> চ্যালেঞ্জ</h1>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={onStart}>🚀 চ্যালেঞ্জ শুরু করি</button>
            <button className="btn btn-soft" onClick={onSeeRoutine}>📋 {BANGLA_DIGITS(totalDays)} দিনের রুটিন দেখুন</button>
          </div>
        </div>
        <div className="hero-card hero-tl-card">
          <div className="hero-tl-head">
            <h3>🎯 আপনার যাত্রার রোডম্যাপ</h3>
            {student && (
              <span className="hero-tl-badge">
                {BANGLA_DIGITS(ringPct)}% সম্পন্ন
              </span>
            )}
          </div>
          <div className="hero-tl">
            <div className="hero-tl-line" />
            {segs.map((s, i) => {
              const isActive = currentDay >= s.start && currentDay <= s.end;
              const isDone = currentDay > s.end;
              const phasePct = isDone ? 100 : isActive ? Math.round(((currentDay - s.start + 1) / s.days) * 100) : 0;
              return (
                <div className={`hero-tl-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`} key={s.key}>
                  <div className="hero-tl-node" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}>
                    {isDone ? "✓" : BANGLA_DIGITS(i + 1)}
                  </div>
                  <div className="hero-tl-content">
                    <div className="hero-tl-row">
                      <span className="hero-tl-label">{s.label}</span>
                      <span className={`hero-tl-status ${isDone ? "st-done" : isActive ? "st-active" : "st-pending"}`}>
                        {isDone ? "সম্পন্ন" : isActive ? "চলমান" : "অপেক্ষমাণ"}
                      </span>
                    </div>
                    <div className="hero-tl-meta">
                      <span>📅 {BANGLA_DIGITS(s.days)} দিন</span>
                      <span>Day {BANGLA_DIGITS(s.start)}–{BANGLA_DIGITS(s.end)}</span>
                    </div>
                    <div className="hero-tl-bar">
                      <span style={{ width: `${phasePct}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!student && (
            <div className="hero-tl-cta">
              <span>শুরু করুন আজ থেকে</span>
              <button className="btn btn-primary btn-sm" onClick={onStart}>🚀 যোগ দিন</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ Dashboard (dark) ============ */
function Dashboard({ student, totalDays, animate }) {
  const currentDay = student?.current_day || 1;
  const completed = student?.completed_days || 0;
  const remaining = student?.remaining_days || totalDays - 1;
  const pct = Math.round((currentDay / totalDays) * 100);

  const completedCount = useCountUp(completed, 1000, animate);
  const pctCount = useCountUp(pct, 1200, animate);
  const remainingCount = useCountUp(remaining, 1000, animate);

  return (
    <>
      <div className="dash-top">
        <div className="dash-title">
          <small>{student ? `স্বাগতম, ${student.name} 👋` : `আপনার ${BANGLA_DIGITS(totalDays)} দিনের Challenge`}</small>
          <h2>Day {String(currentDay).padStart(2, "0")}</h2>
        </div>
        <span className="kicker" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
          {student ? (remaining > 0 ? `🔥 আরও ${BANGLA_DIGITS(remaining)} দিন` : "🏆 Challenge Complete") : "🚀 শুরু করুন"}
        </span>
      </div>
      <div className="dash-progress">
        <span style={{ width: animate ? `${pct}%` : "0%" }} />
      </div>
      <div className="dash-metrics">
        <div className="dmetric"><span className="dm-ic">📅</span><div className="dm-text"><b>{BANGLA_DIGITS(currentDay)}</b><span>বর্তমান দিন</span></div></div>
        <div className="dmetric"><span className="dm-ic">✅</span><div className="dm-text"><b>{BANGLA_DIGITS(completedCount)}</b><span>সম্পন্ন দিন</span></div></div>
        <div className="dmetric"><span className="dm-ic">⏰</span><div className="dm-text"><b>{BANGLA_DIGITS(remainingCount)}</b><span>বাকি দিন</span></div></div>
        <div className="dmetric"><span className="dm-ic">📊</span><div className="dm-text"><b>{BANGLA_DIGITS(pctCount)}%</b><span>মোট প্রগ্রেস</span></div></div>
      </div>
    </>
  );
}

/* ============ Roadmap bar chart (4-segment) ============ */
function RoadmapChart({ totalDays, currentDay, phases }) {
  // Build segments with cumulative ranges
  let start = 1;
  const segs = phases.map((p) => {
    const end = start + p.days - 1;
    const seg = { ...p, start, end };
    start = end + 1;
    return seg;
  });

  return (
    <div className="rm-timeline reveal">
      <div className="rm-tl-line" />
      {segs.map((s, i) => {
        const isActive = currentDay >= s.start && currentDay <= s.end;
        const isDone = currentDay > s.end;
        const phasePct = isDone ? 100 : isActive ? Math.round(((currentDay - s.start + 1) / s.days) * 100) : 0;
        const statusLabel = isDone ? "সম্পন্ন" : isActive ? "চলমান" : "অপেক্ষমাণ";
        return (
          <div className={`rm-tl-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`} key={s.key}>
            <div className="rm-tl-node" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}>
              {isDone ? "✓" : BANGLA_DIGITS(i + 1)}
            </div>
            <div className="rm-tl-card">
              <div className="rm-tl-head">
                <div className="rm-tl-title-wrap">
                  <span className="rm-tl-sw" style={{ background: s.color }} />
                  <h4>{s.label}</h4>
                </div>
                <span className={`rm-tl-status ${isDone ? "st-done" : isActive ? "st-active" : "st-pending"}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="rm-tl-meta">
                <span className="rm-tl-days">📅 {BANGLA_DIGITS(s.days)} দিন</span>
                <span className="rm-tl-range">Day {BANGLA_DIGITS(s.start)} – {BANGLA_DIGITS(s.end)}</span>
                <span className="rm-tl-pct">{BANGLA_DIGITS(phasePct)}% সম্পন্ন</span>
              </div>
              <div className="rm-tl-bar">
                <span style={{ width: `${phasePct}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)` }} />
              </div>
              {isActive && currentDay > 0 && (
                <div className="rm-tl-current">
                  📍 আপনি এখন <strong>Day {BANGLA_DIGITS(currentDay)}</strong> এ আছেন
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ Routine table ============ */
function RoutineTable({ rows, filters, phaseFilter, subjectFilter, setPhaseFilter, setSubjectFilter, onReset, todayDay, canTick, onTick, onOpenResource, push }) {
  return (
    <div className="table-card">
      <div className="filters">
        <h3>পূর্ণাঙ্গ রুটিন</h3>
        <select className="select" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
          <option value="">সব Course</option>
          {filters.phases.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="">সব Subject</option>
          {filters.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-soft btn-sm" onClick={onReset}>↺ Reset</button>
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{BANGLA_DIGITS(rows.length)} দিন</span>
      </div>
      <div className="table-scroll">
        <table className="routine">
          <thead>
            <tr>
              <th>Day</th><th>Lecture</th><th>Topic</th><th>রিসোর্স</th>
              {canTick && <th>স্ট্যাটাস</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day_number} className={r.day_number === todayDay ? "current-row" : ""}>
                <td className="day-cell">
                  Day-{BANGLA_DIGITS(r.day_number)}
                  {r.day_number === todayDay && <span style={{ fontSize: 10, color: "var(--green)" }}> ● আজ</span>}
                </td>
                <td>{r.lecture || "—"}</td>
                <td className="topic-cell">{r.bsc_topic || "—"}</td>
                <td>
                  {r.live_class_link && <a className="link-btn" href={r.live_class_link} target="_blank" rel="noreferrer">ক্লাস</a>}
                  {r.exam_link && <a className="link-btn" href={r.exam_link} target="_blank" rel="noreferrer">পরীক্ষা</a>}
                  {r.book_link && <a className="link-btn" href={r.book_link} target="_blank" rel="noreferrer">বই</a>}
                  {!r.live_class_link && !r.exam_link && !r.book_link && !r.question_bank_link && (
                    <button className="row-btn" onClick={() => push("এই দিনের রিসোর্স লিংক এখনও যুক্ত নেই।", "warn")}>View</button>
                  )}
                </td>
                {canTick && (
                  <td>
                    <button className={`tick-btn ${r._completed ? "done" : ""}`} onClick={() => onTick(r.day_number, r._completed)}>
                      {r._completed ? "✓ সম্পন্ন" : "○ টিক দিন"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Course Section ============ */
function CourseSection({ push }) {
  const COURSE_URL = "https://aapnursing.com/course/fighter2/promo";
  const ENROLL_URL = "https://wa.me/+8801403975955?text=" + encodeURIComponent("আমি কোর্সে ভর্তি হতে চাই");
  const COVER_IMG = "https://aapathshala.b-cdn.net/Fighter/Cover.jpg";

  const packageItems = [
    { ic: "🎥", t: "২০০টি লাইভ ক্লাস ও পরীক্ষা" },
    { ic: "🎞️", t: "গত বছরের ২০০টি আর্কাইভ ক্লাস" },
    { ic: "🏦", t: "ডিজিটাল প্রশ্নব্যাংক ও আনলিমিটেড পরীক্ষা" },
    { ic: "🎯", t: "নার্সিং ভর্তি পরীক্ষার মত GPA সহ পরীক্ষা" },
    { ic: "📚", t: "নার্স স্বপ্ন জয়ের ফুল সেট বই" },
    { ic: "🗺️", t: "সম্পূর্ণ কোর্স পরিকল্পনা" },
  ];

  const bookItems = [
    "নার্সিং ডিজিটাল প্রশ্নব্যাংক",
    "নার্সিং স্পেশাল প্র্যাকটিস বুক",
    "নার্সিং টপার্স হ্যান্ড নোট",
    "ফাইনাল মডেল টেস্ট বুক",
    "নার্সিং ডিজিটাল OMR বুক",
    "বিষয়ভিত্তিক বেসিক বুস্টার বুক",
  ];

  const successItems = [
    { num: "৩য় · ৬ষ্ঠ · ১০ম · ১১তম", t: "জাতীয় মেধায় টপার্স", d: "সবাই নার্সিং পাঠশালার" },
    { num: "১ম", t: "ছেলেদের মধ্যে অনীক", d: "নার্সিং পাঠশালা থেকে ১ম স্থান অর্জন" },
    { num: "টপ", t: "পেইড ব্যাচের সাফল্য", d: "সর্বোচ্চ সংখ্যক শিক্ষার্থীর সাফল্য" },
  ];

  const features = [
    { ic: "📝", t: "টপিকভিত্তিক ডিজিটাল প্রশ্নব্যাংক", d: "বিষয়, অধ্যায় ও সাল ধরে প্রশ্ন অনুশীলন" },
    { ic: "♾️", t: "আনলিমিটেড টপিকভিত্তিক পরীক্ষা", d: "লক্ষাধিক প্রশ্নে অধ্যায়ভিত্তিক প্র্যাকটিস" },
    { ic: "📖", t: "টপিকভিত্তিক দাগানো বই", d: "প্রতিটি টপিক ধরে অনলাইনে দাগানো বই পড়া" },
  ];

  const whyBest = [
    "নার্সিং ভর্তি পরীক্ষার মত হুবহু GPA সহ ১৫০ মার্ক্সে পরীক্ষা",
    "টপিকভিত্তিক র‍্যাপিড গেম, খেলতে খেলতে শিখবে পারবে",
    "নার্সিং পাঠশালায় অধ্যায়ভিত্তিক আনলিমিটেড পরীক্ষা",
    "ডেইলি ও মান্থলি পড়াশোনার পারফরম্যান্স রিপোর্ট",
    "ডিজিটাল OMR এ অফলাইনে পরীক্ষা, উত্তরপত্র দেখবে রোবট",
    "টপিক ভিত্তিক ২০০টি বেসিক টু এডভান্স আর্কাইভ ক্লাস",
  ];

  return (
    <section className="section course-section" id="course">
      <div className="container">
        <div className="section-head reveal">
          <span className="course-kicker">🎓 নার্সিং ফুল কোর্স</span>
          <h2>নার্স স্বপ্ন জয়ের মাস্টার পরিকল্পনা</h2>
          <p>ক্লাস · পরীক্ষা · ফুল সেট বই — সব এক জায়গায়। নার্সিং পাঠশালার পেইড ব্যাচে ভর্তি হয়ে নিখুঁত প্রস্তুতি নাও।</p>
        </div>

        {/* Hero card with cover image */}
        <div className="course-hero reveal">
          <div className="course-hero-img">
            <img src={COVER_IMG} alt="নার্সিং ফুল কোর্স" loading="lazy" />
            <div className="course-hero-overlay" />
            <div className="course-hero-text">
              <span className="course-badge">🏆 সম্পূর্ণ নতুন ব্যাচ</span>
              <h3>নার্সিং ফুল কোর্স</h3>
              <p>নার্সিং পাঠশালা থেকে ছেলেদের মধ্যে অনীক ১ম স্থান এবং জাতীয় মেধায় ৩য়, ৬ষ্ঠ, ১০ম — সব আমাদের পেইড ব্যাচের শিক্ষার্থী ছিল।</p>
            </div>
          </div>
          <div className="course-hero-side">
            <div className="course-price">
              <div className="course-price-row">
                <span className="price-now">৳৪,০০০</span>
                <span className="price-was">৳১০,০০০</span>
              </div>
              <span className="price-tag">🔥 ডিসকাউন্ট চলছে</span>
              <p className="price-note">নার্সিং ভর্তি পরীক্ষা পর্যন্ত ক্লাস · পরীক্ষা · বই — সব অন্তর্ভুক্ত</p>
              <a className="btn btn-primary course-cta" href={ENROLL_URL} target="_blank" rel="noreferrer" onClick={() => push("WhatsApp-এ মেসেজ পাঠানো হচ্ছে...", "info")}>
                ✅ এখনই ভর্তি হও
              </a>
              <a className="course-link" href={COURSE_URL} target="_blank" rel="noreferrer">বিস্তারিত দেখুন →</a>
            </div>
          </div>
        </div>

        {/* Package + Books */}
        <div className="course-grid reveal">
          <div className="course-card">
            <h3>📦 যা যা পাচ্ছো এই কোর্সে</h3>
            <ul className="course-list">
              {packageItems.map((it, i) => (
                <li key={i}><span className="cli-ic">{it.ic}</span><span>{it.t}</span></li>
              ))}
            </ul>
          </div>
          <div className="course-card">
            <h3>📙 নার্স স্বপ্ন পূরণের ফুল সেট বই</h3>
            <ul className="course-list">
              {bookItems.map((t, i) => (
                <li key={i}><span className="cli-bullet">📘</span><span>{t}</span></li>
              ))}
            </ul>
            <div className="course-gift">🎁 স্পেশাল গিফট: নার্সিং স্পেশাল বুকমার্ক, কলম এবং নার্সিং পাঠশালার টি-শার্ট! 👕</div>
          </div>
        </div>

        {/* Success highlights */}
        <div className="course-section-head reveal">
          <h3>🏆 নার্সিং পাঠশালার সাফল্য</h3>
          <p>এ বছর নার্সিং ভর্তি পরীক্ষায় টপ ১০ এ ৪জন নার্সিং পাঠশালার</p>
        </div>
        <div className="course-success">
          {successItems.map((s, i) => (
            <div className={`course-success-card reveal reveal-delay-${i + 1}`} key={i}>
              <span className="cs-num">{s.num}</span>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
            </div>
          ))}
        </div>

        {/* Digital features */}
        <div className="course-section-head reveal">
          <h3>🧠 নার্সিং পাঠশালার ডিজিটাল ফিচারস</h3>
        </div>
        <div className="course-features">
          {features.map((f, i) => (
            <div className={`course-feature reveal reveal-delay-${i + 1}`} key={i}>
              <span className="cf-ic">{f.ic}</span>
              <h4>{f.t}</h4>
              <p>{f.d}</p>
            </div>
          ))}
        </div>

        {/* Why best */}
        <div className="course-why reveal">
          <h3>🌟 নার্সিং পাঠশালা কেন সেরা?</h3>
          <ul className="course-why-list">
            {whyBest.map((t, i) => (
              <li key={i}><span className="cw-star">★</span><span>{t}</span></li>
            ))}
          </ul>
        </div>

        {/* Final CTA */}
        <div className="course-final-cta reveal">
          <div>
            <h3>তুমিও আমাদের ক্লাস · পরীক্ষা · ফুল সেট বই নাও</h3>
            <p>ইনশাআল্লাহ তুমিও পারবে 💖</p>
          </div>
          <a className="btn btn-primary" href={ENROLL_URL} target="_blank" rel="noreferrer" onClick={() => push("WhatsApp-এ মেসেজ পাঠানো হচ্ছে...", "info")}>
            🚀 এখনই ভর্তি হও
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============ Footer ============ */
function Footer({ onToast, totalDays }) {
  const [email, setEmail] = useState("");
  const year = BANGLA_DIGITS(new Date().getFullYear());

  const subscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmail("");
    onToast?.("সাবস্ক্রিপশন সফল হয়েছে! ধন্যবাদ 🌿", "success");
  };

  const cols = [
    {
      title: "চ্যালেঞ্জ",
      links: [
        { label: "চ্যালেঞ্জ সম্পর্কে", href: "#about" },
        { label: `${BANGLA_DIGITS(totalDays)} দিনের রুটিন`, href: "#routine" },
        { label: "রোডম্যাপ", href: "#roadmap" },
        { label: "প্রগ্রেস ট্র্যাকার", href: "#progress" },
      ],
    },
    {
      title: "রিসোর্স",
      links: [
        { label: "লাইভ ক্লাস", href: "#routine" },
        { label: "প্রশ্ন ব্যাংক", href: "#routine" },
        { label: "পরীক্ষা", href: "#routine" },
        { label: "বই", href: "#routine" },
      ],
    },
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand + social */}
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-badge">ন</span> AAP Nursing
            </div>
            <p>
              {BANGLA_DIGITS(totalDays)} দিনের স্ট্রাকচার্ড চ্যালেঞ্জের মাধ্যমে
              নার্সিং ভর্তি পরীক্ষার প্রস্তুতি। প্রতিদিনের রুটিন, লাইভ ক্লাস,
              পরীক্ষা ও প্রশ্ন ব্যাংক—সব এক প্ল্যাটফর্মে।
            </p>
            <div className="footer-social">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">▶</a>
              <a href="https://t.me" target="_blank" rel="noreferrer" aria-label="Telegram">✈</a>
              <a href="https://wa.me" target="_blank" rel="noreferrer" aria-label="WhatsApp">✆</a>
            </div>
          </div>

          {/* Link columns */}
          {cols.map((c) => (
            <div className="footer-col" key={c.title}>
              <h4>{c.title}</h4>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact + newsletter */}
          <div className="footer-col">
            <h4>যোগাযোগ</h4>
            <ul className="footer-contact">
              <li><span className="ic">📍</span> ঢাকা, বাংলাদেশ</li>
              <li><span className="ic">✆</span> +৮৮০ ১XXX-XXXXXX</li>
              <li><span className="ic">✉</span> support@aapnursing.com</li>
            </ul>
            <div className="footer-newsletter" style={{ marginTop: 16 }}>
              <p>নতুন রুটিন ও আপডেট পেতে সাবস্ক্রাইব করুন:</p>
              <form onSubmit={subscribe}>
                <input
                  type="email"
                  placeholder="আপনার ইমেইল"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit">সাবস্ক্রাইব</button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span>© {year} AAP Nursing • {BANGLA_DIGITS(totalDays)}-Day Challenge</span>
          <span className="made">
            Made with <span className="heart">❤</span> in Bangladesh
          </span>
          <span>
            <a href="#about">Privacy</a> &nbsp;•&nbsp; <a href="#about">Terms</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ============ Register modal ============ */
function RegisterModal({ onClose, onRegister }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !mobile.trim()) { setError("নাম ও মোবাইল নাম্বার দিন।"); return; }
    setBusy(true);
    try { await onRegister(name.trim(), mobile.trim()); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="বন্ধ করুন">✕</button>
        <h2>আপনার {BANGLA_DIGITS(150)} দিনের Challenge শুরু করুন</h2>
        <p className="sub">আপনি যেদিন Registration করবেন, সেই দিন থেকেই আপনার Day-1 গণনা শুরু হবে।</p>
        <form onSubmit={submit}>
          <div className="form-group"><label>আপনার নাম</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম লিখুন" autoFocus required /></div>
          <div className="form-group"><label>মোবাইল নাম্বার</label><input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" required /></div>
          {error && <div className="error-msg">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-soft" onClick={onClose}>পরে</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : "🚀 আমার Challenge শুরু করি"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============ Resource modal ============ */
function ResourceModal({ resource, onClose }) {
  if (!resource) return null;
  const labels = { class: "লাইভ ক্লাস", question: "প্রশ্নব্যাংক", exam: "পরীক্ষা", book: "বই" };
  const linkMap = { class: "live_class_link", question: "question_bank_link", exam: "exam_link", book: "book_link" };
  const link = resource.data?.[linkMap[resource.type]];
  const t = resource.data;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="বন্ধ করুন">✕</button>
        <h2>{labels[resource.type]}</h2>
        <p className="sub">Day-{BANGLA_DIGITS(t.day_number)} · {t.subject} · {t.lecture}</p>
        <div className="success-note">টপিক: {t.bsc_topic || t.diploma_topic || "—"}</div>
        {link ? (
          <a className="btn btn-primary" href={link} target="_blank" rel="noreferrer" style={{ width: "100%" }}>খুলুন →</a>
        ) : (
          <div className="error-msg">এই রিসোর্সের লিংক এখনও যুক্ত করা হয়নি।</div>
        )}
      </div>
    </div>
  );
}

/* ============ Toast stack ============ */
function ToastStack({ toasts }) {
  const icons = { success: "✅", info: "ℹ️", warn: "⚠️" };
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type} ${t.out ? "out" : ""}`}>
          <span>{icons[t.type] || "ℹ️"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
