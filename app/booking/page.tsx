import Link from "next/link";
import { CalendarCheck, FileText, ShieldCheck, Timer, UserRoundCheck } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { BookingForm } from "@/components/booking-form";
import { SectionUnavailable } from "@/components/section-unavailable";
import { createLabelGetter, systemEnabled, systemMessage } from "@/lib/cms/labels";
import { contentRepository } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata({
  path: "/booking",
  title: "Booking",
  description: "Solicita una fecha para IAMJOSHWA o AFTERLUV con folio, revisión humana, EPK y seguimiento profesional.",
});

export default async function BookingPage() {
  const [labels, settings, section] = await Promise.all([contentRepository.getLabels(), contentRepository.getPublicSettings(), contentRepository.getPublicSection("booking")]);
  const label = createLabelGetter(labels);
  const disabled = systemEnabled(settings, "disable_booking");
  const enabled = !disabled && isSupabaseConfigured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <>
      {section === null ? <SectionUnavailable title={label("booking.hidden", "BOOKING HIDDEN")} body={systemMessage(settings, "disable_booking", "Booking is temporarily unavailable.")} /> : null}
      {section === null ? null : (
      <>
      <PageHero kicker={label("booking.kicker", "BOOKING")} title={label("booking.title", "Llevemos la energía a tu evento.")} description={disabled ? systemMessage(settings, "disable_booking", "Booking is temporarily unavailable.") : label("booking.subtitle", "Solicitud profesional para clubs, festivales, raves, showcases y eventos privados. Sin precios automáticos: cada propuesta se revisa por contexto.")} />

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
          {!enabled ? <div className="config-alert">{disabled ? systemMessage(settings, "disable_booking", "Booking is temporarily unavailable.") : "El envío está desactivado hasta configurar el backend. No se mostrará un éxito falso."}</div> : null}
        </aside>
        <BookingForm enabled={enabled} />
      </section>
      </>
      )}
    </>
  );
}
