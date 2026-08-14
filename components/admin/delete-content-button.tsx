"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteContentButton({ module, id, title, compact = false }: { module: string; id: string; title: string; compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deleteForever() {
    const label = title || "este contenido";
    const confirmed = window.confirm(`¿Eliminar definitivamente “${label}”? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    const secondConfirmation = window.confirm("Confirmación final: se borrará de la base de datos, no solo se archivará. ¿Continuar?");
    if (!secondConfirmation) return;
    setLoading(true);
    const response = await fetch("/api/admin/content", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ module, id, hardDelete: true }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      window.alert(data.error || "No fue posible eliminar este contenido.");
      return;
    }
    router.push(`/admin/${module}`);
    router.refresh();
  }

  return (
    <button className={`button danger-button ${compact ? "compact-danger-button" : ""}`} type="button" onClick={deleteForever} disabled={loading}>
      <Trash2 /> {loading ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
