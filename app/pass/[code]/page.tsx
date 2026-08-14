import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { ArrowLeft, QrCode, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { getLevelConfig, getLevelFromPoints, getLevelNumber } from "@/config/levels";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ code: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const profile = await getPublicPass(code);
  if (!profile) return { title: "Pass no encontrado" };
  const name = getDisplayName(profile);
  return {
    title: `${name} · IAMJOSHWA Pass`,
    description: `Credencial pública de ${name} dentro del Inner Circle de IAMJOSHWA.`,
    alternates: { canonical: `/pass/${profile.referral_code}` },
    robots: { index: false, follow: true },
    openGraph: {
      title: `${name} · IAMJOSHWA Pass`,
      description: `Member #${formatMember(profile.member_number)} · ${profile.favorite_project === "afterluv" ? "AFTERLUV" : "IAMJOSHWA"} signal.`,
      url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/pass/${profile.referral_code}`,
      siteName: "IAMJOSHWA",
      type: "profile",
    },
  };
}

export default async function PublicPassPage({ params }: Props) {
  const { code } = await params;
  const profile = await getPublicPass(code);
  if (!profile) notFound();

  const points = await getPublicPoints(profile.id);
  const level = getLevelFromPoints(points);
  const levelConfig = getLevelConfig(level.label);
  const levelNumber = getLevelNumber(level.label);
  const memberNumber = formatMember(profile.member_number);
  const displayName = getDisplayName(profile);
  const project = profile.favorite_project === "afterluv" ? "afterluv" : "iamjoshwa";
  const passUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/pass/${profile.referral_code}`;
  const inviteUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/r/${profile.referral_code}`;
  const qr = await QRCode.toDataURL(passUrl, { width: 360, margin: 1, errorCorrectionLevel: "H", color: { dark: "#050505", light: "#ffffff" } });

  return (
    <main className="public-pass-page pass-level-system" data-level={levelConfig.key} style={{
      "--pass-level-color": levelConfig.color,
      "--pass-level-soft": levelConfig.softColor,
      "--pass-level-glow": levelConfig.glow,
      "--pass-next-level-color": levelConfig.color,
    } as React.CSSProperties}>
      <Link className="text-link public-pass-back" href="/comunidad">
        <ArrowLeft /> Comunidad
      </Link>

      <section className="public-pass-shell">
        <article className="public-pass-card" data-project={project}>
          <div className="pass-card-shine" />
          <div className="public-pass-topline">
            <span>IAMJOSHWA PASS</span>
            <small>VERIFIED INNER CIRCLE</small>
          </div>
          <div className="public-pass-identity">
            <small>@{displayName.replace(/^@/, "").toLowerCase()}</small>
            <h1>{displayName}</h1>
            <p>{profile.city || "Signal city"} · {String(profile.country || "MX").toUpperCase()}</p>
          </div>
          <div className="public-pass-level">
            <ShieldCheck />
            <div>
              <span>LEVEL {String(levelNumber).padStart(2, "0")}</span>
              <strong>{levelConfig.label}</strong>
            </div>
          </div>
          <div className="public-pass-bottom">
            <span>MEMBER #{memberNumber}</span>
            <span>{project === "afterluv" ? "AFTERLUV SIGNAL" : "IAMJOSHWA SIGNAL"}</span>
          </div>
        </article>

        <article className="public-pass-panel">
          <div className="qr-frame level-qr-frame">
            <Image src={qr} alt={`QR público del Pass de ${displayName}`} width={220} height={220} unoptimized priority />
          </div>
          <span className="section-kicker">PASS VERIFIED</span>
          <h2>Credencial activa.</h2>
          <p>
            Este QR confirma una identidad pública del Inner Circle. Los datos privados del usuario permanecen protegidos.
          </p>
          <div className="public-pass-facts">
            <span><Sparkles /> {points.toLocaleString("es-MX")} XP</span>
            <span><QrCode /> #{memberNumber}</span>
          </div>
          <div className="inline-actions">
            <Link className="button primary" href={inviteUrl}>
              <UserPlus /> Crear mi Pass
            </Link>
            <Link className="button secondary" href="/acceso?next=%2Fperfil">
              Entrar a mi cuenta
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

async function getPublicPass(rawCode: string) {
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (!code) return null;
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("profiles")
      .select("id,display_name,public_alias,city,country,favorite_project,member_number,referral_code")
      .eq("referral_code", code)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function getPublicPoints(userId: string) {
  try {
    const db = createAdminClient();
    const { data } = await db.from("fan_status").select("points").eq("user_id", userId).maybeSingle();
    return Number(data?.points || 0);
  } catch {
    return 0;
  }
}

function getDisplayName(profile: { public_alias: string | null; display_name: string | null }) {
  return String(profile.public_alias || profile.display_name || "Listener");
}

function formatMember(value: number | string | null) {
  return String(value || 0).padStart(6, "0");
}
