import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedMimeTypes, maxBytes } from "@/lib/media/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await createClient();
  if (!session) return NextResponse.json({ error: "No configurado" }, { status: 503 });
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data: roles } = await session.from("user_roles").select("role").eq("user_id", user.id);
  const editor = roles?.some((item) => item.role === "editor" || item.role === "admin");
  const admin = roles?.some((item) => item.role === "admin");
  if (!editor) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.formData();
  const file = body.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  if (!allowedMimeTypes.has(file.type) || (file.type === "image/svg+xml" && !admin)) return NextResponse.json({ error: "Tipo no permitido" }, { status: 400 });
  const group = file.type.split("/")[0];
  if (file.size > (maxBytes[group] || 10 * 1024 * 1024)) return NextResponse.json({ error: "Archivo demasiado grande" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) return NextResponse.json({ error: "El contenido no coincide con el tipo declarado" }, { status: 400 });
  let payload = bytes;
  if (file.type === "image/svg+xml") payload = sanitizeSvg(bytes);

  let width: number | null = null;
  let height: number | null = null;
  if (file.type.startsWith("image/")) {
    try {
      const metadata = await sharp(payload, { limitInputPixels: 100_000_000 }).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    } catch {
      return NextResponse.json({ error: "No fue posible leer la imagen" }, { status: 400 });
    }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const db = createAdminClient();
  const upload = await db.storage.from("public-media").upload(path, payload, { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });

  const displayName = file.name.replace(/\.[^.]+$/, "") || file.name;
  const metadata = await db.from("media_assets").insert({
    bucket: "public-media", storage_path: path, original_filename: file.name,
    display_name: displayName, title: displayName,
    alt_text: file.type.startsWith("image/") ? displayName : null,
    mime_type: file.type, extension: ext, byte_size: payload.byteLength,
    width, height, focal_x: width ? 0.5 : null, focal_y: height ? 0.5 : null,
    uploaded_by: user.id,
  }).select("*").single();
  if (metadata.error) {
    await db.storage.from("public-media").remove([path]);
    return NextResponse.json({ error: metadata.error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, asset:{...metadata.data,public_url:db.storage.from("public-media").getPublicUrl(path).data.publicUrl} }, { status: 201 });
}

function sanitizeSvg(bytes: Uint8Array) {
  const clean = sanitizeHtml(new TextDecoder().decode(bytes), {
    allowedTags: ["svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "defs", "linearGradient", "radialGradient", "stop", "title", "desc"],
    allowedAttributes: { svg: ["xmlns", "viewBox", "width", "height", "fill", "stroke", "role", "aria-label"], "*": ["d", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "points", "fill", "stroke", "stroke-width", "transform", "offset", "stop-color", "stop-opacity", "opacity"] },
    allowedSchemes: [],
  });
  return new TextEncoder().encode(clean);
}

function signatureMatches(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/webp") return text(bytes, 0, 4) === "RIFF" && text(bytes, 8, 12) === "WEBP";
  if (mime === "application/pdf") return text(bytes, 0, 5) === "%PDF-";
  if (mime === "image/svg+xml") return new TextDecoder().decode(bytes.slice(0, 500)).includes("<svg");
  if (mime === "video/mp4") return text(bytes, 4, 8) === "ftyp";
  if (mime === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mime === "audio/mpeg") return text(bytes, 0, 3) === "ID3" || bytes[0] === 0xff;
  if (mime === "audio/wav") return text(bytes, 0, 4) === "RIFF" && text(bytes, 8, 12) === "WAVE";
  if (mime === "image/avif") return text(bytes, 4, 12).includes("ftyp");
  return false;
}

function text(bytes: Uint8Array, start: number, end: number) {
  return new TextDecoder().decode(bytes.slice(start, end));
}
