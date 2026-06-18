import { useState, useEffect } from "react";

const SEGMENTS = [
  { key: "body", label: "BODY", sub: "fitness · sleep · energy", color: "#E8C547" },
  { key: "mind", label: "MIND", sub: "clarity · stress · emotion", color: "#4ECDC4" },
  { key: "spirit", label: "SPIRIT", sub: "conscience · values · alignment", color: "#A8E6CF" },
  { key: "money", label: "MONEY", sub: "income · savings · debt", color: "#FFB347" },
  { key: "purpose", label: "PURPOSE", sub: "mission · meaning · why", color: "#FF6B6B" },
  { key: "growth", label: "GROWTH", sub: "learning · skills · becoming", color: "#C9B1FF" },
  { key: "romance", label: "ROMANCE", sub: "partnership · intimacy · connection", color: "#FF8FAB" },
  { key: "friendship", label: "FRIENDSHIP", sub: "people · community · belonging", color: "#87CEEB" },
  { key: "family", label: "FAMILY", sub: "roots · obligation · love", color: "#DEB887" },
  { key: "enjoyment", label: "ENJOYMENT", sub: "rest · play · hobbies", color: "#98FB98" },
];

const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4"];
const STORAGE_KEY = "bhi_full_circle_v1";

const emptyScores = () => Object.fromEntries(SEGMENTS.map(s => [s.key, 0]));

