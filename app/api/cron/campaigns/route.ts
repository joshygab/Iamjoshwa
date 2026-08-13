import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailProvider } from "@/lib/notifications/email-provider";
import { buildCampaignEmail } from "@/lib/notifications/templates";

type Filters = { project?: "iamjoshwa" | "afterluv"; city?: string };
type Template = { title?: string; message?: string; url?: string; cta?: string; eyebrow?: string };

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: campaigns, error } = await db
    .from("campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .eq("channel", "email")
    .limit(5);
  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const campaign of campaigns || []) {
    const campaignStats = { sent: 0, skipped: 0, failed: 0 };
    await db.from("campaigns").update({ status: "sending" }).eq("id", campaign.id);
    const {
      data: { users },
    } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const provider = new EmailProvider();

    for (const user of users) {
      const idempotencyKey = `${campaign.id}:${user.id}`;
      if (!user.email) {
        skipped++;
        campaignStats.skipped++;
        continue;
      }

      const [{ data: consent }, { data: preference }, { data: profile }, { data: existing }] =
        await Promise.all([
          db.from("current_notification_consents").select("granted").eq("user_id", user.id).eq("channel", "email").maybeSingle(),
          db.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
          db.from("profiles").select("city,favorite_project").eq("id", user.id).maybeSingle(),
          db.from("campaign_deliveries").select("id").eq("idempotency_key", idempotencyKey).maybeSingle(),
        ]);

      const filters = (campaign.audience_filters || {}) as Filters;
      const shouldSkip =
        existing ||
        !consent?.granted ||
        preference?.preferred_channel !== "email" ||
        !wantsTrigger(preference, campaign.trigger_type) ||
        !matchesAudience(filters, profile, preference);

      if (shouldSkip) {
        skipped++;
        campaignStats.skipped++;
        continue;
      }

      const destinationHash = await sha256(user.email);
      const template = (campaign.template_data || {}) as Template;
      const email = buildCampaignEmail({
        userId: user.id,
        templateKey: campaign.template_key || campaign.trigger_type,
        subject: campaign.subject || "IAMJOSHWA",
        data: template,
      });

      try {
        const result = await provider.send({
          to: user.email,
          subject: campaign.subject || "IAMJOSHWA",
          text: email.text,
          html: email.html,
          unsubscribeUrl: email.unsubscribeUrl,
          idempotencyKey,
        });
        await db.from("campaign_deliveries").insert({
          campaign_id: campaign.id,
          user_id: user.id,
          destination_hash: destinationHash,
          provider_message_id: result.id,
          status: result.status,
          idempotency_key: idempotencyKey,
          sent_at: result.status === "sent" ? new Date().toISOString() : null,
        });
        if (result.status === "sent") {
          sent++;
          campaignStats.sent++;
        } else {
          skipped++;
          campaignStats.skipped++;
        }
      } catch (cause) {
        failed++;
        campaignStats.failed++;
        await db.from("campaign_deliveries").insert({
          campaign_id: campaign.id,
          user_id: user.id,
          destination_hash: destinationHash,
          status: "failed",
          error_code: cause instanceof Error ? cause.message.slice(0, 200) : "unknown",
          idempotency_key: idempotencyKey,
        });
      }
    }

    await db
      .from("campaigns")
      .update({
        status: "sent",
        template_data: {
          ...((campaign.template_data || {}) as Record<string, unknown>),
          last_run: { ...campaignStats, finished_at: new Date().toISOString() },
        },
      })
      .eq("id", campaign.id);
  }

  return NextResponse.json({ ok: true, campaigns: campaigns?.length || 0, sent, skipped, failed });
}

function wantsTrigger(pref: Record<string, unknown> | null, trigger: string | null) {
  if (!pref) return false;
  const map: Record<string, string> = {
    event_7d: "event_announcements",
    event_24h: "event_announcements",
    event_2h: "event_announcements",
    last_tickets: "ticket_alerts",
    new_event: "event_announcements",
    new_release: "releases",
    release_available: "releases",
    presave: "presaves",
    new_set: "sets",
    exclusive: "exclusive_content",
    post_event: "event_announcements",
    manual: "exclusive_content",
  };
  return Boolean(pref[map[trigger || ""] || "event_announcements"]);
}

function matchesAudience(filters: Filters, profile: { city?: string | null; favorite_project?: string | null } | null, pref: Record<string, unknown> | null) {
  if (filters.project && !pref?.[filters.project]) return false;
  if (filters.city && pref?.city_based && profile?.city?.toLocaleLowerCase("es-MX") !== filters.city.toLocaleLowerCase("es-MX")) return false;
  return true;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
