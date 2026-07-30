# Supabase Auth Email Templates

Copy-paste templates for **Supabase Dashboard → Authentication → Emails → Templates**.

Palette matches the transactional emails in `components/emails/` (maroon `#7f1d1d`, stone
`#f5f5f4` / `#e7e5e4`, ink `#1f2937`). Table-based layout with inline styles only — no external
CSS, no webfonts, no remote images, so Gmail / Outlook / Apple Mail all render the same.

---

## Before pasting: prerequisites

### 1. Custom SMTP (required in production)

Supabase's built-in email service only delivers to project members and is capped at a few
emails per hour. Any other recipient makes `resetPasswordForEmail()` fail with
`500 Error sending recovery email`, and repeat attempts return `429 email rate limit exceeded`.

Configure **Project Settings → Authentication → SMTP Settings** with Resend (already a project
dependency, domain already verified):

| Field       | Value                                     |
| ----------- | ----------------------------------------- |
| Host        | `smtp.resend.com`                         |
| Port        | `465`                                     |
| Username    | `resend`                                  |
| Password    | Resend API key (`RESEND_API_KEY`)         |
| Sender email| same address as `RESEND_FROM_EMAIL`       |
| Sender name  | `Thanka Treasure`                        |

Then raise **Authentication → Rate Limits → email sent per hour** above the default.

### 2. Redirect URL allowlist

**Authentication → URL Configuration:**

- Site URL: `https://thankatreasure.com`
- Redirect URLs: `https://thankatreasure.com/**`, plus `http://localhost:3000/**` for local dev

### 3. Link shape must be `token_hash`, not `{{ .ConfirmationURL }}`

`app/auth/reset-password/page.tsx` reads `token_hash` (or `token`) plus `type` from the query
string and calls `auth.verifyOtp(token, type)` itself. The default `{{ .ConfirmationURL }}`
routes through `/auth/v1/verify` and hands back a `code` / fragment instead, so the page sees no
token and silently re-renders the "request a reset" form. Every template below therefore builds
its own link from `{{ .TokenHash }}`.

### 4. `/auth/confirm` route (needed for signup, magic link, invite, email change)

Recovery works today. The other four types have no handler — `app/auth/callback/route.ts` just
redirects and never exchanges anything, so the user lands logged out. Add this route before
enabling those emails:

```ts
// app/auth/confirm/route.ts
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { auth } from "@/lib/auth";
import { monitor } from "@/lib/monitoring/logger";

const ALLOWED_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "email_change",
  "recovery",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/account";

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(new URL("/auth/login?error=Invalid+link", url.origin));
  }

  try {
    await auth.verifyOtp(tokenHash, type);
  } catch (error) {
    monitor.error("Email confirmation failed", error, { type });
    return NextResponse.redirect(
      new URL("/auth/login?error=Link+expired.+Please+try+again.", url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
```

`lib/auth/types.ts` currently types `verifyOtp` as `"email" | "recovery"` — widen it to
`EmailOtpType` for the above to typecheck.

---

## Template variables

| Variable               | Meaning                                        |
| ---------------------- | ---------------------------------------------- |
| `{{ .TokenHash }}`     | Hashed OTP — use in your own URL               |
| `{{ .Token }}`         | 6-digit code (reauthentication, or code-entry) |
| `{{ .SiteURL }}`       | Site URL from URL Configuration                |
| `{{ .Email }}`         | Current address                                |
| `{{ .NewEmail }}`      | Requested address (email change only)          |
| `{{ .ConfirmationURL }}` | Supabase-built link — **not used here**, see note 3 |

---

## 1. Reset Password

**Subject:** `Reset your Thanka Treasure password`

