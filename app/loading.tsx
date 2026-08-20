export default function Loading() {
  return (
    <main className="signal-loading-screen" aria-label="Cargando contenido">
      <section>
        <span>SIGNAL LOADING</span>
        <h1>IAMJOSHWA WORLD</h1>
        <div className="signal-loading-orb" aria-hidden="true" />
        <div className="signal-loading-grid" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
    </main>
  );
}
