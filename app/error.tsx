"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="not-found signal-screen" role="alert">
      <span>!</span>
      <h1>SIGNAL INTERRUPTED.</h1>
      <p>No pudimos cargar esta sección. Tu universo, sesión y preferencias permanecen protegidas.</p>
      <button className="button primary" onClick={reset}>Reconectar</button>
    </section>
  );
}