```html
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f4;margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;max-width:620px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <tr>
          <td style="color:#111827;font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:0 0 16px;">
            Thanka Treasure
          </td>
        </tr>
        <tr>
          <td style="color:#7f1d1d;font-size:24px;line-height:30px;padding:0 0 12px;">
            Reset your password
          </td>
        </tr>
        <tr>
          <td style="color:#1f2937;font-size:14px;line-height:20px;padding:0 0 8px;">
            We received a request to reset the password for <strong>{{ .Email }}</strong>.
            Choose a new password using the button below.
          </td>
        </tr>
        <tr>
          <td style="padding:16px 0 8px;">
            <a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery"
               style="background-color:#7f1d1d;border:1px solid #7f1d1d;color:#ffffff;display:inline-block;font-size:13px;font-weight:600;letter-spacing:0.08em;padding:12px 24px;text-decoration:none;text-transform:uppercase;">
              Set New Password
            </a>
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;line-height:19px;padding:8px 0 0;">
            This link expires in one hour and can be used once. If you did not request a reset,
            no action is needed — your current password still works.
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e7e5e4;color:#6b7280;font-size:12px;line-height:18px;padding:16px 0 0;margin:16px 0 0;">
            Button not working? Paste this into your browser:<br />
            <span style="color:#7f1d1d;word-break:break-all;">{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 2. Confirm Signup

**Subject:** `Confirm your Thanka Treasure account`

```html
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f4;margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;max-width:620px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <tr>
          <td style="color:#111827;font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:0 0 16px;">
            Thanka Treasure
          </td>
        </tr>
        <tr>
          <td style="color:#7f1d1d;font-size:24px;line-height:30px;padding:0 0 12px;">
            Confirm your email
          </td>
        </tr>
        <tr>
          <td style="color:#1f2937;font-size:14px;line-height:20px;padding:0 0 8px;">
            Welcome to Thanka Treasure. Confirm <strong>{{ .Email }}</strong> to activate your
            account and track your orders.
          </td>
        </tr>
        <tr>
          <td style="padding:16px 0 8px;">
            <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup&amp;next=/account"
               style="background-color:#7f1d1d;border:1px solid #7f1d1d;color:#ffffff;display:inline-block;font-size:13px;font-weight:600;letter-spacing:0.08em;padding:12px 24px;text-decoration:none;text-transform:uppercase;">
              Confirm Email
            </a>
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;line-height:19px;padding:8px 0 0;">
            This link expires in 24 hours. If you did not create an account, ignore this email.
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e7e5e4;color:#6b7280;font-size:12px;line-height:18px;padding:16px 0 0;">
            Button not working? Paste this into your browser:<br />
            <span style="color:#7f1d1d;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup&amp;next=/account</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 3. Magic Link

**Subject:** `Your Thanka Treasure sign-in link`

```html
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f4;margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;max-width:620px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <tr>
          <td style="color:#111827;font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:0 0 16px;">
            Thanka Treasure
          </td>
        </tr>
        <tr>
          <td style="color:#7f1d1d;font-size:24px;line-height:30px;padding:0 0 12px;">
            Sign in to your account
          </td>
        </tr>
        <tr>
          <td style="color:#1f2937;font-size:14px;line-height:20px;padding:0 0 8px;">
            Use the button below to sign in as <strong>{{ .Email }}</strong>. No password needed.
          </td>
        </tr>
        <tr>
          <td style="padding:16px 0 8px;">
            <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next=/account"
               style="background-color:#7f1d1d;border:1px solid #7f1d1d;color:#ffffff;display:inline-block;font-size:13px;font-weight:600;letter-spacing:0.08em;padding:12px 24px;text-decoration:none;text-transform:uppercase;">
              Sign In
            </a>
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;line-height:19px;padding:8px 0 0;">
            This link expires in one hour and works once. If you did not request it, ignore this
            email — nobody can access your account without it.
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e7e5e4;color:#6b7280;font-size:12px;line-height:18px;padding:16px 0 0;">
            Button not working? Paste this into your browser:<br />
            <span style="color:#7f1d1d;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next=/account</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 4. Invite User

**Subject:** `You have been invited to Thanka Treasure`

```html
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f4;margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;max-width:620px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <tr>
          <td style="color:#111827;font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:0 0 16px;">
            Thanka Treasure
          </td>
        </tr>
        <tr>
          <td style="color:#7f1d1d;font-size:24px;line-height:30px;padding:0 0 12px;">
            You have been invited
          </td>
        </tr>
        <tr>
          <td style="color:#1f2937;font-size:14px;line-height:20px;padding:0 0 8px;">
            <strong>{{ .Email }}</strong> has been invited to Thanka Treasure. Accept the
            invitation to set a password and finish creating your account.
          </td>
        </tr>
        <tr>
          <td style="padding:16px 0 8px;">
            <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/account"
               style="background-color:#7f1d1d;border:1px solid #7f1d1d;color:#ffffff;display:inline-block;font-size:13px;font-weight:600;letter-spacing:0.08em;padding:12px 24px;text-decoration:none;text-transform:uppercase;">
              Accept Invitation
            </a>
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;line-height:19px;padding:8px 0 0;">
            If you were not expecting this invitation, you can ignore this email.
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e7e5e4;color:#6b7280;font-size:12px;line-height:18px;padding:16px 0 0;">
            Button not working? Paste this into your browser:<br />
            <span style="color:#7f1d1d;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/account</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 5. Change Email Address

