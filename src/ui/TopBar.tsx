import React, { useEffect, useState } from "react";

/** Open‑Meteo (no API key) for ZIP 20006 (approx lat/lon) */
const LAT = 38.900;
const LON = -77.040;

function labelFromCode(code: number): string {
  const map: Record<number, string> = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Showers",
    81: "Showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
  };
  return map[code] ?? "Weather";
}

export default function TopBar() {
  const [weather, setWeather] = useState<string>("Loading weather…");
  const [time, setTime] = useState<string>("");

  // Weather (refresh every 60s)
  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current_weather=true&temperature_unit=fahrenheit`;

    const fetchWx = async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        const cw = data?.current_weather;
        if (!res.ok || !cw) {
          setWeather("Weather unavailable");
          return;
        }
        setWeather(`${Math.round(cw.temperature)}°F ${labelFromCode(cw.weathercode)}`);
      } catch {
        setWeather("Weather unavailable");
      }
    };

    fetchWx();
    const id = setInterval(fetchWx, 60000);
    return () => clearInterval(id);
  }, []);

  // Time & date (update every second)
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const date = now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const t = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setTime(`${date} ${t}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#ffffff", // white bar
        color: "#0f172a",
        padding: "10px 14px",
        boxSizing: "border-box",
        width: "100%",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {/* LEFT: GCDC + text */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200 }}>
        <img src="/gcdc.jpg" alt="GCDC" style={{ height: 44 }} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>Grilled Cheese Bar</span>
      </div>

      {/* CENTER: big Innovue logo */}
      <div style={{ flex: 1, textAlign: "center" }}>
        <img src="/innovue.png" alt="Innovue" style={{ height: 160 }} />{/* ~30% bigger */}
      </div>

      {/* RIGHT: weather + time/date */}
      <div style={{ minWidth: 230, textAlign: "right", lineHeight: 1.2 }}>
        <div style={{ fontWeight: 700 }}>{weather}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{time}</div>
      </div>
    </div>
  );
}