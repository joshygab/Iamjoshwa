"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <section className="not-found" role="alert"><span>!</span><h1>La señal se interrumpió.</h1><p>No pudimos cargar esta sección. Tu preferencia de universo permanece guardada.</p><button className="button primary" onClick={reset}>Intentar de nuevo</button></section>}
