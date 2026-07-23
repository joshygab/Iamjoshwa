# IAMJOSHWA / AFTERLUV

Plataforma oficial construida con Next.js App Router, TypeScript, Tailwind CSS y Supabase. IAMJOSHWA y AFTERLUV comparten cuenta, base de datos y administración, pero conservan identidad y contenido independientes.

## Estado: plataforma completa para MVP de producción

La Fase 1 entrega el sitio público responsive: inicio, fechas, evento individual, música, lanzamientos, media, historia, EPK y booking.

La Fase 2 conecta Supabase y entrega:

- Autenticación por correo y contraseña con roles `fan`, `editor` y `admin`.
- RLS, funciones seguras, auditoría y migraciones reproducibles.
- Storage con `public-media`, `private-documents` y `user-avatars`.
- CMS protegido en `/admin`.
- Identidad independiente de IAMJOSHWA y AFTERLUV.
- Biblioteca multimedia con validación MIME, metadata, dimensiones y punto focal.
- Administración de logos, heroes de escritorio/celular, eventos, sets, tracklists, lanzamientos, plataformas, Historia y EPK.
- Portada por bloques seguros, borradores, programación, publicación y versiones.
- SEO administrable e imagen social.
- Booking con folio, protección de duplicados, seguimiento y auditoría.
- Disponibilidad del artista y dashboard administrativo.

La Fase 3 añade:

- Registro e inicio de sesión por correo y contraseña.
- Preparado para desactivar confirmación obligatoria de email en Supabase.
- Onboarding, perfil y preferencias por proyecto, género, ciudad y tipo de aviso.
- Consentimientos de comunicación con historial y estado vigente.
- Baja segura por email mediante enlace firmado y confirmación explícita.
- Correo de bienvenida con Resend cuando sus credenciales están configuradas.
- Segmentación preparada para ciudad, proyecto e intereses.

La Fase 4 añade:

- IAMJOSHWA PASS con perfil, número de miembro, nivel, puntos, insignias, QR personal y referidos.
- Ledger de puntos seguro: el frontend no puede otorgar puntos directamente.
- Puntos por perfil completo, pre-save, abrir sets, confirmar asistencia, compartir, check-in QR y referidos.
- Check-in QR administrable desde `/admin/checkins`, con expiración, desactivación y recompensa única.
- Recompensas publicables desde CMS, inventario y canje seguro con saldo actualizado.

La Fase 5 añade:

- Campañas por email con Resend, consentimiento vigente y enlaces de baja.
- Cron de mantenimiento para programación de publicaciones, eventos finalizados y campañas pendientes.
- Capa futura de WhatsApp con feature flag, sin simular mensajes reales.
- Métricas administrativas basadas en registros reales de booking, campañas, puntos y actividad.

La Fase 6 cierra:

- SEO dinámico, sitemap, robots, Open Graph, datos estructurados, 404 y accesibilidad base.
- Build verificable para Vercel.
- `.env.example` documentado sin secretos reales.

El envío de novedades mediante Resend permanece desactivado hasta introducir credenciales válidas.

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000` y el CMS en `http://localhost:3000/admin`.

## Supabase

Configura en `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
SUPABASE_DB_PASSWORD=
```

Las tres últimas variables son exclusivamente de servidor. Nunca deben usar `NEXT_PUBLIC_` ni subirse al repositorio.

Aplica las migraciones de `supabase/migrations` con una vista previa antes de ejecutar `supabase db push`. El primer usuario se registra con correo y contraseña y recibe el rol inicial `fan`; no existe una ruta pública para autoasignarse permisos administrativos.

## Booking y correo

Las solicitudes se guardan en Supabase aunque Resend todavía no esté configurado. Para enviar confirmaciones y avisos agrega `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `BOOKING_NOTIFICATION_EMAIL`. No se simulan correos cuando faltan credenciales.

`RESEND_FROM_EMAIL` debe usar un remitente autorizado en Resend. Los mensajes de novedades incluyen un enlace firmado para cancelar la suscripción. Conserva `FINGERPRINT_SALT` como secreto estable: cambiarlo invalida los enlaces de baja existentes.

## Verificación

```bash
npm run verify
```

## Contenido oficial pendiente

Antes de publicar carga desde `/admin`: logos, favicon, heroes 16:9 y 9:16, biografías, fechas, flyers, sets, tracklists, lanzamientos, fotografías, videos, riders, redes, booking y dominio final.

Las imágenes provisionales pueden reemplazarse desde `/admin/media` y `/admin/configuracion` sin modificar código ni desplegar nuevamente.

## Seguridad

- `.env.local` está ignorado por Git.
- Los fans no pueden cambiar roles ni otorgarse puntos.
- Editores sin permiso de publicación no pueden publicar directamente en Postgres.
- El último administrador no puede eliminarse accidentalmente.
- La eliminación definitiva de multimedia es exclusiva de administradores.
- Los documentos privados no son públicos.
- Las acciones administrativas importantes se registran en `audit_logs`.
