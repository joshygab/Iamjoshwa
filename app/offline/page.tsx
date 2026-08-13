import Link from "next/link";

export const metadata = {
  title: "Signal interrupted",
};

export default function OfflinePage() {
  return (
    <section className="not-found signal-screen offline-signal">
      <span>OFF</span>
      <h1>SIGNAL INTERRUPTED.</h1>
      <p>Tu conexión se cortó. Cuando el internet vuelva, IAMJOSHWA WORLD se sincronizará de nuevo.</p>
      <div className="inline-actions centered-actions">
        <Link className="button primary" href="/">Reconectar</Link>
        <Link className="button secondary" href="/musica">Abrir música</Link>
      </div>
    </section>
  );
}
