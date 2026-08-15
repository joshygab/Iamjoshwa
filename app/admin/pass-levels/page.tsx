import type { CSSProperties } from "react";
import { Crown, Gauge, LockKeyhole, Save, Sparkles, Trophy, Zap } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { getLevelConfig } from "@/config/levels";
import { saveFanLevel } from "../actions";

type FanLevelRow = {
  id: number;
  name: string;
  min_points: number;
  position: number;
};

const icons = [Sparkles, Crown, Zap, LockKeyhole, Trophy, Trophy];

export default async function AdminPassLevelsPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("fan_levels").select("id,name,min_points,position").order("position");
  const levels = (data || []) as FanLevelRow[];

  return (
    <>
      <header className="admin-header pass-level-admin-head">
        <div>
          <span className="section-kicker">IAMJOSHWA PASS</span>
          <h1>Niveles y puntos</h1>
          <p>Controla cuántos XP necesita cada fan para subir de nivel. Esto afecta el Pass, progreso y comunidad.</p>
        </div>
        <a className="button secondary" href="/comunidad" target="_blank">Ver comunidad</a>
      </header>

      <section className="pass-level-admin-summary">
        <article>
          <Gauge />
          <span>Niveles activos</span>
          <strong>{levels.length}</strong>
        </article>
        <article>
          <Sparkles />
          <span>Primer desbloqueo</span>
          <strong>{levels[1]?.min_points?.toLocaleString("es-MX") || 100} XP</strong>
        </article>
        <article>
          <Trophy />
          <span>Nivel máximo</span>
          <strong>{levels.at(-1)?.min_points?.toLocaleString("es-MX") || 3000} XP</strong>
        </article>
      </section>

      <section className="pass-level-admin-grid">
        {levels.map((level, index) => {
          const config = getLevelConfig(level.name);
          const next = levels[index + 1];
          const Icon = icons[index] || Sparkles;
          const span = next ? Math.max(1, next.min_points - level.min_points) : Math.max(1, level.min_points);
          const intensity = Math.min(100, Math.max(18, Math.round((level.min_points / Math.max(1, levels.at(-1)?.min_points || 3000)) * 100)));
          return (
            <form action={saveFanLevel} className="pass-level-admin-card" key={level.id} style={{
              "--pass-level-color": config.color,
              "--pass-level-soft": config.softColor,
              "--level-intensity": `${intensity}%`,
            } as CSSProperties}>
              <input type="hidden" name="id" value={level.id} />
              <div className="pass-level-admin-card-top">
                <Icon />
                <span>LEVEL {String(level.position).padStart(2, "0")}</span>
              </div>
              <div>
                <h2>{level.name}</h2>
                <p>{config.personality}</p>
              </div>
              <label>
                Puntos necesarios
                <input name="minPoints" type="number" min={level.id === 1 ? 0 : 1} step="1" defaultValue={level.min_points} readOnly={level.id === 1} />
              </label>
              <div className="pass-level-admin-meter" aria-hidden="true">
                <span />
              </div>
              <small>
                {level.id === 1 ? "Nivel base: siempre inicia en 0 XP." : next ? `Rango sugerido antes del siguiente nivel: ${span.toLocaleString("es-MX")} XP.` : "Nivel final del Pass."}
              </small>
              <button className="button primary" disabled={level.id === 1}>
                <Save /> Guardar nivel
              </button>
            </form>
          );
        })}
      </section>

      <section className="settings-card pass-level-admin-note">
        <span>IMPORTANTE</span>
        <h2>Los puntos no se editan desde frontend.</h2>
        <p>Esta pantalla solo cambia los umbrales de nivel. Los puntos de cada fan siguen viniendo del ledger seguro y de funciones del servidor.</p>
      </section>
    </>
  );
}
