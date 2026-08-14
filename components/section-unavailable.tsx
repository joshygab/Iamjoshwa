import Link from "next/link";

export function SectionUnavailable({
  kicker = "SIGNAL CONTROL",
  title = "SIGNAL NOT YET AVAILABLE",
  body = "Esta sección está oculta o en preparación desde el Control Room.",
  ctaHref = "/",
  ctaLabel = "Volver al inicio",
}: {
  kicker?: string;
  title?: string;
  body?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="section section-unavailable">
      <span>{kicker}</span>
      <h1>{title}</h1>
      <p>{body}</p>
      <Link className="button secondary" href={ctaHref}>{ctaLabel}</Link>
    </section>
  );
}
