import { createClient } from "npm:@supabase/supabase-js@2";

type OutboxRow = {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_role: "volunteer" | "home" | "admin";
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);

const display = (value: unknown, fallback = "—") =>
  value === null || value === undefined || value === "" ? fallback : String(value);

function emailContent(row: OutboxRow, appBaseUrl: string) {
  const p = row.payload || {};
  const title = display(p.activity_title, "your Sahaaya activity");
  const home = display(p.home_name, "the care home");
  const volunteer = display(p.volunteer_name, "the volunteer");
  let heading = "You have a Sahaaya update";
  let intro = "There is a new update in your Sahaaya account.";
  let details = "";

  switch (row.event_type) {
    case "application_received":
      heading = "New volunteer application";
      intro = `${escapeHtml(volunteer)} has applied to help at ${escapeHtml(home)}.`;
      details = `<p><strong>Activity:</strong> ${escapeHtml(title)}</p><p><strong>Date:</strong> ${escapeHtml(display(p.activity_date))}</p>`;
      break;
    case "application_status_changed": {
      const status = display(p.status, "updated");
      heading = status === "approved" ? "Your application was approved" :
        status === "rejected" ? "Your application was not approved" :
        status === "attended" ? "Your attendance was confirmed" :
        status === "cancelled" ? "Your application was cancelled" : "Your application was updated";
      intro = `Your application for <strong>${escapeHtml(title)}</strong> at ${escapeHtml(home)} is now <strong>${escapeHtml(status)}</strong>.`;
      details = `<p><strong>Date:</strong> ${escapeHtml(display(p.activity_date))}</p>`;
      break;
    }
    case "new_application_message":
      heading = "You have a new Sahaaya message";
      intro = `${escapeHtml(display(p.sender_name, "Someone"))} sent you a message about <strong>${escapeHtml(title)}</strong>.`;
      details = "<p>Sign in to Sahaaya to read and reply to the conversation.</p>";
      break;
    case "home_verification_changed": {
      const status = display(p.verification_status, "updated");
      heading = "Care home verification update";
      intro = `The verification status for <strong>${escapeHtml(home)}</strong> is now <strong>${escapeHtml(status.replaceAll("_", " "))}</strong>.`;
      break;
    }
    case "attendance_recorded":
      heading = "Volunteer hours confirmed";
      intro = `Your attendance for <strong>${escapeHtml(title)}</strong> at ${escapeHtml(home)} has been recorded.`;
      details = `<p><strong>Hours credited:</strong> ${escapeHtml(display(p.hours, "0"))}</p>`;
      break;
    default:
      break;
  }

  const portalPath = row.recipient_role === "home" ? "/home/" :
    row.recipient_role === "admin" ? "/admin/" : "/volunteer/";
  const actionUrl = new URL(portalPath, appBaseUrl).toString();
  const safeName = escapeHtml(display(row.recipient_name, "there"));
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#243247;padding:28px 12px"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6eaf0;border-radius:14px;overflow:hidden"><div style="padding:24px 28px;background:#263a5b;color:#fff;font-size:20px;font-weight:700">Sahaaya</div><div style="padding:28px"><p style="margin:0 0 8px;color:#64748b">Hello ${safeName},</p><h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${escapeHtml(heading)}</h1><p style="font-size:15px;line-height:1.7">${intro}</p>${details}<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#263a5b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Open Sahaaya</a></p><p style="font-size:12px;color:#8792a2;line-height:1.6">This is an automatic notification from Sahaaya. Please do not reply to this email.</p></div></div></body></html>`;
  const text = `Hello ${display(row.recipient_name, "there")},\n\n${heading}\n\n${intro.replace(/<[^>]*>/g, "")}\n\nOpen Sahaaya: ${actionUrl}\n`;
  const subject = `${heading} | Sahaaya`;
  return { subject, html, text };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,x-sahaaya-webhook-secret", "Access-Control-Allow-Methods": "POST,OPTIONS" } });
  }
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const webhookSecret = Deno.env.get("SAHAAYA_WEBHOOK_SECRET");
  if (!webhookSecret || request.headers.get("x-sahaaya-webhook-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://sahaaya-five.vercel.app";

  if (!supabaseUrl || !serviceRoleKey || !resendKey || !from) {
    return new Response("Missing required Edge Function secrets", { status: 500 });
  }

  let webhook: { record?: { id?: string } };
  try {
    webhook = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const outboxId = webhook.record?.id;
  if (!outboxId) return new Response("Missing outbox record id", { status: 400 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: readError } = await supabase
    .from("email_outbox")
    .select("id,recipient_email,recipient_name,recipient_role,event_type,payload,status,attempts")
    .eq("id", outboxId)
    .maybeSingle();

  if (readError || !row) return new Response("Outbox record not found", { status: 404 });
  const emailRow = row as OutboxRow;
  if (emailRow.status === "sent") return Response.json({ ok: true, duplicate: true });

  await supabase.from("email_outbox").update({
    status: "processing",
    attempts: (emailRow.attempts || 0) + 1,
    last_error: null,
  }).eq("id", outboxId);

  const content = emailContent(emailRow, appBaseUrl);
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `sahaaya-email-${outboxId}`,
    },
    body: JSON.stringify({
      from,
      to: [emailRow.recipient_email],
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
  });

  const resendBody = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    const message = String(resendBody.message || resendBody.error || `Resend returned HTTP ${resendResponse.status}`).slice(0, 1000);
    await supabase.from("email_outbox").update({ status: "failed", last_error: message }).eq("id", outboxId);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }

  const { error: updateError } = await supabase.from("email_outbox").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    last_error: null,
  }).eq("id", outboxId);

  if (updateError) return Response.json({ ok: false, error: "Email sent but outbox status update failed" }, { status: 500 });
  return Response.json({ ok: true, email_id: resendBody.id });
});
