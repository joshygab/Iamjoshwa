"use client";

import { useRef, useState } from "react";
import { validateMediaFile } from "@/lib/media/validation";

type Upload = { name: string; progress: number; error?: string; status?: string };
export type UploadedAsset = {
  id: string;
  display_name: string;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  tags: string[] | null;
  mime_type: string;
  byte_size: number;
  public_url: string;
  archived_at: string | null;
  width: number | null;
  height: number | null;
  duration_seconds?: number | null;
  focal_x: number | null;
  focal_y: number | null;
  in_gallery?: boolean;
};

export function MediaUploader({ isAdmin, onUploaded }: { isAdmin: boolean; onUploaded?: (asset: UploadedAsset) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);

  async function process(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const validation = validateMediaFile(file, isAdmin);
      setUploads((current) => [...current, { name: file.name, progress: validation ? 0 : 1, error: validation || undefined, status: validation ? "Rechazado" : "Preparando" }]);
      if (validation) continue;
      try {
        const asset = await uploadFile(file, (progress) => {
          setUploads((current) => current.map((item) => item.name === file.name ? { ...item, progress, status: progress < 100 ? "Subiendo" : "Procesando" } : item));
        });
        setUploads((current) => current.map((item) => item.name === file.name ? { ...item, progress: 100, status: "Listo" } : item));
        onUploaded?.({ ...asset, in_gallery: false });
      } catch (error) {
        setUploads((current) => current.map((item) => item.name === file.name ? { ...item, error: error instanceof Error ? error.message : "No fue posible subir el archivo", status: "Error" } : item));
      }
    }
  }

  return (
    <div>
      <div className="media-help-grid">
        <article><strong>Hero escritorio</strong><span>16:9 · 1920x1080</span></article>
        <article><strong>Hero celular</strong><span>9:16 · 1080x1920</span></article>
        <article><strong>Cover set / release</strong><span>1:1 · 3000x3000</span></article>
        <article><strong>Audio de sets</strong><span>MP3/WAV · hasta 50 MB</span></article>
      </div>
      <div className="media-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void process(event.dataTransfer.files); }}>
        <strong>Arrastra archivos aquí</strong>
        <p>Sube fotos, videos, PDFs o audio. Los MP3/WAV aparecerán como opción al crear o editar un set.</p>
        <button className="button primary" type="button" onClick={() => input.current?.click()}>Seleccionar archivos</button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(event) => void process(event.target.files)}
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,video/mp4,video/webm,audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav,application/pdf"
        />
      </div>
      {uploads.length > 0 && (
        <div className="upload-list">
          {uploads.map((item, index) => (
            <div key={`${item.name}-${index}`}>
              <span>{item.name}</span>
              <progress value={item.progress} max="100" />
              <small>{item.error || `${item.status || "Subiendo"} · ${Math.round(item.progress)}%`}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function uploadFile(file: File, onProgress: (progress: number) => void) {
  return new Promise<UploadedAsset>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const form = new FormData();
    form.set("file", file);
    request.open("POST", "/api/admin/media/upload");
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(96, Math.max(1, (event.loaded / event.total) * 96)));
    };
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText || "{}");
        if (request.status >= 200 && request.status < 300 && data.asset) resolve(data.asset);
        else reject(new Error(data.error || "No fue posible subir el archivo"));
      } catch {
        reject(new Error("Respuesta inválida del servidor"));
      }
    };
    request.onerror = () => reject(new Error("Error de red al subir el archivo"));
    request.send(form);
  });
}
