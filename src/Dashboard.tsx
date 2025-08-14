import React, { useEffect, useState } from "react";

/** ===== Innovue Dashboard (robust parsing + marquee styling) ===== */

const CONFIG = {
  fallbackLabels: ["Metric A","Metric B","Metric C","Metric D","Metric E","Metric F"],
  defaultGreenAt: 100,
  defaultRedAt: 0,
  refreshMs: 5000
};

// ✅ Your working key + sheet info
const API_KEY = "AIzaSyCbFt_5Jy0o13IrdZEmGMHTNrA6eJFM9Nk";
const SPREADSHEET_ID = "1S_eFTn-Hg4nAfUjj4wZMG8pKK1WahxSTqR7ztx4rOnw";
const SHEET_NAME = "GCDC Test Sheet"; // must match the tab name exactly
const RANGE = "A2:D9";                // labels/values/targets + two marquee rows

/** Tolerant numeric parser: $, %, commas, spaces, and (negatives). Returns number or null. */
function asNumber(x: unknown): number | null {
  if (x == null) return null;
  let s = String(x).trim();
  if (!s || s === "—" || s === "--") return null;

  const isPercent = s.includes("%");

  // negatives like (1,234.56)
  let negative = false;
  if (/^\(?-?\$?[\d,]*\.?\d+\)?\s*%?$/.test(s) && s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.replace(/[()]/g, "");
  }

  // strip currency and commas; keep digits, dot, minus
  s = s.replace(/\$/g, "").replace(/,/g, "").replace(/[^\d.\-]/g, "");

  if (!s || s === "-" || s === "." || s === "-.") return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  const signed = negative ? -n : n;

  // If original had %, we treat "35%" as 35 (not 0.35) to match your UX
  return isPercent ? signed : signed;
}

function apiUrl() {
  const encoded = encodeURIComponent(`${SHEET_NAME}!${RANGE}`);
  return `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encoded}?key=${API_KEY}`;
}

/** Map a value (number) to red→green by per-row targets */
function valueToColorByTargets(value: number | null, greenAt: number | null, redAt: number | null) {
  if (value == null) return "#444";
  const G = greenAt ?? CONFIG.defaultGreenAt;
  const R = redAt ?? CONFIG.defaultRedAt;
  const denom = (G - R);
  let t = denom === 0 ? 0.5 : (Number(value) - R) / denom;
  t = Math.max(0, Math.min(1, t)); // clamp
  const hue = t * 120; // 0=red,120=green
  return `hsl(${hue}, 70%, 45%)`;
}