const defaultWeekData = () => WEEKS.map(() => ({
  scores: emptyScores(),
  notes: "|||",
  savedAt: null,
}));

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWeekData();
    const parsed = JSON.parse(raw);
    return WEEKS.map((_, i) => ({
      scores: { ...emptyScores(), ...(parsed[i]?.scores || {}) },
      notes: parsed[i]?.notes ?? "|||",
      savedAt: parsed[i]?.savedAt || null,
    }));
  } catch {
    return defaultWeekData();
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function polarToXY(angle, radius, cx, cy) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function buildSegmentPath(index, total, score, cx, cy, maxR, innerR) {
  const angleSlice = 360 / total;
  const startAngle = index * angleSlice;
  const endAngle = startAngle + angleSlice;
  const outerR = innerR + ((maxR - innerR) * score) / 10;
  const s1 = polarToXY(startAngle, innerR, cx, cy);
  const e1 = polarToXY(endAngle, innerR, cx, cy);
  const s2 = polarToXY(startAngle, outerR, cx, cy);
  const e2 = polarToXY(endAngle, outerR, cx, cy);
  const largeArc = angleSlice > 180 ? 1 : 0;
  return [`M ${s1.x} ${s1.y}`, `A ${innerR} ${innerR} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
    `L ${e2.x} ${e2.y}`, `A ${outerR} ${outerR} 0 ${largeArc} 0 ${s2.x} ${s2.y}`, "Z"].join(" ");
}

function buildGridRing(radius, total, cx, cy) {
  const points = [];
  for (let i = 0; i < total; i++) {
    const angle = (i * 360) / total;
    const p = polarToXY(angle, radius, cx, cy);
    points.push(`${i === 0 ? "M" : "L"} ${p.x} ${p.y}`);
  }
  return points.join(" ") + " Z";
}

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

function Wheel({ scores, activeKey, onSegmentClick, size }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 4;
  const innerR = size * 0.056;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {[2, 4, 6, 8, 10].map(v => {
        const r = innerR + ((maxR - innerR) * v) / 10;
        return <path key={v} d={buildGridRing(r, SEGMENTS.length, cx, cy)}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      {SEGMENTS.map((_, i) => {
        const angle = (i * 360) / SEGMENTS.length;
        const inner = polarToXY(angle, innerR, cx, cy);
        const outer = polarToXY(angle, maxR, cx, cy);
        return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {SEGMENTS.map((seg, i) => {
        const score = scores[seg.key] || 0;
        const isActive = activeKey === seg.key;
        return <path key={seg.key}
          d={buildSegmentPath(i, SEGMENTS.length, score, cx, cy, maxR, innerR)}
          fill={seg.color} fillOpacity={isActive ? 0.95 : score === 0 ? 0.12 : 0.7}
          stroke={isActive ? seg.color : "transparent"} strokeWidth={isActive ? 1.5 : 0}
          style={{ cursor: "pointer", transition: "all 0.3s ease" }}
          onClick={() => onSegmentClick(seg.key)} />;
      })}
      {SEGMENTS.map((seg, i) => (
        <path key={`o-${seg.key}`}
          d={buildSegmentPath(i, SEGMENTS.length, 10, cx, cy, maxR, innerR)}
          fill="none" stroke={seg.color} strokeOpacity={0.15} strokeWidth="0.5"
          style={{ cursor: "pointer" }} onClick={() => onSegmentClick(seg.key)} />
      ))}
      {SEGMENTS.map((seg, i) => {
        const angleSlice = 360 / SEGMENTS.length;
        const midAngle = i * angleSlice + angleSlice / 2;
        const labelR = maxR - (size > 400 ? 26 : 18);
        const pos = polarToXY(midAngle, labelR, cx, cy);
        const isActive = activeKey === seg.key;
        const fs = size > 400 ? "10" : "8.5";
        return (
          <text key={`lbl-${seg.key}`} x={pos.x} y={pos.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={fs} fontWeight="700" fontFamily="'Space Mono', monospace"
            fill={seg.color} fillOpacity={isActive ? 1 : 0.75}
            style={{ cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.5px" }}
            onClick={() => onSegmentClick(seg.key)}>
            {seg.label}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r={innerR - 2} fill="#0A0A0A" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size > 400 ? "11" : "9"}
        fontFamily="'Space Mono', monospace" fill="rgba(255,255,255,0.4)" fontWeight="700" letterSpacing="2">BHI</text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize={size > 400 ? "7" : "6"}
        fontFamily="'Space Mono', monospace" fill="rgba(255,255,255,0.25)" letterSpacing="1">CIRCLE</text>
    </svg>
  );
}

function ScoreSlider({ segment, value, onChange }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: `1px solid ${segment.color}22`,
      borderRadius: "12px", padding: "18px 22px", marginBottom: "10px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: "700", color: segment.color, letterSpacing: "2px", marginBottom: "4px" }}>{segment.label}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{segment.sub}</div>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "28px", fontWeight: "700", color: value === 0 ? "rgba(255,255,255,0.15)" : segment.color, lineHeight: 1 }}>
          {value === 0 ? "—" : value}
        </div>
      </div>
      <input type="range" min="0" max="10" value={value} onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: "3px", borderRadius: "2px", outline: "none", cursor: "pointer",
          background: value === 0 ? "rgba(255,255,255,0.1)"
            : `linear-gradient(to right, ${segment.color} ${value * 10}%, rgba(255,255,255,0.1) ${value * 10}%)`,
        }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

function SavedBadge({ savedAt }) {
  if (!savedAt) return null;
  const d = new Date(savedAt);
  const label = d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#A8E6CF" }} />
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>
        SAVED {label.toUpperCase()}
      </span>
    </div>
  );
}

export default function FullCircle() {
  const [weekData, setWeekData] = useState(loadFromStorage);
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeSegment, setActiveSegment] = useState(null);
  const [tab, setTab] = useState("wheel");
  const [justSaved, setJustSaved] = useState(false);
  const windowWidth = useWindowWidth();

  const isDesktop = windowWidth >= 768;
  const wheelSize = isDesktop ? 420 : 300;

  useEffect(() => { document.title = "Full Circle"; }, []);
  useEffect(() => { saveToStorage(weekData); }, [weekData]);

  const currentData = weekData[activeWeek];

  const updateWeek = (updater) => {
    setWeekData(prev => prev.map((w, i) => i === activeWeek ? { ...updater(w), savedAt: Date.now() } : w));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const setScore = (key, val) => updateWeek(w => ({ ...w, scores: { ...w.scores, [key]: val } }));
  const setNotes = (idx, val) => updateWeek(w => {
    const parts = (w.notes || "|||").split("|||");
    parts[idx] = val;
    return { ...w, notes: parts.join("|||") };
  });
  const clearWeek = () => {
    if (!window.confirm(`Clear all data for ${WEEKS[activeWeek]}?`)) return;
    setWeekData(prev => prev.map((w, i) => i === activeWeek ? { scores: emptyScores(), notes: "|||", savedAt: null } : w));
  };

  const totalFilled = Object.values(currentData.scores).filter(v => v > 0).length;
  const avg = totalFilled === 0 ? null : (Object.values(currentData.scores).reduce((a, b) => a + b, 0) / SEGMENTS.length).toFixed(1);
  const sortedByScore = [...SEGMENTS].sort((a, b) => (currentData.scores[b.key] || 0) - (currentData.scores[a.key] || 0));
  const highest = sortedByScore[0];
  const lowest = sortedByScore[sortedByScore.length - 1];
  const notesParts = (currentData.notes || "|||").split("|||");

  const TABS = [{ id: "wheel", label: "WHEEL" }, { id: "scores", label: "SCORES" }, { id: "notes", label: "NOTES" }, { id: "history", label: "HISTORY" }];

  // Sidebar content for desktop
  const SidePanel = () => (
    <div style={{ width: "340px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Stats */}
      {totalFilled > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[{ label: "STRONGEST", seg: highest }, { label: "NEEDS WORK", seg: lowest }].map(({ label, seg }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "8px" }}>{label}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: seg.color, fontWeight: "700", marginBottom: "4px" }}>{seg.label}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "24px", color: seg.color, fontWeight: "700" }}>{currentData.scores[seg.key]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active segment slider */}
      {activeSegment && (() => {
        const seg = SEGMENTS.find(s => s.key === activeSegment);
        return (
          <div style={{ background: `${seg.color}0D`, border: `1px solid ${seg.color}33`, borderRadius: "14px", padding: "4px" }}>
            <ScoreSlider segment={seg} value={currentData.scores[seg.key]} onChange={v => setScore(seg.key, v)} />
          </div>
        );
      })()}

      {!activeSegment && totalFilled === 0 && (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "2px", padding: "20px 0" }}>
          CLICK A SEGMENT TO BEGIN
        </div>
      )}

      {/* All scores */}
      <div style={{ maxHeight: "340px", overflowY: "auto", paddingRight: "4px" }}>
        {SEGMENTS.map(seg => (
          <ScoreSlider key={seg.key} segment={seg} value={currentData.scores[seg.key]} onChange={v => setScore(seg.key, v)} />
        ))}
      </div>

      {totalFilled > 0 && (
        <button onClick={clearWeek} style={{
          width: "100%", padding: "10px", background: "transparent",
          border: "1px solid rgba(255,80,80,0.2)", borderRadius: "10px",
          color: "rgba(255,100,100,0.5)", fontFamily: "'Space Mono', monospace",
          fontSize: "10px", letterSpacing: "2px", cursor: "pointer",
        }}>CLEAR {WEEKS[activeWeek].toUpperCase()}</button>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 0 6px rgba(255,255,255,0.3); }
        input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: pointer; border: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: isDesktop ? "32px 48px 20px" : "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "4px", color: "rgba(255,255,255,0.3)", marginBottom: "6px" }}>BHI NEXUS</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: isDesktop ? "26px" : "20px", fontWeight: "700", letterSpacing: "1px" }}>FULL CIRCLE</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "3px", letterSpacing: "0.5px" }}>The Full Picture</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {avg !== null ? (
              <>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: isDesktop ? "40px" : "32px", fontWeight: "700", lineHeight: 1, color: avg >= 7 ? "#A8E6CF" : avg >= 4 ? "#E8C547" : "#FF6B6B" }}>{avg}</div>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "1px", marginTop: "2px" }}>AVG / 10</div>
              </>
            ) : (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "1px", marginTop: "8px" }}>NOT STARTED</div>
            )}
          </div>
        </div>

        {/* Week selector */}
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", maxWidth: isDesktop ? "500px" : "100%" }}>
          {WEEKS.map((w, i) => {
            const hasData = weekData[i] && Object.values(weekData[i].scores).some(v => v > 0);
            return (
              <button key={i} onClick={() => { setActiveWeek(i); setActiveSegment(null); }}
                style={{
                  flex: 1, padding: "8px 0", cursor: "pointer",
                  background: activeWeek === i ? "rgba(255,255,255,0.1)" : "transparent",
                  border: `1px solid ${activeWeek === i ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "8px",
                  color: activeWeek === i ? "#fff" : "rgba(255,255,255,0.35)",
                  fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "1px",
                  position: "relative",
                }}>
                {w.toUpperCase()}
                {hasData && <div style={{ position: "absolute", top: "6px", right: "6px", width: "4px", height: "4px", borderRadius: "50%", background: "#A8E6CF" }} />}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "12px", minHeight: "16px" }}>
          {justSaved
            ? <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8C547" }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#E8C547", letterSpacing: "1px" }}>SAVING...</span>
              </div>
            : <SavedBadge savedAt={currentData.savedAt} />
          }
        </div>

        {/* Browser notice */}
        <div style={{ marginTop: "10px", padding: "8px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px" }}>💾</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            Data saves to this browser. Use the same browser each week.
          </span>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      {isDesktop ? (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 48px", display: "flex", gap: "60px", alignItems: "flex-start" }}>
          {/* Left — Wheel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <Wheel scores={currentData.scores} activeKey={activeSegment}
              onSegmentClick={k => setActiveSegment(k === activeSegment ? null : k)} size={wheelSize} />

            {/* Tab bar below wheel on desktop */}
            <div style={{ display: "flex", gap: "6px", marginTop: "24px", flexWrap: "wrap", justifyContent: "center" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{
                    padding: "8px 16px", cursor: "pointer",
                    background: tab === t.id ? "rgba(255,255,255,0.08)" : "transparent",
                    border: `1px solid ${tab === t.id ? "#E8C547" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "8px",
                    color: tab === t.id ? "#E8C547" : "rgba(255,255,255,0.3)",
                    fontFamily: "'Space Mono', monospace", fontSize: "9px", letterSpacing: "2px",
                    transition: "all 0.2s",
                  }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Right — Panel */}
          {tab === "wheel" || tab === "scores" ? (
            <SidePanel />
          ) : tab === "notes" ? (
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(255,255,255,0.3)", marginBottom: "20px" }}>
                FULL CIRCLE — {WEEKS[activeWeek].toUpperCase()}
              </div>
              {[
                { label: "WHAT'S WORKING", placeholder: "Where are you feeling strong this week?" },
                { label: "WHAT'S NOT", placeholder: "What's dragging you down or stalling?" },
                { label: "ONE THING TO SHIFT", placeholder: "The single move that changes your week." },
              ].map((section, idx) => (
                <div key={idx} style={{ marginBottom: "20px" }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "rgba(255,255,255,0.35)", marginBottom: "10px" }}>{section.label}</div>
                  <textarea placeholder={section.placeholder} rows={4} value={notesParts[idx] || ""}
                    onChange={e => setNotes(idx, e.target.value)}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px", padding: "14px 16px", color: "#fff",
                      fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: "1.6", outline: "none",
                    }}
                    onFocus={e => e.target.style.borderColor = "rgba(232,197,71,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(255,255,255,0.3)", marginBottom: "20px" }}>4-WEEK OVERVIEW</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {SEGMENTS.map(seg => {
                  const vals = weekData.map(w => w.scores[seg.key] || 0);
                  const filled = vals.filter(v => v > 0);
                  return (
                    <div key={seg.key} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", fontWeight: "700", color: seg.color, letterSpacing: "2px" }}>{seg.label}</div>
                        {filled.length > 0 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>AVG {(filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1)}</div>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "36px" }}>
                        {vals.map((v, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "100%", borderRadius: "3px 3px 0 0", transition: "height 0.3s", height: `${v === 0 ? 3 : (v / 10) * 32}px`, background: v === 0 ? "rgba(255,255,255,0.06)" : seg.color, opacity: v === 0 ? 1 : i === activeWeek ? 1 : 0.5, border: i === activeWeek ? `1px solid ${seg.color}` : "none" }} />
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "7px", color: i === activeWeek ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>W{i + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MOBILE LAYOUT */
        <div>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: "14px 0", background: "transparent", border: "none", cursor: "pointer",
                  borderBottom: `2px solid ${tab === t.id ? "#E8C547" : "transparent"}`,
                  color: tab === t.id ? "#E8C547" : "rgba(255,255,255,0.3)",
                  fontFamily: "'Space Mono', monospace", fontSize: "9px", letterSpacing: "2px",
                  marginBottom: "-1px", transition: "all 0.2s",
                }}>{t.label}</button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {tab === "wheel" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                  <Wheel scores={currentData.scores} activeKey={activeSegment}
                    onSegmentClick={k => setActiveSegment(k === activeSegment ? null : k)} size={300} />
                </div>
                {activeSegment && (() => {
                  const seg = SEGMENTS.find(s => s.key === activeSegment);
                  return <div style={{ background: `${seg.color}0D`, border: `1px solid ${seg.color}33`, borderRadius: "14px", padding: "4px", marginBottom: "16px" }}>
                    <ScoreSlider segment={seg} value={currentData.scores[seg.key]} onChange={v => setScore(seg.key, v)} />
                  </div>;
                })()}
                {!activeSegment && totalFilled === 0 && (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "2px", padding: "20px 0" }}>TAP A SEGMENT TO BEGIN</div>
                )}
                {totalFilled > 0 && !activeSegment && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[{ label: "STRONGEST", seg: highest }, { label: "NEEDS WORK", seg: lowest }].map(({ label, seg }) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "8px" }}>{label}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: seg.color, fontWeight: "700", marginBottom: "4px" }}>{seg.label}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "24px", color: seg.color, fontWeight: "700" }}>{currentData.scores[seg.key]}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "scores" && (
              <div>
                {SEGMENTS.map(seg => <ScoreSlider key={seg.key} segment={seg} value={currentData.scores[seg.key]} onChange={v => setScore(seg.key, v)} />)}
                {totalFilled > 0 && (
                  <button onClick={clearWeek} style={{ width: "100%", marginTop: "8px", padding: "12px", background: "transparent", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "10px", color: "rgba(255,100,100,0.5)", fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "2px", cursor: "pointer" }}>
                    CLEAR {WEEKS[activeWeek].toUpperCase()}
                  </button>
                )}
              </div>
            )}

            {tab === "notes" && (
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(255,255,255,0.3)", marginBottom: "20px" }}>FULL CIRCLE — {WEEKS[activeWeek].toUpperCase()}</div>
                {[
                  { label: "WHAT'S WORKING", placeholder: "Where are you feeling strong this week?" },
                  { label: "WHAT'S NOT", placeholder: "What's dragging you down or stalling?" },
                  { label: "ONE THING TO SHIFT", placeholder: "The single move that changes your week." },
                ].map((section, idx) => (
                  <div key={idx} style={{ marginBottom: "20px" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "rgba(255,255,255,0.35)", marginBottom: "10px" }}>{section.label}</div>
                    <textarea placeholder={section.placeholder} rows={3} value={notesParts[idx] || ""}
                      onChange={e => setNotes(idx, e.target.value)}
                      style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: "1.6", outline: "none" }}
                      onFocus={e => e.target.style.borderColor = "rgba(232,197,71,0.4)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                ))}
              </div>
            )}

            {tab === "history" && (
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "3px", color: "rgba(255,255,255,0.3)", marginBottom: "20px" }}>4-WEEK OVERVIEW</div>
                {SEGMENTS.map(seg => {
                  const vals = weekData.map(w => w.scores[seg.key] || 0);
                  const filled = vals.filter(v => v > 0);
                  return (
                    <div key={seg.key} style={{ marginBottom: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", fontWeight: "700", color: seg.color, letterSpacing: "2px" }}>{seg.label}</div>
                        {filled.length > 0 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>AVG {(filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1)}</div>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "40px" }}>
                        {vals.map((v, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "100%", borderRadius: "3px 3px 0 0", transition: "height 0.3s", height: `${v === 0 ? 3 : (v / 10) * 36}px`, background: v === 0 ? "rgba(255,255,255,0.06)" : seg.color, opacity: v === 0 ? 1 : i === activeWeek ? 1 : 0.5, border: i === activeWeek ? `1px solid ${seg.color}` : "none" }} />
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "7px", color: i === activeWeek ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>W{i + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
