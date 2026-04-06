import { useState, useEffect, useRef } from "react";
import "./index.css";

const GOAL  = 60;
const START = 65;
const DAYS  = 30;

const MEALS = {
  Mon: {
    breakfast: { name: "Scrambled Eggs + Whole Wheat Toast", cals: 320 },
    lunch:     { name: "Grilled Chicken Salad",              cals: 380 },
    dinner:    { name: "Baked Tilapia + Steamed Veggies",    cals: 350 },
  },
  Tue: {
    breakfast: { name: "Oatmeal + Banana",             cals: 300 },
    lunch:     { name: "Lentil Soup + Injera (small)", cals: 400 },
    dinner:    { name: "Grilled Lean Beef + Salad",    cals: 420 },
  },
  Wed: {
    breakfast: { name: "Greek Yogurt + Fresh Fruit",    cals: 280 },
    lunch:     { name: "Tuna Sandwich (whole wheat)",   cals: 390 },
    dinner:    { name: "Chicken Tibs + Greens",         cals: 400 },
  },
  Thu: {
    breakfast: { name: "Boiled Eggs + Avocado",              cals: 310 },
    lunch:     { name: "Brown Rice + Misir (Lentils)",       cals: 420 },
    dinner:    { name: "Grilled Fish + Stir-fried Veggies",  cals: 360 },
  },
  Fri: {
    breakfast: { name: "Smoothie Bowl",                       cals: 290 },
    lunch:     { name: "Shiro + 1 Injera",                    cals: 380 },
    dinner:    { name: "Baked Chicken Thighs + Sweet Potato", cals: 430 },
  },
  Sat: {
    breakfast: { name: "Oat Pancakes + Egg",       cals: 340 },
    lunch:     { name: "Beef & Veggie Stir-fry",   cals: 410 },
    dinner:    { name: "Grilled Chicken + Quinoa", cals: 420 },
  },
  Sun: {
    breakfast: { name: "Ful (Fava Beans) + Egg",      cals: 350 },
    lunch:     { name: "Vegetable Stew (Atakilt Wat)", cals: 320 },
    dinner:    { name: "Light Soup + Salad",           cals: 300 },
  },
};

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BADGES = [
  { id: "first_log", icon: "🌱", label: "First Step",     desc: "Logged your first weight",       condition: (l) => l.length >= 1 },
  { id: "week_1",   icon: "🔥", label: "Week 1 Done",    desc: "Survived the first week",         condition: (l) => l.length >= 7 },
  { id: "halfway",  icon: "⚡", label: "Halfway There",  desc: "15 days in — don't stop",         condition: (l) => l.length >= 15 },
  { id: "minus_1",  icon: "💪", label: "-1 kg Down",     desc: "Lost your first kilogram",        condition: (l) => l.some(x => x.weight <= START - 1) },
  { id: "minus_2",  icon: "🏃", label: "-2 kg Strong",   desc: "Two kilograms gone",              condition: (l) => l.some(x => x.weight <= START - 2) },
  { id: "minus_3",  icon: "🎯", label: "-3 kg Locked In",desc: "You're past the halfway mark",   condition: (l) => l.some(x => x.weight <= START - 3) },
  { id: "goal",     icon: "🏆", label: "60 kg Reached!", desc: "You actually did it.",            condition: (l) => l.some(x => x.weight <= GOAL) },
  {
    id: "streak_7", icon: "🗓️", label: "7-Day Streak", desc: "Logged 7 days in a row",
    condition: (logs) => {
      if (logs.length < 7) return false;
      const s = [...logs].sort((a, b) => a.day - b.day);
      let streak = 1;
      for (let i = 1; i < s.length; i++) {
        streak = s[i].day === s[i-1].day + 1 ? streak + 1 : 1;
        if (streak >= 7) return true;
      }
      return false;
    },
  },
];

const MOTIVATIONS = [
  "Every gram counts. You got this. 🔥",
  "Discipline > motivation. Show up anyway.",
  "Your future self is watching. Don't disappoint him.",
  "60 kg is closer than yesterday.",
  "Pain is temporary. That body is permanent.",
  "You're 17 and building habits most adults never do.",
  "VMI needs you at your best. Train like it.",
  "Small steps, big results. Keep going.",
];

const MEAL_EMOJI = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
const MEAL_COLOR = {
  breakfast: { hex: "#f59e0b", rgb: "245,158,11",  glow: "rgba(245,158,11,0.35)" },
  lunch:     { hex: "#22c55e", rgb: "34,197,94",   glow: "rgba(34,197,94,0.35)"  },
  dinner:    { hex: "#818cf8", rgb: "129,140,248",  glow: "rgba(129,140,248,0.35)" },
};

