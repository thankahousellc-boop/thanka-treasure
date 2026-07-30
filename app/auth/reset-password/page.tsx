import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { monitor } from "@/lib/monitoring/logger";
import { getAbsoluteUrl } from "@/lib/seo";

type ResetPasswordSearchParams = {
  token_hash?: string | string[];
  token?: string | string[];
  type?: string | string[];
  error?: string | string[];
  message?: string | string[];
};

type ResetPasswordPageProps = {
  searchParams: Promise<ResetPasswordSearchParams>;
};

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function requestResetAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Please provide your account email.")}`,
    );
  }

  const redirectTo = getAbsoluteUrl("/auth/reset-password");
  let failed = false;

  try {
    await auth.resetPassword(email, redirectTo);
  } catch (error) {
    failed = true;
    monitor.error("Password reset request failed", error, {
      redirectTo,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
    });
  }

  if (failed) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Unable to send reset instructions right now.")}`,
    );
  }

  redirect(
    `/auth/reset-password?message=${encodeURIComponent("Password reset instructions have been sent if the account exists.")}`,
  );
}

async function applyResetAction(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!token || (type !== "recovery" && type !== "email")) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Reset link is invalid or expired.")}`,
    );
  }

  if (password.length < 8 || password !== confirmPassword) {
    redirect(
      `/auth/reset-password?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&error=${encodeURIComponent("Use matching passwords with at least 8 characters.")}`,
    );
  }

  let failed = false;

  try {
    await auth.verifyOtp(token, type);
    await auth.updatePassword(password);
  } catch (error) {
    failed = true;
    monitor.error("Password reset apply failed", error, {
      type,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
    });
  }

  if (failed) {
    redirect(
      `/auth/reset-password?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&error=${encodeURIComponent("Could not update your password. Please request a new reset link.")}`,
    );
  }

  redirect(
    `/auth/login?message=${encodeURIComponent("Password updated. Please sign in.")}`,
  );
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = readSingle(params.token_hash) ?? readSingle(params.token) ?? "";
  const type = readSingle(params.type) ?? "";
  const error = readSingle(params.error);
  const message = readSingle(params.message);
  const canApplyReset =
    token.length > 0 && (type === "recovery" || type === "email");

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        Reset Password
      </h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        {canApplyReset
          ? "Set a new password for your account."
          : "Request password reset instructions to your email."}
      </p>

      {canApplyReset ? (
        <form
          action={applyResetAction}
          className="mt-8 max-w-xl space-y-4 border border-border-light bg-white p-5"
        >
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="type" value={type} />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-warm-gray-700">
              New Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-warm-gray-700">
              Confirm Password
            </span>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              required
              className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-11 items-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
          >
            Update Password
          </button>
        </form>
      ) : (
        <form
          action={requestResetAction}
          className="mt-8 max-w-xl space-y-4 border border-border-light bg-white p-5"
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-warm-gray-700">
              Account Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-11 items-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
          >
            Send Reset Email
          </button>
        </form>
      )}

      {error ? (
        <p
          tabIndex={-1}
          autoFocus
          role="alert"
          aria-live="assertive"
          className="mt-4 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-sm text-maroon-700"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-5 text-sm text-maroon-700">
        <Link href="/auth/login">Back to login</Link>
      </div>
    </section>
  );
}