/** Marquee with white background, black text, padding; speedSec controls scroll time (same for both) */
function Marquee({ text, speedSec = 22 }: { text: string; speedSec?: number }) {
  if (!text || !String(text).trim()) return null;

  const styleTag = `
    @keyframes innovue-marquee {
      0%   { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }
  `;

  const outer: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    background: "#fff",
    color: "#000",
    borderRadius: 10,
    padding: "12px 14px",       // padding added
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  };

  const inner: React.CSSProperties = {
    display: "inline-block",
    whiteSpace: "nowrap",
    paddingLeft: "100%",
    animation: `innovue-marquee ${speedSec}s linear infinite`,
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.3,
  };

  return (
    <div style={{ marginTop: 10 }}>
      <style>{styleTag}</style>
      <div style={outer}>
        <div style={inner}>{String(text)}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [labels, setLabels] = useState<string[]>(CONFIG.fallbackLabels);
  const [values, setValues] = useState<(number | null)[]>(Array(6).fill(null));
  const [greens, setGreens] = useState<(number | null)[]>(Array(6).fill(CONFIG.defaultGreenAt));
  const [reds, setReds] = useState<(number | null)[]>(Array(6).fill(CONFIG.defaultRedAt));
  const [errors, setErrors] = useState<(string | null)[]>(Array(6).fill(null));
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [marquee1, setMarquee1] = useState("");
  const [marquee2, setMarquee2] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setStatus("loading"); setStatusMsg("");
        const res = await fetch(apiUrl(), { cache: "no-store" });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const j = await res.json(); if (j.error?.message) msg += ` — ${j.error.message}`; } catch {}
          throw new Error(msg);
        }

        const json = await res.json();
        const rows: string[][] = json.values || [];

        const nextLabels: string[] = [];
        const nextValues: (number | null)[] = [];
        const nextGreens: (number | null)[] = [];
        const nextReds: (number | null)[] = [];
        const nextErrors: (string | null)[] = [];

        // First 6 rows are metrics
        for (let i = 0; i < 6; i++) {
          const row = rows[i] || [];
          const label = (row[0] ?? "").toString().trim();
          const val = asNumber(row[1]);
          const gAt = asNumber(row[2]);
          const rAt = asNumber(row[3]);

          nextLabels.push(label || CONFIG.fallbackLabels[i]);
          nextValues.push(val);
          nextGreens.push(gAt ?? CONFIG.defaultGreenAt);
          nextReds.push(rAt ?? CONFIG.defaultRedAt);
          nextErrors.push(val == null ? "No data" : null);
        }

        // Row indices 6 and 7 correspond to B8 and B9 (marquees)
        const rowForB8 = rows[6] || [];
        const rowForB9 = rows[7] || [];
        const b8 = (rowForB8[1] ?? "").toString();
        const b9 = (rowForB9[1] ?? "").toString();

        if (alive) {
          setLabels(nextLabels);
          setValues(nextValues);
          setGreens(nextGreens);
          setReds(nextReds);
          setErrors(nextErrors);
          setMarquee1(b8);
          setMarquee2(b9);
          setStatus("ok");
          setLastUpdated(new Date());
        }
      } catch (e: any) {
        if (alive) {
          console.error("Sheets API error:", e);
          setErrors(Array(6).fill("API error"));
          setStatus("error");
          setStatusMsg(String(e.message || e));
        }
      }
    }

    load();
    const id = setInterval(load, CONFIG.refreshMs);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ===== Styles / layout =====
  const styles = {
    page: { background: "#ffffff" },
    container: { padding: 16 },
    headerRow: { display:"flex", alignItems:"baseline", gap:12, marginBottom:10 },
    header: { color:"#222", fontWeight:600 },
    sub: { fontSize:12, color:"#777" },

    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

    tile: {
      background:"#fff",
      borderRadius:12,
      padding:16,
      boxShadow:"0 2px 10px rgba(0,0,0,0.06)",
      minHeight: 110,
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center"
    },
    h3: { margin:"0 0 8px", fontSize:12, color:"#667085", textTransform:"uppercase" as const, letterSpacing:0.4 },
    metricBox: (color: string) => ({
      background:color,
      color:"#fff",
      padding:"18px 14px",
      borderRadius:10,
      fontSize:22,
      fontWeight:700 as const,
      textAlign:"center" as const,
      letterSpacing:0.3
    }),
    targets: { marginTop:8, fontSize:12, color:"#666" },
    error: { color:"#d33", fontSize:12, marginTop:6 },
    marqueeWrap: { marginTop: 8, marginBottom: 12 }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Marquees at TOP — same speed for both */}
        <div style={styles.marqueeWrap}>
          <Marquee text={marquee1} speedSec={22} />
          <Marquee text={marquee2} speedSec={32} />
        </div>

        {/* Status line */}
        <div style={styles.headerRow}>
          <div style={styles.header}>Innovue Live Metrics</div>
          <div style={styles.sub}>
            Status: {status === "ok" ? "Live" : status === "loading" ? "Loading…" : "API error"}
            {status === "error" && statusMsg ? ` — ${statusMsg}` : ""}
            {lastUpdated && ` • Updated ${lastUpdated.toLocaleTimeString()}`}
          </div>
        </div>

        {/* 2 x 3 grid */}
        <div style={styles.grid}>
          {labels.map((label, i) => {
            const color = valueToColorByTargets(values[i], greens[i], reds[i]);
            return (
              <div key={i} style={styles.tile}>
                <div style={styles.h3}>{label}</div>
                <div style={styles.metricBox(color)}>
                  {values[i] != null ? values[i] : "--"}
                </div>
                <div style={styles.targets}>
                  Green at: {greens[i] ?? CONFIG.defaultGreenAt} • Red at: {reds[i] ?? CONFIG.defaultRedAt}
                </div>
                {errors[i] && <div style={styles.error}>{errors[i]}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}