// Storage with localStorage fallback
const store = {
  get: async (key) => {
    if (window.storage?.get) return window.storage.get(key);
    const v = localStorage.getItem(key);
    return v !== null ? { value: v } : null;
  },
  set: async (key, value) => {
    if (window.storage?.set) return window.storage.set(key, value);
    localStorage.setItem(key, value);
  },
};

// ── Chart ────────────────────────────────────────────────────────────────────
function WeightChart({ logs }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || logs.length < 1) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const pad = { top: 24, right: 24, bottom: 34, left: 48 };
    const gW = W - pad.left - pad.right;
    const gH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    const sorted = [...logs].sort((a, b) => a.day - b.day);
    const allW   = [START, ...sorted.map(l => l.weight), GOAL];
    const minW   = Math.min(...allW) - 0.8;
    const maxW   = Math.max(...allW) + 0.8;

    const xS = d => pad.left + ((d - 1) / (DAYS - 1)) * gW;
    const yS = w => pad.top  + (1 - (w - minW) / (maxW - minW)) * gH;

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y   = pad.top + (i / 4) * gH;
      const val = maxW - (i / 4) * (maxW - minW);
      ctx.beginPath();
      ctx.strokeStyle = i === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "10px monospace"; ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), pad.left - 8, y + 4);
    }

    // Goal line
    const goalY = yS(GOAL);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(34,197,94,0.38)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.left, goalY); ctx.lineTo(W - pad.right, goalY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(34,197,94,0.75)";
    ctx.font = "9px monospace"; ctx.textAlign = "left";
    ctx.fillText("GOAL 60 kg", pad.left + 5, goalY - 5);

    // Start dot
    ctx.beginPath();
    ctx.arc(xS(1), yS(START), 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(148,163,184,0.5)";
    ctx.fill();

    if (!sorted.length) return;

    // Area fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, "rgba(34,197,94,0.28)");
    grad.addColorStop(1, "rgba(34,197,94,0.0)");
    ctx.beginPath();
    ctx.moveTo(xS(sorted[0].day), yS(sorted[0].weight));
    sorted.forEach(l => ctx.lineTo(xS(l.day), yS(l.weight)));
    ctx.lineTo(xS(sorted[sorted.length - 1].day), H - pad.bottom);
    ctx.lineTo(xS(sorted[0].day), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xS(sorted[0].day), yS(sorted[0].weight));
    sorted.forEach(l => ctx.lineTo(xS(l.day), yS(l.weight)));
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";
    ctx.stroke();

    // Dots with glow
    sorted.forEach(l => {
      ctx.shadowColor = "rgba(34,197,94,0.7)";
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(xS(l.day), yS(l.weight), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#070d09";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Day labels
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    [1, 7, 14, 21, 28, 30].forEach(d => {
      ctx.fillText(`D${d}`, xS(d), H - pad.bottom + 18);
    });
  }, [logs]);

  return (
    <canvas
      ref={ref}
      width={580}
      height={210}
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function WeightTracker() {
  const [logs,         setLogs]         = useState([]);
  const [currentDay,   setCurrentDay]   = useState(1);
  const [inputWeight,  setInputWeight]  = useState("");
  const [checkedMeals, setCheckedMeals] = useState({});
  const [tab,          setTab]          = useState("today");
  const [toast,        setToast]        = useState(null);
  const [toastType,    setToastType]    = useState("ok");
  const [newBadge,     setNewBadge]     = useState(null);
  const [loaded,       setLoaded]       = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          store.get("wl_logs"), store.get("wl_day"), store.get("wl_meals"),
        ]);
        if (r1) setLogs(JSON.parse(r1.value));
        if (r2) setCurrentDay(parseInt(r2.value, 10));
        if (r3) setCheckedMeals(JSON.parse(r3.value));
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    store.set("wl_logs",  JSON.stringify(logs)).catch(() => {});
    store.set("wl_day",   String(currentDay)).catch(() => {});
    store.set("wl_meals", JSON.stringify(checkedMeals)).catch(() => {});
  }, [logs, currentDay, checkedMeals, loaded]);

  // Derived
  const dayKey          = DAY_KEYS[(currentDay - 1) % 7];
  const todayMeals      = MEALS[dayKey];
  const todayLog        = logs.find(l => l.day === currentDay);
  const latestWeight    = logs.length
    ? [...logs].sort((a, b) => b.day - a.day)[0].weight
    : START;
  const lost            = +(START - latestWeight).toFixed(1);
  const remaining       = +(latestWeight - GOAL).toFixed(1);
  const progress        = Math.min((lost / (START - GOAL)) * 100, 100);
  const motivation      = MOTIVATIONS[(currentDay - 1) % MOTIVATIONS.length];
  const todayChecks     = checkedMeals[currentDay] || {};
  const mealCount       = Object.values(todayChecks).filter(Boolean).length;
  const earnedBadges    = BADGES.filter(b => b.condition(logs));

  function showToast(msg, type = "ok") {
    clearTimeout(toastTimer.current);
    setToast(msg);
    setToastType(type);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function logWeight() {
    const w = parseFloat(inputWeight);
    if (isNaN(w) || w < 40 || w > 120) {
      showToast("Enter a valid weight (40–120 kg)", "error");
      return;
    }
    const prev    = earnedBadges.map(b => b.id);
    const newLogs = [...logs.filter(l => l.day !== currentDay), { day: currentDay, weight: w, timestamp: Date.now() }];
    setLogs(newLogs);
    setInputWeight("");
    showToast(`Day ${currentDay}: ${w} kg logged ✓`);
    setTimeout(() => {
      const fresh = BADGES.filter(b => b.condition(newLogs)).find(b => !prev.includes(b.id));
      if (fresh) setNewBadge(fresh);
    }, 600);
  }

  function toggleMeal(meal) {
    setCheckedMeals(prev => ({
      ...prev,
      [currentDay]: { ...(prev[currentDay] || {}), [meal]: !((prev[currentDay] || {})[meal]) },
    }));
  }

  function changeDay(delta) {
    setCurrentDay(d => Math.min(DAYS, Math.max(1, d + delta)));
  }

  if (!loaded) {
    return (
      <div className="loading">
        <div className="loading-dot" />
        Loading
      </div>
    );
  }

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-top">
          <div>
            <div className="title-label">30-Day Program</div>
            <div className="title-main">Weight Journey</div>
          </div>
          <div className="day-badge">
            <div className="day-num">{currentDay}</div>
            <div className="day-label">Day</div>
          </div>
        </div>

        <div className="stats-row">
          {[
            { val: `${latestWeight} kg`, lbl: "Current" },
            { val: lost > 0 ? `-${lost} kg` : "0 kg",  lbl: "Lost"    },
            { val: `${remaining} kg`,                   lbl: "To Goal" },
            { val: `${earnedBadges.length}/${BADGES.length}`, lbl: "Badges" },
          ].map(({ val, lbl }) => (
            <div key={lbl} className="stat-box">
              <div className={`stat-val${val.length > 7 ? " small" : ""}`}>{val}</div>
              <div className="stat-lbl">{lbl}</div>
            </div>
          ))}
        </div>

        <div className="progress-wrap">
          <div className="progress-labels">
            <span>65 kg</span>
            <span className="pct">{progress.toFixed(0)}% to goal</span>
            <span>60 kg</span>
          </div>
          <div className="progress-bg">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="tabs">
        {[["today","Today"],["chart","Chart"],["meals","Meals"],["badges","Badges"]].map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn${tab === key ? " active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Body ── */}
      <main className="body">

        {/* TODAY */}
        {tab === "today" && (
          <div className="tab-content">
            <div className="card motivation-card">
              <div className="motivation-day">Day {currentDay} · {dayKey}</div>
              <div className="motivation-text">"{motivation}"</div>
            </div>

            <div className="card">
              <div className="card-title">Log Today's Weight</div>
              {todayLog && (
                <div className="already-logged">
                  <span>✓</span> Logged: {todayLog.weight} kg
                </div>
              )}
              <div className="input-row">
                <input
                  className="weight-input"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 64.5"
                  value={inputWeight}
                  onChange={e => setInputWeight(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && logWeight()}
                />
                <button className="log-btn" onClick={logWeight}>LOG</button>
              </div>
            </div>

            <div className="card">
              <div className="meals-header">
                <div className="card-title" style={{ marginBottom: 0 }}>Today's Meals</div>
                <div className={`meal-count ${mealCount === 3 ? "done" : "pending"}`}>
                  {mealCount}/3 eaten
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                {Object.entries(todayMeals).map(([meal, info]) => {
                  const checked = !!(todayChecks[meal]);
                  const c = MEAL_COLOR[meal];
                  return (
                    <div
                      key={meal}
                      className={`meal-item ${checked ? "checked" : "unchecked"}`}
                      style={checked ? {
                        "--meal-c-border": c.hex + "44",
                        "--meal-c-bg":     `rgba(${c.rgb},0.07)`,
                      } : {}}
                      onClick={() => toggleMeal(meal)}
                    >
                      <div
                        className={`checkbox ${checked ? "checked" : ""}`}
                        style={{ "--meal-c": c.hex, "--meal-c-glow": c.glow }}
                      >
                        {checked && <span className="checkbox-tick">✓</span>}
                      </div>
                      <div className="meal-info">
                        <div className="meal-name">{MEAL_EMOJI[meal]} {info.name}</div>
                        <div className="meal-cals">{info.cals} kcal</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="day-nav">
              <button className="nav-btn" onClick={() => changeDay(-1)} disabled={currentDay === 1}>← Prev</button>
              <span className="nav-label">Day {currentDay} of <span>{DAYS}</span></span>
              <button className="nav-btn" onClick={() => changeDay(1)} disabled={currentDay === DAYS}>Next →</button>
            </div>
          </div>
        )}

        {/* CHART */}
        {tab === "chart" && (
          <div className="tab-content">
            <div className="card">
              <div className="card-title">Weight Progress</div>
              {logs.length < 1
                ? <div className="chart-empty">Log your first weight to see the chart</div>
                : <WeightChart logs={logs} />
              }
            </div>

            <div className="card">
              <div className="card-title">Log History</div>
              {logs.length === 0
                ? <div style={{ color: "var(--text-dim)", fontSize: 11 }}>No entries yet</div>
                : [...logs].sort((a, b) => b.day - a.day).map(l => (
                  <div key={l.day} className="history-entry">
                    <span className="history-day">Day {l.day} · {DAY_KEYS[(l.day - 1) % 7]}</span>
                    <span>
                      <span className={`history-weight ${l.weight < START ? "loss" : "same"}`}>
                        {l.weight} kg
                      </span>
                      {l.weight < START && (
                        <span className="history-diff">−{(START - l.weight).toFixed(1)}</span>
                      )}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* MEALS */}
        {tab === "meals" && (
          <div className="tab-content">
            <div className="day-nav">
              <button className="nav-btn" onClick={() => changeDay(-1)} disabled={currentDay === 1}>← Prev</button>
              <span className="nav-label">Day {currentDay} · <span>{dayKey}</span></span>
              <button className="nav-btn" onClick={() => changeDay(1)} disabled={currentDay === DAYS}>Next →</button>
            </div>

            {Object.entries(MEALS[dayKey]).map(([meal, info]) => {
              const checked = !!(todayChecks[meal]);
              const c = MEAL_COLOR[meal];
              return (
                <div
                  key={meal}
                  className="card meal-card-big"
                  style={{
                    borderColor: checked ? c.hex + "40" : "var(--border)",
                    background: checked ? `rgba(${c.rgb},0.06)` : "var(--bg-card)",
                  }}
                  onClick={() => toggleMeal(meal)}
                >
                  <div className="meal-card-header">
                    <span className="meal-type-label" style={{ color: c.hex }}>
                      {MEAL_EMOJI[meal]} {meal}
                    </span>
                    <div
                      className={`checkbox ${checked ? "checked" : ""}`}
                      style={{ "--meal-c": c.hex, "--meal-c-glow": c.glow, width: 22, height: 22 }}
                    >
                      {checked && <span className="checkbox-tick">✓</span>}
                    </div>
                  </div>
                  <div className="meal-card-name">{info.name}</div>
                  <div className="meal-card-cals">🔥 {info.cals} kcal</div>
                </div>
              );
            })}

            <div className="tap-hint">Tap a meal to mark it as eaten</div>
          </div>
        )}

        {/* BADGES */}
        {tab === "badges" && (
          <div className="tab-content">
            <div className="badges-meta">
              <span>{earnedBadges.length}</span> of {BADGES.length} earned
            </div>
            <div className="badge-grid">
              {BADGES.map(b => {
                const earned = b.condition(logs);
                return (
                  <div key={b.id} className={`badge-item ${earned ? "earned" : "locked"}`}>
                    <div className="badge-icon">{b.icon}</div>
                    <div className="badge-label">{b.label}</div>
                    <div className="badge-desc">{b.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Toast ── */}
      {toast && <div className={`toast ${toastType === "error" ? "error" : ""}`}>{toast}</div>}

      {/* ── Badge Modal ── */}
      {newBadge && (
        <div className="modal-overlay" onClick={() => setNewBadge(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">{newBadge.icon}</div>
            <div className="modal-title">Badge Unlocked</div>
            <div className="modal-label">{newBadge.label}</div>
            <div className="modal-desc">{newBadge.desc}</div>
            <button className="modal-btn" onClick={() => setNewBadge(null)}>
              LET'S GO 🔥
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
