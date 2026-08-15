"use client";

import { Download, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { formatMxDate, formatMxTime } from "@/lib/dates";
import { publicEnv } from "@/lib/env";

type EventShareData = {
  id: string;
  slug: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  status: string;
  flyerUrl?: string;
  universe?: "iamjoshwa" | "afterluv";
};

export function EventShareStudio({ event, compact = false }: { event: EventShareData; compact?: boolean }) {
  const [state, setState] = useState("");
  const shareUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/fechas/${event.slug}`;
  const isAfterluv = event.universe === "afterluv";
  const headline = isTodayOrTonight(event.date) ? (isAfterluv ? "AFTERLUV LIVE TONIGHT" : "IAMJOSHWA LIVE TONIGHT") : `${isAfterluv ? "AFTERLUV" : "IAMJOSHWA"} NEXT SIGNAL`;

  async function buildPoster() {
    setState("Creando poster…");
    const blob = await createPoster(event, headline, shareUrl);
    setState("Poster listo.");
    return blob;
  }

  async function savePoster() {
    try {
      const blob = await buildPoster();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${event.slug || "iamjoshwa-live-tonight"}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch {
      setState("No pude generar la imagen. Intenta compartir el link.");
    }
  }

  async function sharePoster() {
    try {
      const blob = await buildPoster();
      const file = new File([blob], `${event.slug || "iamjoshwa-live-tonight"}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: headline, text: `${event.name} · ${event.city}`, url: shareUrl, files: [file] });
        setState("Compartido.");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: headline, text: `${event.name} · ${event.city}`, url: shareUrl });
        setState("Link compartido.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setState("Link copiado.");
    } catch {
      setState("No se compartió. Puedes guardar el poster.");
    }
  }

  return (
    <div className={`event-share-studio ${compact ? "is-compact" : ""}`}>
      <div>
        <span>{headline}</span>
        <strong>Share kit</strong>
        {!compact ? <p>Guarda una imagen vertical 9:15 con flyer, fecha y venue; perfecta para historias o para mandarla por WhatsApp.</p> : null}
      </div>
      <div className="event-share-actions">
        <button className="button secondary" type="button" onClick={sharePoster}>
          <Share2 /> Compartir
        </button>
        <button className="button secondary" type="button" onClick={savePoster}>
          <Download /> Guardar imagen
        </button>
        <a className="button secondary" href={`https://wa.me/?text=${encodeURIComponent(`${headline} · ${event.name} — ${shareUrl}`)}`} target="_blank" rel="noreferrer">
          <MessageCircle /> WhatsApp
        </a>
      </div>
      {state ? <small role="status">{state}</small> : null}
    </div>
  );
}

async function createPoster(event: EventShareData, headline: string, shareUrl: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1800;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const accent = event.universe === "afterluv" ? "#ff2b3f" : "#bd35ff";
  const secondary = event.universe === "afterluv" ? "#f4f4f5" : "#6f7dff";

  const bg = ctx.createLinearGradient(0, 0, 1080, 1800);
  bg.addColorStop(0, "#050505");
  bg.addColorStop(.48, event.universe === "afterluv" ? "#190508" : "#11051d");
  bg.addColorStop(1, "#050505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1800);

  drawGlow(ctx, 870, 160, 430, accent, .32);
  drawGlow(ctx, 160, 1540, 440, secondary, .16);
  drawNoise(ctx, 1080, 1800);

  ctx.save();
  roundRect(ctx, 96, 300, 888, 1040, 72);
  ctx.clip();
  const image = event.flyerUrl ? await loadImage(event.flyerUrl).catch(() => null) : null;
  if (image) drawCover(ctx, image, 96, 300, 888, 1040);
  else {
    const fallback = ctx.createLinearGradient(96, 300, 984, 1340);
    fallback.addColorStop(0, accent);
    fallback.addColorStop(1, "#08080b");
    ctx.fillStyle = fallback;
    ctx.fillRect(96, 300, 888, 1040);
  }
  const flyerOverlay = ctx.createLinearGradient(96, 300, 96, 1340);
  flyerOverlay.addColorStop(0, "rgba(0,0,0,.1)");
  flyerOverlay.addColorStop(.62, "rgba(0,0,0,.06)");
  flyerOverlay.addColorStop(1, "rgba(0,0,0,.42)");
  ctx.fillStyle = flyerOverlay;
  ctx.fillRect(96, 300, 888, 1040);
  ctx.restore();

  ctx.strokeStyle = hexToRgba(accent, .7);
  ctx.lineWidth = 3;
  roundRect(ctx, 96, 300, 888, 1040, 72);
  ctx.stroke();

  drawText(ctx, headline, 96, 96, 42, 888, "800", .12, "#ffffff", 1.08, "left", 2);
  drawPill(ctx, 96, 184, 476, 62, `${formatMxDate(event.date, { weekday: "long", day: "2-digit", month: "long" })} · ${formatMxTime(event.date)} MX`, accent);
  drawPill(ctx, 594, 184, 390, 62, event.status.toUpperCase(), "rgba(255,255,255,.26)");

  const titleLines = drawText(ctx, event.name.toUpperCase(), 96, 1412, 78, 888, "900", -.05, "#ffffff", .9, "left", 3);
  const detailsY = Math.min(1646, 1412 + titleLines * 78 * .9 + 34);
  drawText(ctx, `${event.venue} · ${event.city}`.toUpperCase(), 96, detailsY, 31, 888, "800", .08, "rgba(255,255,255,.78)", 1.2, "left", 2);
  drawText(ctx, "IAMJOSHWA WORLD", 96, 1730, 25, 520, "800", .18, "rgba(255,255,255,.68)");
  drawText(ctx, shareUrl.replace(/^https?:\/\//, ""), 552, 1730, 22, 432, "600", .02, "rgba(255,255,255,.58)", 1, "right");

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Poster unavailable")), "image/png", .96);
  });
  return blob;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, hexToRgba(color, alpha));
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawNoise(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.045)";
  for (let index = 0; index < 2800; index += 1) {
    ctx.globalAlpha = Math.random() * .22;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxWidth: number, weight = "700", spacing = 0, color = "#fff", lineHeight = 1.05, align: CanvasTextAlign = "left", maxLines = 3) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  visible.forEach((item, index) => {
    if (spacing && item.length < 28) drawLetterSpaced(ctx, item, x, y + index * size * lineHeight, spacing * size, align);
    else ctx.fillText(item, x, y + index * size * lineHeight, maxWidth);
  });
  ctx.restore();
  return visible.length;
}

function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string, color: string) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.42)";
  ctx.strokeStyle = color.startsWith("#") ? hexToRgba(color, .48) : color;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 22px Arial, Helvetica, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, x + width / 2, y + height / 2 + 1, width - 42);
  ctx.restore();
}

function drawLetterSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: CanvasTextAlign) {
  const width = text.split("").reduce((sum, char) => sum + ctx.measureText(char).width + spacing, 0) - spacing;
  let cursor = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function isTodayOrTonight(value: string) {
  const event = new Date(value);
  const now = new Date();
  return event.toDateString() === now.toDateString() || Math.abs(event.getTime() - now.getTime()) <= 18 * 60 * 60 * 1000;
}
