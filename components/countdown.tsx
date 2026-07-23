"use client";
import { useEffect, useState } from "react";

export function Countdown({ date }: { date: string }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const update = () => setLeft(Math.max(0, new Date(date).getTime() - Date.now()));
    const initial = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(id); };
  }, [date]);
  const units = [["DÍAS", Math.floor(left / 86400000)], ["HRS", Math.floor(left / 3600000) % 24], ["MIN", Math.floor(left / 60000) % 60], ["SEG", Math.floor(left / 1000) % 60]] as const;
  return <div className="countdown" aria-label="Cuenta regresiva">{units.map(([label, value]) => <div key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}</div>;
}
