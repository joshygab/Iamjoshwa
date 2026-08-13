import "server-only";
import { getResend } from "@/lib/email/resend";
import type { NotificationMessage, NotificationProvider } from "./provider";

export class EmailProvider implements NotificationProvider {
  async send(message: NotificationMessage) {
    const resend = getResend();
    const from = process.env.RESEND_FROM_EMAIL;
    if (!resend || !from) return { id: "unconfigured", status: "skipped" as const };

    const headers: Record<string, string> = { "X-Entity-Ref-ID": message.idempotencyKey };
    if (message.unsubscribeUrl) headers["List-Unsubscribe"] = `<${message.unsubscribeUrl}>`;

    const { data, error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject || "IAMJOSHWA",
      html: message.html || `<p>${message.text}</p>`,
      headers,
    });
    if (error) throw error;
    return { id: data?.id || message.idempotencyKey, status: "sent" as const };
  }
}
