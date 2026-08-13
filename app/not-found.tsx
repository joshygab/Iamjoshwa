import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found signal-screen">
      <span>404</span>
      <h1>SIGNAL LOST.</h1>
      <p>Esta frecuencia no existe o cambió de ruta. Vuelve a IAMJOSHWA WORLD para encontrar música, shows, Pass o booking.</p>
      <div className="inline-actions centered-actions">
        <Link className="button primary" href="/">Volver al inicio</Link>
        <Link className="button secondary" href="/musica">Listen</Link>
      </div>
    </section>
  );
}
