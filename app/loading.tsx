export default function Loading() {
  return (
    <div className="page-loading signal-screen" role="status" aria-live="polite">
      <span className="loading-mark">IJ</span>
      <h1>CONNECTING TO SIGNAL...</h1>
      <p>Sincronizando IAMJOSHWA WORLD.</p>
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <span className="sr-only">Cargando contenido</span>
    </div>
  );
}
