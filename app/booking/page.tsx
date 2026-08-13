import Link from "next/link";
import { CalendarCheck, FileText, ShieldCheck, Timer, UserRoundCheck } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { BookingForm } from "@/components/booking-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = {
  title: "Booking",
  description: "Solicita una fecha para IAMJOSHWA o AFTERLUV con folio, revisión humana y seguimiento profesional.",
};

export default function BookingPage() {
  const enabled = isSupabaseConfigured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <>
      <PageHero kicker="BOOKING" title="Llevemos la energía a tu evento." description="Solicitud profesional para clubs, festivales, raves, showcases y eventos privados. Sin precios automáticos: cada propuesta se revisa por contexto." />

      <section className="section booking-intro-grid pro-booking-intro">
        <article><span>01</span><h2>Solicitud clara</h2><p>Fecha, ciudad, venue, formato, producción y energía deseada.</p></article>
        <article><span>02</span><h2>Revisión humana</h2><p>Se evalúa disponibilidad, logística, audiencia y tipo de show.</p></article>
        <article><span>03</span><h2>Seguimiento con folio</h2><p>Tu solicitud queda registrada en el panel admin para dar respuesta profesional.</p></article>
      </section>

      <section className="section booking-layout pro-booking-layout">
        <aside className="booking-promoter-panel">
          <span className="section-kicker">PROMOTER DESK</span>
          <h2>Información que acelera una respuesta.</h2>
          <p>Completa lo que tengas. Si algo aún está por confirmar, escríbelo claramente en el mensaje.</p>
          <div className="booking-signal-list">
            <div><CalendarCheck /><span>Fecha y horario tentativo</span></div>
            <div><UserRoundCheck /><span>Capacidad y perfil del público</span></div>
            <div><ShieldCheck /><span>Producción, audio e iluminación</span></div>
            <div><Timer /><span>Respuesta estimada 24–48 horas hábiles</span></div>
          </div>
          <Link className="button secondary" href="/epk">
            <FileText /> Ver EPK antes de enviar
          </Link>
          {!enabled ? <div className="config-alert">El envío está desactivado hasta configurar el backend. No se mostrará un éxito falso.</div> : null}
        </aside>
        <BookingForm enabled={enabled} />
      </section>
    </>
  );
}