**Subject:** `Confirm your new Thanka Treasure email`

```html
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f4;margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;max-width:620px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <tr>
          <td style="color:#111827;font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:0 0 16px;">
            Thanka Treasure
          </td>
        </tr>
        <tr>
          <td style="color:#7f1d1d;font-size:24px;line-height:30px;padding:0 0 12px;">
            Confirm your email change
          </td>
        </tr>
        <tr>
          <td style="color:#1f2937;font-size:14px;line-height:20px;padding:0 0 8px;">
            You asked to change the email on your account from <strong>{{ .Email }}</strong> to
            <strong>{{ .NewEmail }}</strong>. Confirm to complete the change.
          </td>
        </tr>
        <tr>
          <td style="padding:16px 0 8px;">
            <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email_change&amp;next=/account"
               style="background-color:#7f1d1d;border:1px solid #7f1d1d;color:#ffffff;display:inline-block;font-size:13px;font-weight:600;letter-spacing:0.08em;padding:12px 24px;text-decoration:none;text-transform:uppercase;">
              Confirm Change
            </a>
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;line-height:19px;padding:8px 0 0;">
            Did not request this? Ignore this email and your address stays unchanged.
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e7e5e4;color:#6b7280;font-size:12px;line-height:18px;padding:16px 0 0;">
            Button not working? Paste this into your browser:<br />
            <span style="color:#7f1d1d;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email_change&amp;next=/account</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 6. Reauthentication

**Subject:** `Your Thanka Treasure verification code`

```html
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f4;margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;max-width:620px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <tr>
          <td style="color:#111827;font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:0 0 16px;">
            Thanka Treasure
          </td>
        </tr>
        <tr>
          <td style="color:#7f1d1d;font-size:24px;line-height:30px;padding:0 0 12px;">
            Verification code
          </td>
        </tr>
        <tr>
          <td style="color:#1f2937;font-size:14px;line-height:20px;padding:0 0 8px;">
            Enter this code to confirm the change on your account:
          </td>
        </tr>
        <tr>
          <td style="color:#111827;font-size:30px;font-weight:700;letter-spacing:0.24em;padding:12px 0;">
            {{ .Token }}
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;line-height:19px;padding:8px 0 0;">
            The code expires in one hour. Never share it with anyone — Thanka Treasure staff will
            never ask you for it.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## Verify after pasting

1. Request a reset for a non-member address on production.
2. Vercel logs should show no `Password reset request failed` line.
3. Supabase Dashboard → Logs → Auth Logs should show a `recovery` request with no `4xx`/`5xx`.
4. Click the emailed link — the page must show the "Set a new password" form, not the request
   form. If it shows the request form, the link lost `token_hash` or `type`.
