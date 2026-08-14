import Link from "next/link";

export const metadata = {
  title: "Signal interrupted",
};

export default function OfflinePage() {
  return (
    <section className="not-found signal-screen offline-signal">
      <span>OFFLINE MODE</span>
      <h1>SIGNAL INTERRUPTED.</h1>
      <p>Tu conexión se cortó. La app instalada conserva la señal básica y volverá a sincronizar shows, música, Pass y booking cuando regrese internet.</p>
      <div className="inline-actions centered-actions">
        <Link className="button primary" href="/">Reconectar</Link>
        <Link className="button secondary" href="/musica">Abrir música</Link>
        <Link className="button secondary" href="/fechas">Ver fechas</Link>
      </div>
    </section>
  );
}
