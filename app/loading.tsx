import type { CSSProperties } from "react";

export default function Loading() {
  const ghosts = ["SHOWS", "MUSIC", "PASS", "VAULT"];

  return (
    <main className="signal-loading-page page-loading signal-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="signal-loading-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="signal-loading-console">
        <span className="loading-mark">IJ</span>
        <p className="section-kicker">SIGNAL LOADING</p>
        <h1>CONNECTING TO IAMJOSHWA WORLD</h1>
        <p>Sincronizando shows, música, Pass, Vault y booking.</p>
        <div className="signal-loading-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="ghost-card-grid" aria-hidden="true">
        {ghosts.map((label, index) => (
          <article className="ghost-card" key={label} style={{ "--ghost-index": index } as CSSProperties}>
            <span>{label}</span>
            <div />
            <strong />
            <small />
          </article>
        ))}
      </section>
      <span className="sr-only">Cargando contenido</span>
    </main>
  );
}
