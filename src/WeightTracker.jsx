import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
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
    breakfast: { name: "Oatmeal + Banana",              cals: 300 },
    lunch:     { name: "Lentil Soup + Injera (small)",  cals: 400 },
    dinner:    { name: "Grilled Lean Beef + Salad",     cals: 420 },
  },
  Wed: {
    breakfast: { name: "Greek Yogurt + Fresh Fruit",       cals: 280 },
    lunch:     { name: "Tuna Sandwich (whole wheat)",       cals: 390 },
    dinner:    { name: "Chicken Tibs + Greens",             cals: 400 },
  },
  Thu: {
    breakfast: { name: "Boiled Eggs + Avocado",             cals: 310 },
    lunch:     { name: "Brown Rice + Misir (Lentils)",      cals: 420 },
    dinner:    { name: "Grilled Fish + Stir-fried Veggies", cals: 360 },
  },
  Fri: {
    breakfast: { name: "Smoothie Bowl",                        cals: 290 },
    lunch:     { name: "Shiro + 1 Injera",                     cals: 380 },
    dinner:    { name: "Baked Chicken Thighs + Sweet Potato",  cals: 430 },
  },
  Sat: {
    breakfast: { name: "Oat Pancakes + Egg",       cals: 340 },
    lunch:     { name: "Beef & Veggie Stir-fry",   cals: 410 },
    dinner:    { name: "Grilled Chicken + Quinoa", cals: 420 },
  },
  Sun: {
    breakfast: { name: "Ful (Fava Beans) + Egg",     cals: 350 },
    lunch:     { name: "Vegetable Stew (Atakilt Wat)", cals: 320 },
    dinner:    { name: "Light Soup + Salad",           cals: 300 },
  },
};

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BADGES = [
  {
    id: "first_log", icon: "🌱", label: "First Step",
    desc: "Logged your first weight",
    condition: (logs) => logs.length >= 1,
  },
  {
    id: "week_1", icon: "🔥", label: "Week 1 Done",
    desc: "Survived the first week",
    condition: (logs) => logs.length >= 7,
  },
  {
    id: "halfway", icon: "⚡", label: "Halfway There",
    desc: "15 days in — don't stop",
    condition: (logs) => logs.length >= 15,
  },
  {
    id: "minus_1", icon: "💪", label: "-1 kg Down",
    desc: "Lost your first kilogram",
    condition: (logs) => logs.some((l) => l.weight <= START - 1),
  },
  {
    id: "minus_2", icon: "🏃", label: "-2 kg Strong",
    desc: "Two kilograms gone",
    condition: (logs) => logs.some((l) => l.weight <= START - 2),
  },
  {
    id: "minus_3", icon: "🎯", label: "-3 kg Locked In",
    desc: "You're past the halfway mark",
    condition: (logs) => logs.some((l) => l.weight <= START - 3),
  },
  {
    id: "goal", icon: "🏆", label: "60 kg Reached!",
    desc: "You actually did it.",
    condition: (logs) => logs.some((l) => l.weight <= GOAL),
  },
  {
    id: "streak_7", icon: "🗓️", label: "7-Day Streak",
    desc: "Logged 7 days in a row",
    condition: (logs) => {
      if (logs.length < 7) return false;
      const sorted = [...logs].sort((a, b) => a.day - b.day);
      let streak = 1;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].day === sorted[i - 1].day + 1) streak++;
        else streak = 1;
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

// ─── Storage helper (falls back to localStorage if window.storage absent) ─────
const store = {
  get: async (key) => {
    if (window.storage?.get) return window.storage.get(key);
    const value = localStorage.getItem(key);
    return value !== null ? { value } : null;
  },
  set: async (key, value) => {
    if (window.storage?.set) return window.storage.set(key, value);
    localStorage.setItem(key, value);
  },
};

// ─── Utility ──────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function WeightChart({ logs }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || logs.length < 1) return;
    const ctx  = canvas.getContext("2d");
    const W    = canvas.width;
    const H    = canvas.height;
    const pad  = { top: 20, right: 20, bottom: 30, left: 44 };
    const gW   = W - pad.left - pad.right;
    const gH   = H - pad.top  - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    const sorted = [...logs].sort((a, b) => a.day - b.day);
    const allW   = [START, ...sorted.map((l) => l.weight), GOAL];
    const minW   = Math.min(...allW) - 0.5;
    const maxW   = Math.max(...allW) + 0.5;

    const xScale = (day) => pad.left + ((day - 1) / (DAYS - 1)) * gW;
    const yScale = (w)   => pad.top  + (1 - (w - minW) / (maxW - minW)) * gH;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const y   = pad.top + (i / 4) * gH;
      const val = maxW - (i / 4) * (maxW - minW);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillStyle  = "rgba(255,255,255,0.3)";
      ctx.font       = "10px monospace";
      ctx.textAlign  = "right";
      ctx.fillText(val.toFixed(1), pad.left - 6, y + 4);
    }

    // Goal line
    const goalY = yScale(GOAL);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(34,197,94,0.4)";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, goalY);
    ctx.lineTo(W - pad.right, goalY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(34,197,94,0.7)";
    ctx.font      = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("GOAL 60kg", pad.left + 4, goalY - 4);

    // Start dot
    ctx.beginPath();
    ctx.arc(xScale(1), yScale(START), 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(148,163,184,0.6)";
    ctx.fill();

    if (sorted.length === 0) return;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, "rgba(34,197,94,0.3)");
    grad.addColorStop(1, "rgba(34,197,94,0)");
    ctx.beginPath();
    ctx.moveTo(xScale(sorted[0].day), yScale(sorted[0].weight));
    sorted.forEach((l) => ctx.lineTo(xScale(l.day), yScale(l.weight)));
    ctx.lineTo(xScale(sorted[sorted.length - 1].day), H - pad.bottom);
    ctx.lineTo(xScale(sorted[0].day), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xScale(sorted[0].day), yScale(sorted[0].weight));
    sorted.forEach((l) => ctx.lineTo(xScale(l.day), yScale(l.weight)));
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = "round";
    ctx.stroke();

    // Dots
    sorted.forEach((l) => {
      ctx.beginPath();
      ctx.arc(xScale(l.day), yScale(l.weight), 4, 0, Math.PI * 2);
      ctx.fillStyle   = "#22c55e";
      ctx.fill();
      ctx.strokeStyle = "#0f1a14";
      ctx.lineWidth   = 2;
      ctx.stroke();
    });

    // Day labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font      = "9px monospace";
    ctx.textAlign = "center";
    [1, 7, 14, 21, 28, 30].forEach((d) => {
      ctx.fillText(`D${d}`, xScale(d), H - pad.bottom + 16);
    });
  }, [logs]);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={200}
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeightTracker() {
  const [logs,         setLogs]         = useState([]);
  const [currentDay,   setCurrentDay]   = useState(1);
  const [inputWeight,  setInputWeight]  = useState("");
  const [checkedMeals, setCheckedMeals] = useState({});
  const [tab,          setTab]          = useState("today");
  const [toast,        setToast]        = useState(null);
  const [newBadge,     setNewBadge]     = useState(null);
  const [loaded,       setLoaded]       = useState(false);

  // Load from storage
  useEffect(() => {
    async function load() {
      try {
        const r1 = await store.get("wl_logs");
        const r2 = await store.get("wl_day");
        const r3 = await store.get("wl_meals");
        if (r1) setLogs(JSON.parse(r1.value));
        if (r2) setCurrentDay(parseInt(r2.value, 10));
        if (r3) setCheckedMeals(JSON.parse(r3.value));
      } catch (_) { /* storage unavailable — start fresh */ }
      setLoaded(true);
    }
    load();
  }, []);

  // Save to storage
  useEffect(() => {
    if (!loaded) return;
    store.set("wl_logs",   JSON.stringify(logs)).catch(() => {});
    store.set("wl_day",    String(currentDay)).catch(() => {});
    store.set("wl_meals",  JSON.stringify(checkedMeals)).catch(() => {});
  }, [logs, currentDay, checkedMeals, loaded]);

  // Derived values
  const dayKey         = DAY_KEYS[(currentDay - 1) % 7];
  const todayMeals     = MEALS[dayKey];
  const todayLog       = logs.find((l) => l.day === currentDay);
  const latestWeight   = logs.length > 0
    ? [...logs].sort((a, b) => b.day - a.day)[0].weight
    : START;
  const lost           = +(START - latestWeight).toFixed(1);
  const remaining      = +(latestWeight - GOAL).toFixed(1);
  const progress       = Math.min((lost / (START - GOAL)) * 100, 100);
  const motivation     = MOTIVATIONS[(currentDay - 1) % MOTIVATIONS.length];
  const todayMealChecks = checkedMeals[currentDay] || {};
  const mealCount      = Object.values(todayMealChecks).filter(Boolean).length;
  const earnedBadges   = BADGES.filter((b) => b.condition(logs));

  const mealEmoji = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
  const mealColor = { breakfast: "#f59e0b", lunch: "#22c55e", dinner: "#818cf8" };

  // ── Actions ──
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function logWeight() {
    const w = parseFloat(inputWeight);
    if (isNaN(w) || w < 40 || w > 120) {
      showToast("Enter a valid weight (40–120 kg)");
      return;
    }
    const prev    = earnedBadges.map((b) => b.id);
    const newLogs = logs.filter((l) => l.day !== currentDay);
    newLogs.push({ day: currentDay, weight: w, timestamp: Date.now() });
    setLogs(newLogs);
    setInputWeight("");
    showToast(`Day ${currentDay} logged: ${w} kg ✓`);

    setTimeout(() => {
      const next  = BADGES.filter((b) => b.condition(newLogs));
      const fresh = next.find((b) => !prev.includes(b.id));
      if (fresh) setNewBadge(fresh);
    }, 500);
  }

  function toggleMeal(meal) {
    setCheckedMeals((prev) => ({
      ...prev,
      [currentDay]: {
        ...(prev[currentDay] || {}),
        [meal]: !((prev[currentDay] || {})[meal]),
      },
    }));
  }

  // ── Styles ──
  const S = {
    app: {
      fontFamily: "'Courier New', Courier, monospace",
      background: "#080f0a",
      minHeight:  "100vh",
      color:      "#e2e8e4",
      maxWidth:   600,
      margin:     "0 auto",
      position:   "relative",
      overflow:   "hidden",
    },
    glow: {
      position:      "fixed",
      top:           -100,
      left:          "50%",
      transform:     "translateX(-50%)",
      width:         400,
      height:        400,
      background:    "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
      pointerEvents: "none",
      zIndex:        0,
    },
    header: {
      padding:      "18px 20px 14px",
      borderBottom: "1px solid rgba(34,197,94,0.15)",
      position:     "relative",
      zIndex:       1,
    },
    topRow:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    titleSmall: { fontSize: 10, letterSpacing: 4, color: "#22c55e", textTransform: "uppercase", marginBottom: 4 },
    titleBig:   { fontSize: 22, fontWeight: "bold", color: "#f0f5f1", margin: 0, letterSpacing: -0.5 },
    dayBadge: {
      background:   "rgba(34,197,94,0.1)",
      border:       "1px solid rgba(34,197,94,0.3)",
      borderRadius: 8,
      padding:      "6px 12px",
      textAlign:    "center",
    },
    dayNum:   { fontSize: 20, fontWeight: "bold", color: "#22c55e", lineHeight: 1 },
    dayLabel: { fontSize: 9, color: "#4a7a55", letterSpacing: 2, textTransform: "uppercase" },
    progressWrap:  { marginTop: 14 },
    progressLabel: {
      display:        "flex",
      justifyContent: "space-between",
      fontSize:       10,
      color:          "#4a7a55",
      marginBottom:   6,
      letterSpacing:  1,
    },
    progressBg: {
      height:       6,
      background:   "rgba(255,255,255,0.06)",
      borderRadius: 3,
      overflow:     "hidden",
    },
    progressFill: {
      height:     "100%",
      borderRadius: 3,
      background: "linear-gradient(90deg, #16a34a, #22c55e, #4ade80)",
      transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
      boxShadow:  "0 0 8px rgba(34,197,94,0.5)",
    },
    statsRow: { display: "flex", gap: 8, marginTop: 12 },
    statBox: {
      flex:         1,
      background:   "rgba(255,255,255,0.03)",
      border:       "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding:      "8px 10px",
      textAlign:    "center",
    },
    statVal: { fontSize: 18, fontWeight: "bold", color: "#22c55e" },
    statLbl: { fontSize: 9, color: "#4a7a55", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
    tabs: {
      display:      "flex",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      position:     "relative",
      zIndex:       1,
    },
    tab: (active) => ({
      flex:         1,
      padding:      "12px 0",
      fontSize:     11,
      letterSpacing: 2,
      textTransform: "uppercase",
      background:   "none",
      border:       "none",
      cursor:       "pointer",
      fontFamily:   "inherit",
      color:        active ? "#22c55e" : "#4a7a55",
      borderBottom: active ? "2px solid #22c55e" : "2px solid transparent",
      transition:   "all 0.2s",
    }),
    body:      { padding: "18px 20px", position: "relative", zIndex: 1 },
    card: {
      background:   "rgba(255,255,255,0.03)",
      border:       "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding:      "14px 16px",
      marginBottom: 12,
    },
    cardTitle: {
      fontSize:      10,
      letterSpacing: 3,
      color:         "#4a7a55",
      textTransform: "uppercase",
      marginBottom:  10,
    },
    inputRow: { display: "flex", gap: 10, alignItems: "center" },
    input: {
      flex:        1,
      background:  "rgba(255,255,255,0.04)",
      border:      "1px solid rgba(34,197,94,0.3)",
      borderRadius: 8,
      padding:     "11px 14px",
      color:       "#f0f5f1",
      fontSize:    18,
      fontFamily:  "inherit",
      outline:     "none",
    },
    logBtn: {
      background:   "#22c55e",
      border:       "none",
      borderRadius: 8,
      padding:      "11px 18px",
      color:        "#080f0a",
      fontWeight:   "bold",
      fontSize:     13,
      cursor:       "pointer",
      fontFamily:   "inherit",
      letterSpacing: 1,
      transition:   "transform 0.1s, box-shadow 0.2s",
      boxShadow:    "0 0 12px rgba(34,197,94,0.3)",
    },
    mealItem: (checked, color) => ({
      display:    "flex",
      alignItems: "center",
      gap:        12,
      padding:    "10px 12px",
      borderRadius: 8,
      marginBottom: 6,
      cursor:     "pointer",
      background: checked ? `rgba(${hexToRgb(color)},0.08)` : "rgba(255,255,255,0.02)",
      border:     `1px solid ${checked ? color + "44" : "rgba(255,255,255,0.05)"}`,
      transition: "all 0.2s",
    }),
    checkbox: (checked, color) => ({
      width:          18,
      height:         18,
      borderRadius:   4,
      border:         `2px solid ${checked ? color : "#2a3a2a"}`,
      background:     checked ? color : "transparent",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      flexShrink:     0,
      transition:     "all 0.15s",
    }),
    mealInfo: { flex: 1 },
    mealName: (checked) => ({
      fontSize: 12,
      color:    checked ? "#e2e8e4" : "#6b8a6b",
    }),
    mealCals: { fontSize: 10, color: "#4a7a55", marginTop: 2 },
    dayNav: {
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      marginBottom:   14,
    },
    navBtn: {
      background:   "rgba(255,255,255,0.04)",
      border:       "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6,
      padding:      "6px 14px",
      color:        "#4a7a55",
      cursor:       "pointer",
      fontFamily:   "inherit",
      fontSize:     12,
    },
    badgeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    badgeItem: (earned) => ({
      background:   earned ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
      border:       `1px solid ${earned ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.05)"}`,
      borderRadius: 10,
      padding:      "10px 12px",
      opacity:      earned ? 1 : 0.4,
    }),
    badgeIcon:  { fontSize: 22, marginBottom: 4 },
    badgeLabel: (earned) => ({
      fontSize:   11,
      fontWeight: "bold",
      color:      earned ? "#e2e8e4" : "#4a7a55",
    }),
    badgeDesc: { fontSize: 9, color: "#4a7a55", marginTop: 2, lineHeight: 1.4 },
    toast: {
      position:    "fixed",
      bottom:      24,
      left:        "50%",
      transform:   "translateX(-50%)",
      background:  "#22c55e",
      color:       "#080f0a",
      borderRadius: 20,
      padding:     "10px 20px",
      fontSize:    13,
      fontWeight:  "bold",
      zIndex:      100,
      boxShadow:   "0 4px 20px rgba(34,197,94,0.4)",
      whiteSpace:  "nowrap",
      animation:   "fadeUp 0.3s ease",
    },
    modal: {
      position:       "fixed",
      inset:          0,
      background:     "rgba(0,0,0,0.8)",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      zIndex:         200,
    },
    modalBox: {
      background:   "#0f1a14",
      border:       "1px solid rgba(34,197,94,0.4)",
      borderRadius: 16,
      padding:      "32px 28px",
      textAlign:    "center",
      maxWidth:     280,
      boxShadow:    "0 0 40px rgba(34,197,94,0.2)",
      animation:    "pop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    },
  };

  if (!loaded) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#4a7a55" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={S.app}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pop {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number]::-moz-appearance { appearance: textfield; }
        button:active { transform: scale(0.96) !important; }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a3a1a; border-radius: 2px; }
      `}</style>

      <div style={S.glow} />

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.topRow}>
          <div>
            <div style={S.titleSmall}>30-Day Program</div>
            <div style={S.titleBig}>Weight Journey</div>
          </div>
          <div style={S.dayBadge}>
            <div style={S.dayNum}>{currentDay}</div>
            <div style={S.dayLabel}>Day</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={S.statsRow}>
          {[
            { val: `${latestWeight} kg`, lbl: "Current" },
            { val: lost > 0 ? `-${lost} kg` : "0 kg", lbl: "Lost" },
            { val: `${remaining} kg`, lbl: "To Goal" },
            { val: `${earnedBadges.length}/${BADGES.length}`, lbl: "Badges" },
          ].map(({ val, lbl }) => (
            <div key={lbl} style={S.statBox}>
              <div style={{ ...S.statVal, fontSize: val.length > 6 ? 14 : 18 }}>{val}</div>
              <div style={S.statLbl}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={S.progressWrap}>
          <div style={S.progressLabel}>
            <span>65 kg</span>
            <span style={{ color: "#22c55e" }}>{progress.toFixed(0)}% to goal</span>
            <span>60 kg</span>
          </div>
          <div style={S.progressBg}>
            <div style={{ ...S.progressFill, width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabs}>
        {[["today","Today"],["chart","Chart"],["meals","Meals"],["badges","Badges"]].map(([key, label]) => (
          <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={S.body}>

        {/* TODAY */}
        {tab === "today" && (
          <>
            {/* Motivation */}
            <div style={{ ...S.card, borderColor: "rgba(34,197,94,0.2)" }}>
              <div style={{ fontSize: 11, color: "#4a7a55", marginBottom: 4 }}>
                DAY {currentDay} · {dayKey.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: "#86efac", lineHeight: 1.6, fontStyle: "italic" }}>
                "{motivation}"
              </div>
            </div>

            {/* Log weight */}
            <div style={S.card}>
              <div style={S.cardTitle}>Log Today's Weight</div>
              {todayLog && (
                <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 10 }}>
                  ✓ Logged: {todayLog.weight} kg
                </div>
              )}
              <div style={S.inputRow}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 64.5"
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && logWeight()}
                  style={S.input}
                />
                <button style={S.logBtn} onClick={logWeight}>LOG</button>
              </div>
            </div>

            {/* Today's meals quick-check */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={S.cardTitle}>Today's Meals</div>
                <div style={{ fontSize: 11, color: mealCount === 3 ? "#22c55e" : "#4a7a55" }}>
                  {mealCount}/3 eaten
                </div>
              </div>
              {Object.entries(todayMeals).map(([meal, info]) => {
                const checked = !!(todayMealChecks[meal]);
                const color   = mealColor[meal];
                return (
                  <div key={meal} style={S.mealItem(checked, color)} onClick={() => toggleMeal(meal)}>
                    <div style={S.checkbox(checked, color)}>
                      {checked && <span style={{ fontSize: 10, color: "#080f0a", fontWeight: "bold" }}>✓</span>}
                    </div>
                    <div style={S.mealInfo}>
                      <div style={S.mealName(checked)}>{mealEmoji[meal]} {info.name}</div>
                      <div style={S.mealCals}>{info.cals} kcal</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day navigation */}
            <div style={S.dayNav}>
              <button style={S.navBtn} onClick={() => setCurrentDay((d) => Math.max(1, d - 1))}>← Prev</button>
              <span style={{ fontSize: 11, color: "#4a7a55", letterSpacing: 2 }}>DAY {currentDay} OF {DAYS}</span>
              <button style={S.navBtn} onClick={() => setCurrentDay((d) => Math.min(DAYS, d + 1))}>Next →</button>
            </div>
          </>
        )}

        {/* CHART */}
        {tab === "chart" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Weight Progress</div>
              {logs.length < 1 ? (
                <div style={{ textAlign: "center", color: "#4a7a55", fontSize: 12, padding: "30px 0" }}>
                  Log your first weight to see the chart
                </div>
              ) : (
                <WeightChart logs={logs} />
              )}
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Log History</div>
              {logs.length === 0 ? (
                <div style={{ color: "#4a7a55", fontSize: 11 }}>No entries yet</div>
              ) : (
                [...logs].sort((a, b) => b.day - a.day).map((l) => (
                  <div key={l.day} style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "center",
                    padding:        "8px 0",
                    borderBottom:   "1px solid rgba(255,255,255,0.04)",
                    fontSize:       12,
                  }}>
                    <span style={{ color: "#4a7a55" }}>Day {l.day} · {DAY_KEYS[(l.day - 1) % 7]}</span>
                    <span style={{ color: l.weight < START ? "#22c55e" : "#e2e8e4", fontWeight: "bold" }}>
                      {l.weight} kg{l.weight < START ? ` (−${(START - l.weight).toFixed(1)})` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* MEALS */}
        {tab === "meals" && (
          <>
            <div style={S.dayNav}>
              <button style={S.navBtn} onClick={() => setCurrentDay((d) => Math.max(1, d - 1))}>← Prev</button>
              <span style={{ fontSize: 11, color: "#22c55e", letterSpacing: 2 }}>DAY {currentDay} · {dayKey}</span>
              <button style={S.navBtn} onClick={() => setCurrentDay((d) => Math.min(DAYS, d + 1))}>Next →</button>
            </div>
            {Object.entries(MEALS[dayKey]).map(([meal, info]) => {
              const checked = !!(todayMealChecks[meal]);
              const color   = mealColor[meal];
              return (
                <div
                  key={meal}
                  style={{ ...S.card, borderColor: checked ? color + "33" : "rgba(255,255,255,0.07)", cursor: "pointer" }}
                  onClick={() => toggleMeal(meal)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, letterSpacing: 3, color, textTransform: "uppercase" }}>
                      {mealEmoji[meal]} {meal}
                    </span>
                    <div style={{ ...S.checkbox(checked, color), width: 20, height: 20 }}>
                      {checked && <span style={{ fontSize: 11, color: "#080f0a", fontWeight: "bold" }}>✓</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#e2e8e4", marginBottom: 4 }}>{info.name}</div>
                  <div style={{ fontSize: 11, color: "#4a7a55" }}>🔥 {info.cals} kcal</div>
                </div>
              );
            })}
            <div style={{ textAlign: "center", fontSize: 10, color: "#2a4a2a", marginTop: 8 }}>
              Tap a meal to mark it as eaten
            </div>
          </>
        )}

        {/* BADGES */}
        {tab === "badges" && (
          <>
            <div style={{ fontSize: 12, color: "#4a7a55", marginBottom: 14, letterSpacing: 1 }}>
              {earnedBadges.length} of {BADGES.length} earned
            </div>
            <div style={S.badgeGrid}>
              {BADGES.map((b) => {
                const earned = b.condition(logs);
                return (
                  <div key={b.id} style={S.badgeItem(earned)}>
                    <div style={S.badgeIcon}>{b.icon}</div>
                    <div style={S.badgeLabel(earned)}>{b.label}</div>
                    <div style={S.badgeDesc}>{b.desc}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && <div style={S.toast}>{toast}</div>}

      {/* ── Badge unlock modal ── */}
      {newBadge && (
        <div style={S.modal} onClick={() => setNewBadge(null)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>{newBadge.icon}</div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#22c55e", textTransform: "uppercase", marginBottom: 6 }}>
              Badge Unlocked
            </div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#f0f5f1", marginBottom: 6 }}>{newBadge.label}</div>
            <div style={{ fontSize: 12, color: "#4a7a55", marginBottom: 20 }}>{newBadge.desc}</div>
            <button
              onClick={() => setNewBadge(null)}
              style={{
                background:   "#22c55e",
                border:       "none",
                borderRadius: 8,
                padding:      "10px 24px",
                color:        "#080f0a",
                fontWeight:   "bold",
                cursor:       "pointer",
                fontFamily:   "inherit",
                fontSize:     12,
                letterSpacing: 1,
              }}
            >
              LET'S GO 🔥
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
