"use client";

import { Trash2 } from "lucide-react";

export function DeletePageSectionButton({ action, title }: { action: (formData: FormData) => void | Promise<void>; title: string }) {
  return (
    <button
      className="button danger-button"
      type="submit"
      formAction={action}
      onClick={(event) => {
        const first = window.confirm(`¿Eliminar definitivamente “${title}”? Esta acción no solo archiva: borra el bloque de la portada.`);
        if (!first) return event.preventDefault();
        const second = window.confirm("Confirmación final: se eliminarán también programación, usos multimedia y versiones relacionadas. ¿Continuar?");
        if (!second) event.preventDefault();
      }}
    >
      <Trash2 /> Eliminar definitivo
    </button>
  );
}
