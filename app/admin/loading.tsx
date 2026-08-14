import type { CSSProperties } from "react";

export default function AdminLoading() {
  return (
    <main className="admin-loading-page" role="status" aria-live="polite" aria-busy="true">
      <section>
        <span className="section-kicker">CONTROL ROOM</span>
        <h1>SIGNAL LOADING</h1>
        <p>Preparando módulos, media, publicaciones y alertas del CMS.</p>
      </section>
      <div className="admin-loading-grid" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} style={{ "--ghost-index": index } as CSSProperties}>
            <span />
            <strong />
            <small />
          </article>
        ))}
      </div>
    </main>
  );
}
