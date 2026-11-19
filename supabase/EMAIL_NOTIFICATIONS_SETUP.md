# Sahaaya automatic email notifications

This implementation uses a private PostgreSQL outbox, a Supabase Database Webhook, a Supabase Edge Function and Resend. No Resend credential is placed in browser JavaScript.

## Events

| Event | Email recipients |
| --- | --- |
| New volunteer application | Host care home + all admins |
| Application approved/rejected/cancelled | Volunteer + all admins |
| New application chat message | The other conversation participant |
| Care-home verification status changes | Care home + all admins |
| Attendance is marked present | Volunteer + all admins |

The attendance event is the single email for attendance crediting; the application status trigger deliberately skips the resulting `attended` status to avoid duplicate emails. Accounts without an email address are skipped.

## 1. Verify a sender domain in Resend

1. Create/sign in to Resend.
2. Add a domain you control and complete the DNS verification records Resend provides.
3. Create an API key with permission to send email.
4. Choose a sender address on that verified domain, for example `Sahaaya <notifications@yourdomain.com>`.

Do not use a random or unverified sender domain. Do not commit the Resend API key to GitHub or paste it into frontend files.

## 2. Apply the database migration

In Supabase Dashboard → SQL Editor, run the complete file:

`supabase/migrations/202611190005_email_notifications_outbox.sql`

The migration creates `public.email_outbox` and database triggers. It is safe to re-run. The outbox is not readable by normal authenticated browser users.

## 3. Deploy the Edge Function

From the repository root, install/use the Supabase CLI and link the project if it is not already linked:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Generate a long random webhook secret locally. Keep the same value for the Edge Function secret and the Database Webhook header:

```bash
openssl rand -hex 32
```

Set Edge Function secrets (replace placeholders locally; never commit these values):

```bash
supabase secrets set \
  RESEND_API_KEY="re_your_key" \
  EMAIL_FROM="Sahaaya <notifications@yourdomain.com>" \
  SAHAAYA_WEBHOOK_SECRET="your_random_secret" \
  APP_BASE_URL="https://sahaaya-five.vercel.app" \
  --project-ref YOUR_PROJECT_REF
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. The function uses the service-role key only on the server to read/update the outbox.

Deploy:

```bash
supabase functions deploy send-email-notification --project-ref YOUR_PROJECT_REF
```

Function URL:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email-notification`

## 4. Connect the database webhook

In Supabase Dashboard → Database → Webhooks, create a webhook:

- Name: `sahaaya-email-outbox`
- Table: `public.email_outbox`
- Event: `INSERT` only
- Method: `POST`
- URL: the Edge Function URL above
- Header: `x-sahaaya-webhook-secret: YOUR_SAME_RANDOM_SECRET`
- Content-Type: `application/json`

Save and enable it. The Edge Function rejects requests without the matching secret header.

## 5. Verify delivery

After the webhook is enabled, test a real workflow using accounts with valid email addresses:
- Submit an application.
- Approve or reject it from the care-home account.
- Send a chat message from each side.
- Change a home's verification status as an admin.
- Mark an approved volunteer present.

Inspect delivery records:

```sql
SELECT id, recipient_email, recipient_role, event_type, status,
       attempts, last_error, created_at, sent_at
FROM public.email_outbox
ORDER BY created_at DESC
LIMIT 30;
```

Expected successful status: `sent`. A `failed` row includes the Resend/API error in `last_error`. Check Supabase Edge Function logs and Resend Logs if delivery fails.

## Operational notes

- The webhook is asynchronous; a successful database write does not mean the email has already arrived.
- Email rows are retained as an operational delivery log. They contain recipient addresses and event metadata and are not exposed to normal authenticated users.
- A failed delivery remains visible as `failed`; fix the underlying Resend/configuration issue before retrying the webhook delivery.
- This sends email only for Supabase-backed database events. Local demo/LocalStorage mode does not send email.
